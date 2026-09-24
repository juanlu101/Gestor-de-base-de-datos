/* =========================================================
   SGBD: motor de base de datos (SQLite en el navegador)
   Creada por Juan Luis Torralbo Muñoz
   ========================================================= */
(function () {
  'use strict';

  const STORE_KEY = 'sgbd.db';
  const NAME_KEY = 'sgbd.dbName';
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

  const DB = { SQL: null, db: null, name: 'Sin título', onChange: null, ready: false };

  /* ---------- Arranque del motor: primero local, luego CDN ---------- */
  DB.init = async function () {
    if (typeof initSqlJs !== 'function') throw new Error('No se encontró js/lib/sql-wasm.js');
    try {
      DB.SQL = await initSqlJs({ locateFile: (f) => 'js/lib/' + f });
    } catch (e) {
      // Al abrir index.html con doble clic (file://) el navegador bloquea el .wasm local
      DB.SQL = await initSqlJs({ locateFile: (f) => CDN + f });
    }
    DB.ready = true;
    const saved = U.storage.get(STORE_KEY, null);
    if (saved) {
      try {
        open(new DB.SQL.Database(U.b64ToU8(saved)), U.storage.get(NAME_KEY, 'Mi base de datos'));
        return 'restored';
      } catch (e) { /* si falla, empezamos de cero */ }
    }
    open(new DB.SQL.Database(), 'Nueva base de datos');
    return 'new';
  };

  function open(database, name) {
    DB.inTransaction = false;
    if (DB.db) { try { DB.db.close(); } catch (e) { /* nada */ } }
    DB.db = database;
    DB.name = name || 'Base de datos';
    try { DB.db.run('PRAGMA foreign_keys = ON;'); } catch (e) { /* nada */ }
    persist();
    if (DB.onChange) DB.onChange();
  }

  const persist = U.debounce(function () {
    if (!DB.db || DB.inTransaction) return;
    try {
      const data = DB.db.export();
      DB.db.run('PRAGMA foreign_keys = ON;');
      if (data.length < 3.5 * 1024 * 1024) {
        U.storage.set(STORE_KEY, U.u8ToB64(data));
        U.storage.set(NAME_KEY, DB.name);
      } else {
        U.storage.remove(STORE_KEY);
      }
    } catch (e) { /* almacenamiento lleno: no pasa nada */ }
  }, 600);
  DB.persist = persist;

  DB.newEmpty = function (name) { open(new DB.SQL.Database(), name || 'Nueva base de datos'); };

  DB.openBinary = function (buffer, name) {
    const u8 = new Uint8Array(buffer);
    const head = String.fromCharCode.apply(null, u8.subarray(0, 15));
    if (head !== 'SQLite format 3') throw new Error('El archivo no es una base de datos SQLite válida.');
    open(new DB.SQL.Database(u8), name);
  };

  /* Crea una BD nueva a partir de un script. Devuelve {errors, count, changes} */
  DB.openScript = function (sql, name, adaptMysql) {
    const fresh = new DB.SQL.Database();
    let text = sql, changes = [];
    if (adaptMysql && DB.looksLikeMysql(sql)) {
      const r = DB.mysqlToSqlite(sql);
      text = r.sql; changes = r.changes;
    }
    const stmts = DB.split(text);
    const errors = [];
    fresh.run('PRAGMA foreign_keys = OFF;');
    let count = 0;
    stmts.forEach((s, i) => {
      if (/^\s*PRAGMA\s+foreign_keys/i.test(s)) return;
      try { fresh.run(s); count++; } catch (e) {
        errors.push({ index: i + 1, sql: s, message: e.message });
      }
    });
    open(fresh, name);
    return { errors, count, total: stmts.length, changes };
  };

  /* ---------- Separar sentencias respetando comillas, comentarios y triggers ---------- */
  DB.split = function (sql) {
    const out = [];
    let cur = '', i = 0, n = sql.length;
    let inTrigger = false;
    while (i < n) {
      const c = sql[i], c2 = sql[i + 1];
      if (c === '-' && c2 === '-') {
        const j = sql.indexOf('\n', i); const end = j < 0 ? n : j;
        cur += sql.slice(i, end); i = end; continue;
      }
      if (c === '#' && (i === 0 || sql[i - 1] === '\n')) {
        const j = sql.indexOf('\n', i); const end = j < 0 ? n : j;
        i = end; continue;
      }
      if (c === '/' && c2 === '*') {
        const j = sql.indexOf('*/', i + 2); const end = j < 0 ? n : j + 2;
        cur += sql.slice(i, end); i = end; continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        let j = i + 1;
        while (j < n) {
          if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; }
          j++;
        }
        cur += sql.slice(i, j + 1); i = j + 1; continue;
      }
      if (c === '[') {
        const j = sql.indexOf(']', i); const end = j < 0 ? n : j + 1;
        cur += sql.slice(i, end); i = end; continue;
      }
      if (c === ';') {
        if (!inTrigger && /^\s*CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i.test(stripComments(cur))) inTrigger = true;
        if (inTrigger) {
          if (/\bEND\s*$/i.test(stripComments(cur))) {
            inTrigger = false;
          } else { cur += c; i++; continue; }
        }
        if (stripComments(cur).trim()) out.push(cur.trim());
        cur = ''; i++; continue;
      }
      cur += c; i++;
    }
    if (stripComments(cur).trim()) out.push(cur.trim());
    return out;
  };

  function stripComments(s) {
    return s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  }
  DB.stripComments = stripComments;

  /* ---------- Adaptar scripts de MySQL / phpMyAdmin a SQLite ---------- */
  DB.looksLikeMysql = function (sql) {
    return /ENGINE\s*=|AUTO_INCREMENT|`|\bUNSIGNED\b|LOCK TABLES|\/\*!\d+|DEFAULT CHARSET|\bENUM\s*\(|\bSET\s+(NAMES|FOREIGN_KEY_CHECKS|SQL_MODE|time_zone)/i.test(sql);
  };

  DB.mysqlToSqlite = function (sql) {
    const changes = new Set();
    // 1) comentarios condicionales /*!40101 ... */ y líneas con #
    let s = sql.replace(/current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP').replace(/\/\*![\s\S]*?\*\/\s*;?/g, () => { changes.add('Eliminados comentarios especiales de MySQL (/*! … */).'); return ''; });

    // 2) escapes con barra invertida dentro de cadenas: \' -> ''
    s = fixBackslashEscapes(s, changes);

    const stmts = DB.split(s);
    const out = [];
    stmts.forEach((st) => {
      const bare = stripComments(st).trim();
      if (/^(SET|LOCK\s+TABLES|UNLOCK\s+TABLES|USE|DELIMITER)\b/i.test(bare)) { changes.add('Eliminadas órdenes de configuración de MySQL (SET, LOCK TABLES, USE…).'); return; }
      if (/^(CREATE|DROP)\s+(DATABASE|SCHEMA)\b/i.test(bare)) { changes.add('Eliminadas órdenes CREATE/DROP DATABASE (en SQLite el archivo es la base de datos).'); return; }
      if (/^START\s+TRANSACTION/i.test(bare)) { out.push('BEGIN TRANSACTION'); return; }
      if (/^ALTER\s+TABLE/i.test(bare)) { out.push(...convertAlter(bare, changes)); return; }
      if (/^CREATE\s+TABLE/i.test(bare)) { out.push(convertCreate(bare, changes)); return; }
      if (/^CREATE\s+(DEFINER|PROCEDURE|FUNCTION|EVENT)|^CREATE\s+.*\bDEFINER\b/i.test(bare)) { changes.add('Omitidos procedimientos, funciones o vistas con DEFINER (no existen en SQLite).'); return; }
      if (/^INSERT\s+IGNORE/i.test(bare)) { out.push(bare.replace(/^INSERT\s+IGNORE/i, 'INSERT OR IGNORE')); changes.add('INSERT IGNORE convertido en INSERT OR IGNORE.'); return; }
      out.push(st);
    });
    return { sql: out.join(';\n') + (out.length ? ';' : ''), changes: Array.from(changes) };
  };

  function fixBackslashEscapes(s, changes) {
    let out = '', i = 0;
    const n = s.length;
    while (i < n) {
      const c = s[i];
      if (c === "'") {
        let j = i + 1, buf = "'";
        while (j < n) {
          const d = s[j];
          if (d === '\\' && j + 1 < n) {
            const e = s[j + 1];
            const map = { "'": "''", '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t', '0': '', Z: '' };
            buf += (e in map) ? map[e] : e;
            changes.add('Convertidas las comillas escapadas con \\ al formato de SQLite.');
            j += 2; continue;
          }
          if (d === "'") {
            if (s[j + 1] === "'") { buf += "''"; j += 2; continue; }
            break;
          }
          buf += d; j++;
        }
        out += buf + "'"; i = j + 1; continue;
      }
      if (c === '-' && s[i + 1] === '-') {
        const j = s.indexOf('\n', i); const end = j < 0 ? n : j;
        out += s.slice(i, end); i = end; continue;
      }
      out += c; i++;
    }
    return out;
  }

  function convertCreate(st, changes) {
    let s = st;
    // opciones de tabla tras el paréntesis final
    const close = s.lastIndexOf(')');
    if (close > 0 && /\S/.test(s.slice(close + 1))) {
      s = s.slice(0, close + 1);
      changes.add('Eliminadas opciones de tabla de MySQL (ENGINE, CHARSET, AUTO_INCREMENT…).');
    }
    const before = s;
    s = s.replace(/\bAUTO_INCREMENT\b/gi, '')
      .replace(/\bUNSIGNED\b/gi, '')
      .replace(/\bZEROFILL\b/gi, '')
      .replace(/\bCHARACTER\s+SET\s+\w+/gi, '')
      .replace(/\bCHARSET\s*=?\s*\w+/gi, '')
      .replace(/\bCOLLATE\s*=?\s*\w+/gi, '')
      .replace(/\bCOMMENT\s+'(?:[^']|'')*'/gi, '')
      .replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\))?/gi, '')
      .replace(/\bENUM\s*\((?:[^()']|'(?:[^']|'')*')*\)/gi, () => { changes.add('ENUM convertido en TEXT.'); return 'TEXT'; })
      .replace(/\bSET\s*\((?:[^()']|'(?:[^']|'')*')*\)/gi, 'TEXT')
      .replace(/\b(TINY|MEDIUM|LONG)TEXT\b/gi, 'TEXT')
      .replace(/\bUNIQUE\s+(KEY|INDEX)\s+`?\w+`?\s*\(/gi, 'UNIQUE (')
      .replace(/\bUNIQUE\s+(KEY|INDEX)\s*\(/gi, 'UNIQUE (')
      .replace(/\bCONSTRAINT\s+`?\w+`?\s+(?=(PRIMARY|FOREIGN|UNIQUE|CHECK))/gi, '');
    // eliminar definiciones de índices normales: KEY nombre (...), INDEX nombre (...), FULLTEXT
    s = s.replace(/,\s*(FULLTEXT\s+|SPATIAL\s+)?(KEY|INDEX)\s+`?[\w]+`?\s*\((?:[^()]|\([^()]*\))*\)(\s*USING\s+\w+)?/gi, () => { changes.add('Eliminados los índices KEY/INDEX dentro de CREATE TABLE.'); return ''; });
    s = s.replace(/(PRIMARY\s+KEY\s*\([^)]*\))\s*USING\s+\w+/gi, '$1');
    if (s !== before) changes.add('Adaptados tipos y modificadores de columna (AUTO_INCREMENT, UNSIGNED, COMMENT…).');
    return s;
  }

  /* ALTER TABLE de phpMyAdmin: ADD PRIMARY KEY, ADD KEY, MODIFY … AUTO_INCREMENT, ADD CONSTRAINT … */
  function convertAlter(st, changes) {
    const m = st.match(/^ALTER\s+TABLE\s+(`[^`]+`|"[^"]+"|\w+)\s+([\s\S]*)$/i);
    if (!m) return [st];
    const table = m[1].replace(/[`"]/g, '');
    const clauses = splitTopLevel(m[2]);
    const out = [];
    clauses.forEach((cl) => {
      const c = cl.trim();
      let mm;
      if ((mm = c.match(/^ADD\s+PRIMARY\s+KEY\s*\(([^)]*)\)/i))) {
        out.push(`CREATE UNIQUE INDEX IF NOT EXISTS "pk_${table}" ON "${table}" (${mm[1]})`);
        changes.add('ALTER TABLE … ADD PRIMARY KEY convertido en un índice único (SQLite no permite añadir la clave después).');
      } else if ((mm = c.match(/^ADD\s+UNIQUE\s+(?:KEY|INDEX)?\s*`?(\w*)`?\s*\(([^)]*)\)/i))) {
        out.push(`CREATE UNIQUE INDEX IF NOT EXISTS "${mm[1] || 'uq_' + table}_${table}" ON "${table}" (${mm[2]})`);
      } else if ((mm = c.match(/^ADD\s+(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]*)\)/i))) {
        out.push(`CREATE INDEX IF NOT EXISTS "${mm[1]}_${table}" ON "${table}" (${mm[2].replace(/\(\d+\)/g, '')})`);
      } else if (/^AUTO_INCREMENT\s*=/i.test(c)) {
        /* opción de tabla sin equivalente: se ignora */
      } else if (/^(MODIFY|CHANGE)\b/i.test(c)) {
        changes.add('Omitidos ALTER TABLE … MODIFY (usados por MySQL para AUTO_INCREMENT).');
      } else if (/^ADD\s+(CONSTRAINT|FOREIGN\s+KEY)/i.test(c)) {
        changes.add('Omitidas las claves ajenas añadidas con ALTER TABLE (SQLite no permite añadirlas después de crear la tabla).');
      } else if (/^ADD\s+(COLUMN\s+)?/i.test(c) || /^(RENAME|DROP)\b/i.test(c)) {
        out.push(`ALTER TABLE "${table}" ${c}`);
      } else {
        changes.add('Omitidas algunas órdenes ALTER TABLE no compatibles.');
      }
    });
    return out;
  }
  function splitTopLevel(s) {
    const parts = []; let depth = 0, cur = '', inS = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "'" ) inS = !inS;
      if (!inS) {
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      }
      cur += c;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }

  /* ---------- Ejecutar consultas ---------- */
  const MAX_ROWS = 2000;
  DB.execute = function (sql) {
    const stmts = DB.split(sql);
    const results = [];
    let modified = false;
    for (let i = 0; i < stmts.length; i++) {
      const text = stmts[i];
      const t0 = performance.now();
      let stmt;
      try {
        stmt = DB.db.prepare(text);
        const columns = stmt.getColumnNames();
        const rows = [];
        let total = 0;
        while (stmt.step()) {
          total++;
          if (rows.length < MAX_ROWS) rows.push(stmt.get());
        }
        const changed = DB.db.getRowsModified();
        const ms = performance.now() - t0;
        const isQuery = columns.length > 0;
        const verb = (stripComments(text).trim().split(/[\s(]+/)[0] || '').toUpperCase();
        if (verb === 'BEGIN' || verb === 'SAVEPOINT') DB.inTransaction = true;
        if (verb === 'COMMIT' || verb === 'END' || verb === 'ROLLBACK') DB.inTransaction = /^ROLLBACK\s+TO/i.test(stripComments(text).trim());
        if (!isQuery && verb !== 'SELECT') modified = true;
        results.push({ sql: text, columns, rows, total, truncated: total > rows.length, changed, ms, isQuery, verb });
      } catch (e) {
        results.push({ sql: text, error: e.message, friendly: friendlyError(e.message, text), ms: performance.now() - t0 });
        break;
      } finally {
        if (stmt) stmt.free();
      }
    }
    if (modified) { persist(); if (DB.onChange) DB.onChange(); }
    return { results, count: stmts.length };
  };

  /* Traducción de los errores más habituales */
  function friendlyError(msg, sql) {
    let m;
    if ((m = msg.match(/no such table: (\S+)/i))) return { text: `No existe la tabla «${m[1]}».`, hint: 'Revisa cómo está escrita en el panel de la izquierda, o créala antes con CREATE TABLE.' };
    if ((m = msg.match(/no such column: (\S+)/i))) return { text: `No existe la columna «${m[1]}».`, hint: 'Comprueba el nombre en la estructura de la tabla. Si usas varias tablas, escribe tabla.columna.' };
    if ((m = msg.match(/near "([^"]*)": syntax error/i))) return { text: `Error de sintaxis cerca de «${m[1]}».`, hint: 'Suele deberse a una coma de más o de menos, una palabra mal escrita o unas comillas sin cerrar.' };
    if (/incomplete input/i.test(msg)) return { text: 'La sentencia está incompleta.', hint: 'Falta algo al final: un paréntesis, unas comillas o parte de la orden.' };
    if ((m = msg.match(/UNIQUE constraint failed: (\S+)/i))) return { text: `Valor repetido en ${m[1]}.`, hint: 'Esa columna es clave primaria o UNIQUE, así que no puede repetirse.' };
    if (/FOREIGN KEY constraint failed/i.test(msg)) return { text: 'Se ha incumplido una clave ajena.', hint: 'Estás usando un valor que no existe en la tabla referenciada, o borrando una fila que otras tablas necesitan.' };
    if ((m = msg.match(/NOT NULL constraint failed: (\S+)/i))) return { text: `La columna ${m[1]} no puede quedar vacía.`, hint: 'Es obligatoria (NOT NULL): dale un valor en el INSERT.' };
    if ((m = msg.match(/table (\S+) already exists/i))) return { text: `La tabla ${m[1]} ya existe.`, hint: 'Usa CREATE TABLE IF NOT EXISTS o bórrala antes con DROP TABLE.' };
    if ((m = msg.match(/(\d+) values for (\d+) columns/i))) return { text: `Hay ${m[1]} valores para ${m[2]} columnas.`, hint: 'En un INSERT debe haber el mismo número de valores que de columnas.' };
    if (/ambiguous column name: (\S+)/i.test(msg)) { m = msg.match(/ambiguous column name: (\S+)/i); return { text: `La columna «${m[1]}» es ambigua.`, hint: 'Está en varias tablas de la consulta. Escribe tabla.columna para indicar cuál.' }; }
    if (/misuse of aggregate/i.test(msg)) return { text: 'Uso incorrecto de una función de agregado.', hint: 'Las condiciones sobre COUNT, SUM, AVG… van en HAVING, no en WHERE.' };
    if (/must appear in the GROUP BY|not an aggregate/i.test(msg)) return { text: 'Problema con GROUP BY.', hint: 'Las columnas del SELECT que no son agregados deben aparecer en GROUP BY.' };
    if (/datatype mismatch/i.test(msg)) return { text: 'Tipo de dato incorrecto.', hint: 'Una clave INTEGER PRIMARY KEY solo admite números enteros.' };
    return null;
  }

  /* ---------- Estructura de la BD ---------- */
  DB.schema = function () {
    if (!DB.db) return { tables: [], views: [] };
    const q = (s) => { const r = DB.db.exec(s); return r.length ? r[0].values : []; };
    const items = q("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name");
    const tables = [], views = [];
    items.forEach(([name, type]) => {
      const qn = '"' + name.replace(/"/g, '""') + '"';
      let cols = [], fks = [], count = null;
      try { cols = q(`PRAGMA table_info(${qn})`).map((r) => ({ name: r[1], type: r[2], notnull: !!r[3], pk: r[5] > 0 })); } catch (e) { /* nada */ }
      try { fks = q(`PRAGMA foreign_key_list(${qn})`).map((r) => ({ table: r[2], from: r[3], to: r[4] })); } catch (e) { /* nada */ }
      try { count = q(`SELECT COUNT(*) FROM ${qn}`)[0][0]; } catch (e) { /* nada */ }
      const obj = { name, cols, fks, count };
      (type === 'view' ? views : tables).push(obj);
    });
    return { tables, views };
  };

  /* ---------- Exportar como script SQL ---------- */
  DB.dump = function () {
    const L = ['-- Base de datos: ' + DB.name, '-- Exportada con SGBD (creada por Juan Luis Torralbo Muñoz) el ' + U.today(), '', 'PRAGMA foreign_keys = OFF;', 'BEGIN TRANSACTION;', ''];
    const rows = (s) => { const r = DB.db.exec(s); return r.length ? r[0].values : []; };
    const lit = (v) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (v instanceof Uint8Array) return "X'" + Array.from(v).map((b) => b.toString(16).padStart(2, '0')).join('') + "'";
      return "'" + String(v).replace(/'/g, "''") + "'";
    };
    rows("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid").forEach(([name, sql]) => {
      const qn = '"' + name.replace(/"/g, '""') + '"';
      L.push(sql + ';');
      const data = DB.db.exec(`SELECT * FROM ${qn}`);
      if (data.length) {
        const cols = data[0].columns.map((c) => '"' + c.replace(/"/g, '""') + '"').join(', ');
        data[0].values.forEach((r) => L.push(`INSERT INTO ${qn} (${cols}) VALUES (${r.map(lit).join(', ')});`));
      }
      L.push('');
    });
    rows("SELECT sql FROM sqlite_master WHERE type IN ('index','view','trigger') AND sql IS NOT NULL ORDER BY CASE type WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END").forEach(([sql]) => L.push(sql + ';'));
    L.push('', 'COMMIT;', 'PRAGMA foreign_keys = ON;', '');
    return L.join('\n');
  };

  DB.exportBinary = function () {
    const data = DB.db.export();
    DB.db.run('PRAGMA foreign_keys = ON;');
    return data;
  };

  window.DB = DB;
})();
