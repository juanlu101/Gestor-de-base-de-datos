/* =========================================================
   DatAula: paso del modelo E/R al modelo relacional
   Creada por Juan Luis Torralbo Muñoz
   Reglas (las habituales en Bachillerato):
   · Cada entidad fuerte -> una tabla con sus atributos.
   · Entidad débil -> tabla que incluye la clave de la entidad fuerte.
   · Relación 1:N -> la clave del lado "1" pasa como clave ajena al lado "N".
   · Relación 1:1 -> la clave pasa a la otra tabla (con UNIQUE).
   · Relación N:M o de grado 3 o más -> nueva tabla con las claves.
   · Atributo multivaluado -> nueva tabla.
   · Atributo compuesto -> se guardan sus partes.
   · Atributo derivado -> no se guarda (se calcula en las consultas).
   ========================================================= */
(function () {
  'use strict';
  const ident = U.sqlIdent;

  const RESERVED = new Set(('ABORT ACTION ADD ALL ALTER AND AS ASC BETWEEN BY CASE CHECK COLLATE COLUMN CONSTRAINT CREATE CROSS ' +
    'CURRENT_DATE CURRENT_TIME DEFAULT DELETE DESC DISTINCT DROP ELSE END ESCAPE EXCEPT EXISTS FOREIGN FROM FULL GROUP HAVING IN ' +
    'INDEX INNER INSERT INTERSECT INTO IS JOIN KEY LEFT LIKE LIMIT NATURAL NOT NULL OFFSET ON OR ORDER OUTER PRIMARY REFERENCES ' +
    'RIGHT SELECT SET TABLE THEN TO TRANSACTION UNION UNIQUE UPDATE USING VALUES VIEW WHEN WHERE WITH').split(' '));
  const q = (name) => (RESERVED.has(name.toUpperCase()) ? '"' + name + '"' : name);

  function transform(diagram) {
    const nodes = diagram.nodes || [];
    const byId = (id) => nodes.find((n) => n.id === id);
    const attrsOf = (id) => nodes.filter((n) => n.kind === 'attr' && n.owner === id);
    const entities = nodes.filter((n) => n.kind === 'entity');
    const rels = nodes.filter((n) => n.kind === 'rel');

    const tables = [];
    const tableOf = {};           // entityId -> tabla
    const warnings = [];
    const notes = [];
    const usedNames = new Set();

    function newTable(rawName, origin) {
      let name = ident(rawName);
      let base = name, i = 2;
      while (usedNames.has(name.toLowerCase())) name = base + '_' + i++;
      usedNames.add(name.toLowerCase());
      const t = { name, cols: [], pk: [], fks: [], uniques: [], origin };
      tables.push(t);
      return t;
    }
    function hasCol(t, name) { return t.cols.some((c) => c.name.toLowerCase() === name.toLowerCase()); }
    function addCol(t, rawName, type, notnull) {
      let name = ident(rawName), base = name, i = 2;
      while (hasCol(t, name)) name = base + '_' + i++;
      t.cols.push({ name, type: type || 'VARCHAR(50)', notnull: !!notnull });
      return name;
    }
    const colOf = (t, name) => t.cols.find((c) => c.name === name);

    /* Hojas de un atributo (los atributos compuestos se descomponen) */
    function leaves(attr) {
      const kids = attrsOf(attr.id).filter((k) => !k.derived);
      if (!kids.length) return [attr];
      let out = [];
      kids.forEach((k) => { out = out.concat(leaves(k)); });
      return out;
    }

    /* Añade los atributos simples de un propietario a una tabla. Devuelve {pk, multis} */
    function addOwnAttributes(t, ownerId, ownerName, opts) {
      const pk = [], multis = [];
      attrsOf(ownerId).forEach((a) => {
        if (a.derived) {
          notes.push(`«${a.name}» de ${ownerName} es derivado: no se guarda como columna, se calcula al hacer consultas.`);
          return;
        }
        if (a.multi && !(opts && opts.multiAsColumn)) { multis.push(a); return; }
        if (a.multi) warnings.push(`El atributo multivaluado «${a.name}» de la relación ${ownerName} se ha guardado como una columna normal.`);
        const isComposite = attrsOf(a.id).length > 0;
        leaves(a).forEach((leaf) => {
          const isKey = a.key || leaf.key || (a.partial || leaf.partial);
          const nm = addCol(t, leaf.name, leaf.dtype, isKey || leaf.required || a.required);
          if (isKey) pk.push(nm);
        });
        if (isComposite) notes.push(`«${a.name}» de ${ownerName} es compuesto: se guardan sus partes (${leaves(a).map((l) => l.name).join(', ')}).`);
      });
      return { pk, multis };
    }

    /* Añade a "t" una clave ajena que apunta a "ref". Devuelve los nombres de columna creados */
    function addFK(t, ref, o) {
      o = o || {};
      const cols = [];
      ref.pk.forEach((pkName) => {
        const refCol = colOf(ref, pkName);
        let want = pkName;
        if (o.role) want = pkName + '_' + ident(o.role).toLowerCase();
        if (hasCol(t, want)) want = pkName + '_' + ident(o.suffix || ref.name).toLowerCase();
        const nm = addCol(t, want, refCol ? refCol.type : 'INTEGER', o.notnull);
        cols.push(nm);
      });
      t.fks.push({ cols, ref: ref.name, refCols: ref.pk.slice(), onDelete: o.onDelete || null });
      if (o.unique) t.uniques.push(cols.slice());
      if (o.inPK) t.pk.push(...cols);
      return cols;
    }

    /* 1) Una tabla por entidad */
    const pendingMulti = [];
    entities.forEach((e) => {
      const t = newTable(e.name, `Entidad ${e.weak ? 'débil ' : ''}${e.name}`);
      tableOf[e.id] = t;
      const r = addOwnAttributes(t, e.id, e.name);
      t.pk.push(...r.pk);
      t._entity = e;
      r.multis.forEach((m) => pendingMulti.push({ owner: e, attr: m }));
    });

    /* 2) Entidades débiles: heredan la clave de la entidad fuerte */
    const consumedRels = new Set();
    const resolved = new Set();
    function resolveWeak(e, stack) {
      if (!e.weak || resolved.has(e.id)) return;
      if (stack.has(e.id)) { warnings.push(`Hay un ciclo de entidades débiles que incluye ${e.name}.`); return; }
      stack.add(e.id);
      const candidates = rels.filter((r) => (r.parts || []).some((p) => p.entity === e.id) && (r.parts || []).some((p) => p.entity !== e.id && byId(p.entity)));
      const rel = candidates.find((r) => r.identifying) || candidates[0];
      const t = tableOf[e.id];
      if (!rel) {
        warnings.push(`La entidad débil ${e.name} no está unida a ninguna entidad fuerte. Se ha tratado como una entidad normal.`);
      } else {
        const ownerPart = rel.parts.find((p) => p.entity !== e.id && byId(p.entity));
        const owner = byId(ownerPart.entity);
        resolveWeak(owner, stack);
        const ot = tableOf[owner.id];
        ensurePK(ot);
        const partial = t.pk.slice();
        t.pk = [];
        addFK(t, ot, { notnull: true, inPK: true, onDelete: 'CASCADE' });
        t.pk.push(...partial);
        if (!partial.length) warnings.push(`La entidad débil ${e.name} no tiene clave parcial (discriminante). Su clave es solo la de ${owner.name}, así que solo podrá haber una por cada ${owner.name}.`);
        const extra = addOwnAttributes(t, rel.id, rel.name, { multiAsColumn: true });
        t.pk.push(...extra.pk);
        consumedRels.add(rel.id);
        notes.push(`${e.name} es débil: su clave es la de ${owner.name} (${ot.pk.join(', ')})${partial.length ? ' más ' + partial.join(', ') : ''}. Se borra en cascada con ${owner.name}.`);
        if (!rel.identifying) notes.push(`Consejo: marca «${rel.name}» como relación de identificación para dibujarla con doble rombo.`);
      }
      resolved.add(e.id);
      stack.delete(e.id);
    }

    function ensurePK(t) {
      if (t.pk.length) return;
      const e = t._entity;
      const nm = addCol(t, 'id_' + t.name.toLowerCase(), 'INTEGER', true);
      // colocar la clave primero
      const c = t.cols.pop(); t.cols.unshift(c);
      t.pk.push(nm);
      warnings.push(`${e ? 'La entidad ' + e.name : 'La tabla ' + t.name} no tenía clave primaria. Se ha añadido «${nm}». Márcala tú en el diagrama si ya tiene un identificador.`);
    }

    entities.filter((e) => !e.weak).forEach((e) => ensurePK(tableOf[e.id]));
    entities.filter((e) => e.weak).forEach((e) => resolveWeak(e, new Set()));
    entities.forEach((e) => ensurePK(tableOf[e.id]));

    /* 3) Relaciones */
    rels.forEach((r) => {
      if (consumedRels.has(r.id)) return;
      const parts = (r.parts || []).filter((p) => byId(p.entity));
      if (parts.length < 2) {
        warnings.push(`La relación «${r.name}» necesita al menos dos participantes (pueden ser la misma entidad si es reflexiva). Se ha ignorado.`);
        return;
      }
      const card = parts.map((p) => (p.max === '1' ? '1' : 'N')).join(':');
      const sameEntity = parts.length === 2 && parts[0].entity === parts[1].entity;

      if (parts.length === 2 && !(parts[0].max === 'N' && parts[1].max === 'N')) {
        const [a, b] = parts;
        let src, dst, kind;
        if (a.max === '1' && b.max === 'N') { src = a; dst = b; kind = '1:N'; }
        else if (b.max === '1' && a.max === 'N') { src = b; dst = a; kind = '1:N'; }
        else {
          kind = '1:1';
          if (b.min === '1' && a.min === '0') { src = b; dst = a; } else { src = a; dst = b; }
        }
        const srcT = tableOf[src.entity], dstT = tableOf[dst.entity];
        const cols = addFK(dstT, srcT, {
          notnull: src.min === '1',
          unique: kind === '1:1',
          role: sameEntity ? (src.role || r.name) : (src.role || ''),
          suffix: r.name
        });
        const own = addOwnAttributes(dstT, r.id, r.name, { multiAsColumn: true });
        if (own.pk.length) warnings.push(`El atributo clave de la relación «${r.name}» solo tiene sentido en relaciones N:M. Se ha guardado como columna normal.`);
        const srcName = byId(src.entity).name, dstName = byId(dst.entity).name;
        notes.push(`«${r.name}» (${kind}${sameEntity ? ', reflexiva' : ''}): la clave de ${srcName} pasa a ${dstName} como ${cols.join(', ')}` +
          `${src.min === '1' ? ' (obligatoria)' : ' (puede ser NULL)'}${kind === '1:1' ? ' con UNIQUE' : ''}.`);
        return;
      }

      // N:M, o grado 3 o más: tabla nueva
      let tname = r.name;
      if (usedNames.has(ident(tname).toLowerCase())) tname = r.name + '_rel';
      const t = newTable(tname, `Relación ${r.name} (${card.replace(/^N:N$/, 'N:M')})`);
      const nParts = parts.filter((p) => p.max === 'N');
      const pkParts = nParts.length >= 2 || parts.length === 2 ? (nParts.length ? nParts : parts) : parts;
      const counts = {};
      parts.forEach((p) => { counts[p.entity] = (counts[p.entity] || 0) + 1; });
      const seen = {};
      parts.forEach((p) => {
        seen[p.entity] = (seen[p.entity] || 0) + 1;
        const dup = counts[p.entity] > 1;
        addFK(t, tableOf[p.entity], {
          notnull: true,
          inPK: pkParts.includes(p),
          role: p.role || (dup ? String(seen[p.entity]) : ''),
          onDelete: 'CASCADE'
        });
      });
      const own = addOwnAttributes(t, r.id, r.name, { multiAsColumn: true });
      t.pk.push(...own.pk);
      if (parts.length > 2) notes.push(`«${r.name}» es de grado ${parts.length}: se crea la tabla ${t.name} con las claves de todas las entidades. Revisa si la clave primaria elegida (${t.pk.join(', ')}) es la adecuada.`);
      else notes.push(`«${r.name}» es N:M: se crea la tabla ${t.name} cuya clave une las de ambas entidades${own.pk.length ? ' y ' + own.pk.join(', ') : ''}.`);
    });

    /* 4) Atributos multivaluados */
    pendingMulti.forEach(({ owner, attr }) => {
      const ot = tableOf[owner.id];
      const t = newTable(owner.name + '_' + attr.name, `Atributo multivaluado ${attr.name} de ${owner.name}`);
      addFK(t, ot, { notnull: true, inPK: true, onDelete: 'CASCADE' });
      leaves(attr).forEach((l) => { t.pk.push(addCol(t, l.name, l.dtype, true)); });
      notes.push(`«${attr.name}» de ${owner.name} es multivaluado: se guarda en la tabla ${t.name}, una fila por valor.`);
    });

    tables.forEach((t) => {
      t.pk = Array.from(new Set(t.pk));
      t.pk.forEach((p) => { const c = colOf(t, p); if (c) c.notnull = true; });
      delete t._entity;
    });

    return { tables: order(tables), warnings, notes };
  }

  /* Ordena las tablas para que las referenciadas se creen antes */
  function order(tables) {
    const byName = {};
    tables.forEach((t) => { byName[t.name] = t; });
    const out = [], done = new Set(), visiting = new Set();
    function visit(t) {
      if (done.has(t.name)) return;
      if (visiting.has(t.name)) return;
      visiting.add(t.name);
      t.fks.forEach((f) => { if (f.ref !== t.name && byName[f.ref]) visit(byName[f.ref]); });
      visiting.delete(t.name);
      done.add(t.name);
      out.push(t);
    }
    tables.forEach(visit);
    return out;
  }

  function toSQL(result, opts) {
    opts = opts || {};
    const L = [];
    L.push('-- Script generado con DatAula (creada por Juan Luis Torralbo Muñoz)');
    L.push('-- Fecha: ' + U.today());
    L.push('');
    L.push('PRAGMA foreign_keys = ON;');
    L.push('');
    if (opts.drop && result.tables.length) {
      result.tables.slice().reverse().forEach((t) => L.push(`DROP TABLE IF EXISTS ${q(t.name)};`));
      L.push('');
    }
    result.tables.forEach((t) => {
      L.push(`-- ${t.origin}`);
      L.push(`CREATE TABLE ${q(t.name)} (`);
      const defs = t.cols.map((c) => `  ${q(c.name)} ${c.type}${c.notnull ? ' NOT NULL' : ''}`);
      if (t.pk.length) defs.push(`  PRIMARY KEY (${t.pk.map(q).join(', ')})`);
      t.uniques.forEach((u) => defs.push(`  UNIQUE (${u.map(q).join(', ')})`));
      t.fks.forEach((f) => defs.push(`  FOREIGN KEY (${f.cols.map(q).join(', ')}) REFERENCES ${q(f.ref)} (${f.refCols.map(q).join(', ')})` +
        (f.onDelete ? ` ON DELETE ${f.onDelete}` : '')));
      L.push(defs.join(',\n'));
      L.push(');');
      L.push('');
    });
    return L.join('\n');
  }

  function toSchemaHTML(result) {
    const esc = U.esc;
    if (!result.tables.length) {
      return '<div class="empty-state">El diagrama no tiene entidades. Dibuja al menos una en la pestaña <strong>Diagrama E/R</strong>.</div>';
    }
    return result.tables.map((t) => {
      const fkCols = new Set();
      t.fks.forEach((f) => f.cols.forEach((c) => fkCols.add(c)));
      const cols = t.cols.map((c) => {
        const cls = [t.pk.includes(c.name) ? 'c-pk' : '', fkCols.has(c.name) ? 'c-fk' : ''].filter(Boolean).join(' ');
        return `<span class="${cls}">${esc(c.name)}</span>`;
      }).join(', ');
      const fks = t.fks.map((f) => `<li>${esc(f.cols.join(', '))} → ${esc(f.ref)}(${esc(f.refCols.join(', '))})${f.onDelete ? ', borrado en cascada' : ''}</li>`).join('');
      const uq = t.uniques.map((u) => `<li>${esc(u.join(', '))} es único (UNIQUE)</li>`).join('');
      return `<div class="rel-table"><div><span class="t-name">${esc(t.name.toUpperCase())}</span> <span class="t-cols">(${cols})</span></div>` +
        (fks || uq ? `<ul class="t-fks">${fks}${uq}</ul>` : '') +
        `<div class="t-origin">Procede de: ${esc(t.origin)}</div></div>`;
    }).join('');
  }

  window.ERTransform = { transform, toSQL, toSchemaHTML };
})();
