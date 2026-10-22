/* =========================================================
   SGBD: aplicación principal
   Creada por Juan Luis Torralbo Muñoz
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, esc, toast } = U;

  /* ---------------- Tema ---------------- */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    if (window.ER && ER.render) try { ER.render(); } catch (e) { /* aún no iniciado */ }
  }
  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(U.prefs.get('sgbd.theme', ''));
  $('#themeToggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    U.prefs.set('sgbd.theme', next);
    applyTheme(next);
    toast(next === 'dark' ? 'Modo pizarra activado' : 'Modo cuaderno activado');
  });

  /* Empezar de cero: borra todo el trabajo de esta pestaña */
  $('#resetAll').addEventListener('click', () => {
    if (!confirm('Se borrarán el diagrama, la base de datos, lo escrito en el editor SQL y el historial.\n\nSi quieres conservar algo, descárgalo antes desde los menús Archivo y Exportar.\n\n¿Empezar de cero?')) return;
    U.storage.clearAll();
    location.reload();
  });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ER.render) ER.render(); });

  /* ---------------- Pestañas ---------------- */
  function showView(name) {
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === name)));
    $$('.view').forEach((v) => { const on = v.id === 'view-' + name; v.hidden = !on; v.classList.toggle('active', on); });
    U.storage.set('sgbd.tab', name);
    if (name === 'er') requestAnimationFrame(() => { ER.render(); if (!ER._fitted) { ER.fit(); ER._fitted = true; } });
    if (name === 'sql') renderSchema();
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('.tab');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); showView(n.dataset.view);
  });

  // Cerrar menús desplegables al hacer clic fuera
  document.addEventListener('click', (e) => {
    $$('details.menu[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  });
  $$('details.menu .menu-list button').forEach((b) => b.addEventListener('click', () => { const d = b.closest('details'); if (d) d.open = false; }));

  /* ---------------- Diagrama E/R ---------------- */
  EXAMPLES.er.forEach((ex) => {
    const o = document.createElement('option');
    o.value = ex.id; o.textContent = ex.name;
    $('#erExamples').appendChild(o);
  });
  $('#erExamples').addEventListener('change', (e) => {
    const ex = EXAMPLES.er.find((x) => x.id === e.target.value);
    e.target.value = '';
    if (!ex) return;
    if (ER.diagram.nodes.length && !confirm('Se sustituirá el diagrama actual por el ejemplo «' + ex.name + '». ¿Continuar?')) return;
    ER.setDiagram(ex.diagram);
    toast('Ejemplo abierto: ' + ex.name, 'ok');
  });
  ER.init();

  /* ---------------- Gestor SQL ---------------- */
  const SQL_DRAFT = 'sgbd.sqlDraft';
  const sqlEditor = CodeEditor.create($('#sqlEditorHost'), {
    label: 'Editor de consultas SQL',
    placeholder: 'Escribe aquí tu consulta, por ejemplo: SELECT * FROM alumnos;',
    onRun: () => runSql(false),
    onRunSelection: () => runSql(true),
    onInput: U.debounce((v) => U.storage.set(SQL_DRAFT, v), 400)
  });
  sqlEditor.value = U.storage.get(SQL_DRAFT, '');

  let history = [];
  try { history = JSON.parse(U.storage.get('sgbd.history', '[]')) || []; } catch (e) { history = []; }
  function renderHistory() {
    const sel = $('#sqlHistory');
    sel.innerHTML = '<option value="">Historial…</option>' + history.map((h, i) => `<option value="${i}">${esc(h.replace(/\s+/g, ' ').slice(0, 70))}</option>`).join('');
  }
  renderHistory();
  $('#sqlHistory').addEventListener('change', (e) => {
    const i = e.target.value;
    if (i !== '') { sqlEditor.value = history[+i]; sqlEditor.focus(); }
    e.target.value = '';
  });

  function runSql(selectionOnly) {
    if (!DB.ready) { toast('El motor SQL todavía se está cargando.'); return; }
    const text = selectionOnly ? sqlEditor.selection() : sqlEditor.value;
    if (!DB.stripComments(text).trim()) { toast(selectionOnly ? 'Selecciona primero el texto que quieres ejecutar.' : 'El editor está vacío.'); return; }
    const r = DB.execute(text);
    renderResults(r.results);
    const t = text.trim();
    history = [t].concat(history.filter((h) => h !== t)).slice(0, 30);
    U.storage.set('sgbd.history', JSON.stringify(history));
    renderHistory();
  }
  $('#sqlRun').addEventListener('click', () => runSql(false));
  $('#sqlRunSel').addEventListener('click', () => runSql(true));
  $('#sqlClear').addEventListener('click', () => { sqlEditor.value = ''; U.storage.set(SQL_DRAFT, ''); sqlEditor.focus(); });

  /* Resultados */
  const lastResults = [];
  function renderResults(results) {
    const box = $('#sqlResults');
    lastResults.length = 0;
    if (!results.length) { box.innerHTML = ''; return; }
    let html = '';
    const okStmts = results.filter((r) => !r.error && !r.isQuery);
    const collapse = okStmts.length > 5;
    if (collapse) {
      const byVerb = {};
      okStmts.forEach((r) => { byVerb[r.verb] = (byVerb[r.verb] || 0) + 1; });
      const summary = Object.keys(byVerb).map((v) => `${byVerb[v]} ${v}`).join(', ');
      html += `<div class="res ok"><div class="res-msg">Se han ejecutado correctamente ${okStmts.length} sentencias (${esc(summary)}).</div></div>`;
    }
    results.forEach((r, i) => {
      if (r.error) {
        const f = r.friendly;
        html += `<div class="res error"><div class="res-head"><code>${esc(oneLine(r.sql))}</code><span class="res-meta">Sentencia ${i + 1} de ${results.length}</span></div>
          <div class="res-msg"><strong>Error:</strong> ${esc(f ? f.text : r.error)}${f ? `<span class="hint">${esc(f.hint)}</span><span class="hint">Mensaje original: <code>${esc(r.error)}</code></span>` : ''}</div></div>`;
        return;
      }
      if (!r.isQuery) {
        if (collapse) return;
        html += `<div class="res ok"><div class="res-head"><code>${esc(oneLine(r.sql))}</code><span class="res-meta">${fmtMs(r.ms)}</span></div><div class="res-msg">${esc(okMessage(r))}</div></div>`;
        return;
      }
      const idx = lastResults.push(r) - 1;
      const head = `<div class="res-head"><code>${esc(oneLine(r.sql))}</code><span class="res-meta">${r.total} ${r.total === 1 ? 'fila' : 'filas'}, ${fmtMs(r.ms)}</span>${r.rows.length ? `<button class="btn" data-csv="${idx}">Descargar CSV</button>` : ''}</div>`;
      if (!r.rows.length) {
        html += `<div class="res">${head}<div class="res-msg">La consulta no ha devuelto ninguna fila. Revisa las condiciones del WHERE.</div></div>`;
        return;
      }
      let t = '<div class="table-wrap"><table class="data"><thead><tr><th class="rn">#</th>' + r.columns.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
      r.rows.forEach((row, k) => {
        t += `<tr><td class="rn">${k + 1}</td>` + row.map((v) => {
          if (v === null) return '<td class="null">NULL</td>';
          if (typeof v === 'number') return `<td class="num">${esc(String(v))}</td>`;
          if (v instanceof Uint8Array) return `<td class="null">[binario, ${v.length} bytes]</td>`;
          return `<td title="${esc(v)}">${esc(v)}</td>`;
        }).join('') + '</tr>';
      });
      t += '</tbody></table></div>';
      const foot = r.truncated ? `<div class="res-foot">Se muestran las primeras ${r.rows.length} filas de ${r.total}. Usa LIMIT o WHERE para acotar.</div>` : '';
      html += `<div class="res">${head}${t}${foot}</div>`;
    });
    box.innerHTML = html;
    box.scrollTop = 0;
  }
  function oneLine(s) { const t = DB.stripComments(s).replace(/\s+/g, ' ').trim(); return t.length > 110 ? t.slice(0, 110) + '…' : t; }
  function fmtMs(ms) { return ms < 1 ? '<1 ms' : Math.round(ms) + ' ms'; }
  function okMessage(r) {
    const n = r.changed;
    const pl = (x, s, p) => x + ' ' + (x === 1 ? s : p);
    switch (r.verb) {
      case 'INSERT': case 'REPLACE': return `Hecho: ${pl(n, 'fila insertada', 'filas insertadas')}.`;
      case 'UPDATE': return `Hecho: ${pl(n, 'fila modificada', 'filas modificadas')}.`;
      case 'DELETE': return `Hecho: ${pl(n, 'fila borrada', 'filas borradas')}.`;
      case 'CREATE': return 'Creado correctamente.';
      case 'DROP': return 'Eliminado correctamente.';
      case 'ALTER': return 'Tabla modificada correctamente.';
      case 'BEGIN': return 'Transacción iniciada. Termina con COMMIT (guardar) o ROLLBACK (deshacer).';
      case 'COMMIT': case 'END': return 'Transacción confirmada.';
      case 'ROLLBACK': return 'Cambios deshechos.';
      default: return 'Sentencia ejecutada correctamente.';
    }
  }
  $('#sqlResults').addEventListener('click', (e) => {
    const b = e.target.closest('[data-csv]');
    if (!b) return;
    const r = lastResults[+b.dataset.csv];
    const cell = (v) => {
      if (v === null) return '';
      const s = String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '\ufeff' + [r.columns.map(cell).join(';')].concat(r.rows.map((row) => row.map(cell).join(';'))).join('\r\n');
    U.download('resultado.csv', csv, 'text/csv;charset=utf-8');
  });

  function showWelcome() {
    $('#sqlResults').innerHTML = `<div class="results-empty"><h3>Aquí aparecerán los resultados</h3>
      <p>Escribe una sentencia en el editor y pulsa <strong>Ejecutar</strong> o Ctrl + Intro. Algunas ideas para empezar:</p>
      <ul><li>Pulsa el nombre de una tabla a la izquierda para ver su contenido.</li>
      <li>Abre la <strong>Chuleta SQL</strong> y pulsa <em>Probar</em> en cualquier ejemplo.</li>
      <li>Crea tus propias tablas con <code>CREATE TABLE</code> a partir de tu diagrama.</li></ul></div>`;
  }

  /* Estructura */
  const openTables = new Set();
  function renderSchema() {
    const tree = $('#schemaTree');
    $('#dbName').textContent = DB.name || 'Base de datos';
    $('#dbName').title = DB.name || '';
    if (!DB.ready) { tree.innerHTML = '<div class="s-empty">Cargando motor SQL…</div>'; return; }
    const s = DB.schema();
    if (!s.tables.length && !s.views.length) {
      tree.innerHTML = `<div class="s-empty">La base de datos está vacía. Crea tablas con CREATE TABLE o carga un ejemplo.<br><button class="btn primary" id="loadInstituto">Cargar ejemplo Instituto</button></div>`;
      $('#loadInstituto').addEventListener('click', () => loadExample('instituto', true));
      return;
    }
    const block = (items, label, isView) => {
      if (!items.length) return '';
      return `<div class="schema-group">${label} (${items.length})</div>` + items.map((t) => {
        const fkMap = {};
        t.fks.forEach((f) => { fkMap[f.from] = f.table + '.' + f.to; });
        const cols = t.cols.map((c) => `<li data-col="${esc(c.name)}" title="${esc((c.pk ? 'Clave primaria. ' : '') + (fkMap[c.name] ? 'Clave ajena hacia ' + fkMap[c.name] + '. ' : '') + (c.notnull ? 'Obligatoria.' : ''))}">
          <span class="ck${fkMap[c.name] && !c.pk ? ' fk' : ''}">${c.pk ? 'PK' : fkMap[c.name] ? 'FK' : ''}</span>${esc(c.name)}<span class="ct">${esc(c.type || '')}</span></li>`).join('');
        return `<details class="s-table" data-table="${esc(t.name)}"${openTables.has(t.name) ? ' open' : ''}><summary>
          <span class="s-name">${esc(t.name)}</span><span class="s-count" title="Número de filas">${t.count == null ? '' : t.count}</span>
          <button class="s-peek" data-peek="${esc(t.name)}" title="Ver el contenido">ver</button></summary>
          <ul class="s-cols">${cols}</ul></details>`;
      }).join('');
    };
    tree.innerHTML = block(s.tables, 'Tablas') + block(s.views, 'Vistas', true);
  }
  $('#schemaTree').addEventListener('click', (e) => {
    const peek = e.target.closest('[data-peek]');
    if (peek) {
      e.preventDefault();
      const name = peek.dataset.peek;
      sqlEditor.value = `SELECT *\nFROM ${/^[A-Za-z_]\w*$/.test(name) ? name : '"' + name + '"'}\nLIMIT 100;`;
      runSql(false);
      return;
    }
    const col = e.target.closest('[data-col]');
    if (col) { sqlEditor.insert(col.dataset.col); }
  });
  $('#schemaTree').addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.table) return;
    if (d.open) openTables.add(d.dataset.table); else openTables.delete(d.dataset.table);
  }, true);
  $('#dbRefresh').addEventListener('click', renderSchema);
  DB.onChange = renderSchema;

  /* Ejemplos y archivos */
  EXAMPLES.db.forEach((ex) => {
    const o = document.createElement('option');
    o.value = ex.id; o.textContent = ex.name; o.title = ex.desc;
    $('#dbExamples').appendChild(o);
  });
  function hasData() { try { return DB.schema().tables.length > 0; } catch (e) { return false; } }
  function loadExample(id, silentConfirm) {
    const ex = EXAMPLES.db.find((x) => x.id === id);
    if (!ex || !DB.ready) return false;
    if (!silentConfirm && hasData() && !confirm(`Se cargará la base de datos «${ex.name}» y se cerrará la actual. Si tiene cambios que quieras conservar, expórtala antes.\n\n¿Continuar?`)) return false;
    const r = DB.openScript(ex.sql, ex.name, false);
    renderSchema();
    if (r.errors.length) toast('El ejemplo se cargó con errores.', 'err');
    else toast(`Base de datos «${ex.name}» cargada`, 'ok');
    return true;
  }
  $('#dbExamples').addEventListener('change', (e) => {
    const id = e.target.value; e.target.value = '';
    if (id && loadExample(id)) {
      const first = DB.schema().tables[0];
      if (first) { sqlEditor.value = `SELECT *\nFROM ${first.name};`; }
      showWelcome();
    }
  });
  $('#dbNew').addEventListener('click', () => {
    if (hasData() && !confirm('¿Crear una base de datos nueva y vacía? La actual se cerrará.')) return;
    DB.newEmpty('Nueva base de datos');
    renderSchema(); showWelcome();
    toast('Base de datos vacía creada', 'ok');
  });
  $('#dbOpenSql').addEventListener('click', async () => {
    const f = await U.pickFile('fileSql');
    if (!f) return;
    if (!DB.ready) { toast('El motor SQL todavía se está cargando.'); return; }
    try {
      const text = await U.readFile(f);
      const r = DB.openScript(text, f.name.replace(/\.[^.]+$/, ''), $('#dbMysql').checked);
      renderSchema();
      let html = `<div class="res ${r.errors.length ? 'error' : 'ok'}"><div class="res-msg">Script «${esc(f.name)}» cargado: ${r.count} de ${r.total} sentencias ejecutadas correctamente.</div></div>`;
      if (r.changes.length) html += `<div class="res"><div class="res-msg"><strong>Adaptaciones de MySQL a SQLite:</strong><ul>${r.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></div>`;
      r.errors.slice(0, 10).forEach((er) => {
        html += `<div class="res error"><div class="res-head"><code>${esc(oneLine(er.sql))}</code><span class="res-meta">Sentencia ${er.index}</span></div><div class="res-msg"><strong>Error:</strong> ${esc(er.message)}</div></div>`;
      });
      if (r.errors.length > 10) html += `<div class="res error"><div class="res-msg">…y ${r.errors.length - 10} errores más.</div></div>`;
      $('#sqlResults').innerHTML = html;
      toast(r.errors.length ? `Cargado con ${r.errors.length} errores` : 'Script cargado', r.errors.length ? 'err' : 'ok');
    } catch (err) {
      toast('No se pudo leer el archivo: ' + err.message, 'err');
    }
  });
  $('#dbOpenDb').addEventListener('click', async () => {
    const f = await U.pickFile('fileDb');
    if (!f) return;
    if (!DB.ready) { toast('El motor SQL todavía se está cargando.'); return; }
    try {
      DB.openBinary(await U.readFile(f, true), f.name.replace(/\.[^.]+$/, ''));
      renderSchema(); showWelcome();
      toast('Base de datos abierta: ' + f.name, 'ok');
    } catch (err) {
      toast(err.message, 'err');
    }
  });
  const fileBase = () => U.sqlIdent(DB.name || 'base_de_datos').toLowerCase();
  $('#dbExportSql').addEventListener('click', () => {
    if (!DB.ready) return;
    U.download(fileBase() + '.sql', DB.dump(), 'application/sql');
  });
  $('#dbExportDb').addEventListener('click', () => {
    if (!DB.ready) return;
    if (DB.inTransaction) { toast('Termina antes la transacción con COMMIT o ROLLBACK.'); return; }
    U.download(fileBase() + '.db', new Blob([DB.exportBinary()], { type: 'application/x-sqlite3' }));
  });

  /* ---------------- Chuleta y ayuda ---------------- */
  Cheat.renderCheat((sql) => {
    const need = !DB.schema().tables.some((t) => t.name === 'alumnos') || !DB.schema().tables.some((t) => t.name === 'matriculas');
    if (need) {
      if (!confirm('Este ejemplo usa la base de datos Instituto. ¿Cargarla ahora? (Se cerrará la base de datos actual)')) return;
      loadExample('instituto', true);
    }
    sqlEditor.value = sql;
    showView('sql');
    runSql(false);
  });
  Cheat.renderHelp();

  /* ---------------- Arranque ---------------- */
  const status = $('#engineStatus');
  showWelcome();
  renderSchema();
  DB.init().then((how) => {
    status.textContent = 'Motor SQL listo (SQLite)';
    status.classList.add('ready');
    renderSchema();
  }).catch((err) => {
    console.error(err);
    status.textContent = 'No se pudo cargar el motor SQL';
    status.classList.add('fail');
    toast('No se pudo cargar el motor SQL. Si abriste el archivo con doble clic, necesitas conexión a Internet o publicarla en GitHub Pages.', 'err', 10000);
  });

  const savedTab = U.storage.get('sgbd.tab', 'er');
  showView(document.querySelector('.tab[data-view="' + savedTab + '"]') ? savedTab : 'er');
})();
