/* =========================================================
   SGBD: paso a tablas. El alumno crea a mano las tablas del modelo relacional
   y ve un diagrama con flechas desde cada clave ajena hasta su clave primaria.
   Creada por Juan Luis Torralbo Muñoz
   ========================================================= */
(function () {
  'use strict';
  const { esc, uid, toast } = U;

  const FONT = '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif';
  const MONO = '"JetBrains Mono", Consolas, "Courier New", monospace';
  const STORE_KEY = 'sgbd.tables';
  const TYPES = ['INTEGER', 'DECIMAL(4,2)', 'DECIMAL(10,2)', 'VARCHAR(9)', 'VARCHAR(15)', 'VARCHAR(50)', 'VARCHAR(100)', 'DATE', 'TIME'];
  const HEAD = 34, ROW = 27, PADX = 12, BADGE = 40;

  const TB = {
    model: { version: 1, kind: 'sgbd-tablas', tables: [] },
    sel: null,          // { t: idTabla, c: idColumna | null, fk: true si está seleccionada la flecha }
    view: { tx: 0, ty: 0, s: 1 },
    undoStack: [],
    redoStack: []
  };
  let svg, world, props, wrap, emptyMsg, zoomLabel;

  /* ---------------- Medidas ---------------- */
  const ctx = document.createElement('canvas').getContext('2d');
  function tw(text, size, bold, mono) {
    ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + (mono ? MONO : FONT);
    return ctx.measureText(text || ' ').width;
  }
  function size(t) {
    let w = tw(t.name, 15, true) + 2 * PADX + 10;
    t.cols.forEach((c) => {
      w = Math.max(w, BADGE + (c.pk && c.fk ? 25 : 0) + tw(c.name, 14, c.pk) + 18 + tw(c.type || '¿tipo?', 12.5, false, true) + PADX + 8);
    });
    return { w: Math.max(170, Math.ceil(w)), h: HEAD + Math.max(1, t.cols.length) * ROW };
  }

  /* ---------------- Modelo ---------------- */
  const tables = () => TB.model.tables;
  const tableById = (id) => tables().find((t) => t.id === id);
  const colById = (t, id) => t && t.cols.find((c) => c.id === id);
  const pkCols = (t) => t.cols.filter((c) => c.pk);
  const normType = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
  function fkTarget(c) {
    if (!c.fk) return null;
    const t = tableById(c.fk.table);
    const k = colById(t, c.fk.col);
    return t && k ? { t, k } : null;
  }
  function typeMismatch(c) {
    const tg = fkTarget(c);
    return !!(tg && c.type && tg.k.type && normType(c.type) !== normType(tg.k.type));
  }
  /* Quita las claves ajenas que apuntan a columnas que ya no existen o que han dejado de ser clave primaria */
  function cleanFks() {
    let n = 0;
    tables().forEach((t) => t.cols.forEach((c) => {
      if (!c.fk) return;
      const tg = fkTarget(c);
      if (!tg || !tg.k.pk) { c.fk = null; n++; }
    }));
    return n;
  }

  /* ---------------- Historial ---------------- */
  const snapshot = () => JSON.stringify(TB.model);
  const persist = U.debounce(() => U.storage.set(STORE_KEY, snapshot()), 250);
  function commit() {
    const s = snapshot();
    if (TB.undoStack[TB.undoStack.length - 1] === s) return;
    TB.undoStack.push(s);
    if (TB.undoStack.length > 80) TB.undoStack.shift();
    TB.redoStack = [];
    persist(); updateUndo();
  }
  function restore(s) {
    TB.model = JSON.parse(s);
    if (TB.sel && !tableById(TB.sel.t)) TB.sel = null;
    persist(); render(); renderProps(); updateUndo();
  }
  function undo() { if (TB.undoStack.length < 2) return; TB.redoStack.push(TB.undoStack.pop()); restore(TB.undoStack[TB.undoStack.length - 1]); }
  function redo() { if (!TB.redoStack.length) return; const s = TB.redoStack.pop(); TB.undoStack.push(s); restore(s); }
  function updateUndo() {
    const u = document.getElementById('tbUndo'), r = document.getElementById('tbRedo');
    if (u) u.disabled = TB.undoStack.length < 2;
    if (r) r.disabled = !TB.redoStack.length;
  }

  /* ---------------- Colores ---------------- */
  function screenPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    return {
      fill: v('--er-fill', '#fff'), stroke: v('--er-stroke', '#1B2A4A'), text: v('--er-text', '#1B2A4A'),
      link: v('--er-label', '#3558A8'), muted: v('--muted', '#6A7890'), hl: v('--hl', '#FFE45C'), hlInk: v('--hl-ink', '#2B2400'),
      zebra: v('--surface-2', '#EEF2F7'), err: v('--err', '#BF3A34'), halo: v('--paper', '#F6F8FB')
    };
  }
  const PRINT = { fill: '#FFFFFF', stroke: '#1B2A4A', text: '#1B2A4A', link: '#3558A8', muted: '#6A7890', hl: '#FFE45C', hlInk: '#2B2400', zebra: '#F2F5F9', err: '#BF3A34', halo: '#FFFFFF' };

  /* ---------------- Geometría de las flechas ---------------- */
  function rowY(t, i) { return t.y + HEAD + i * ROW + ROW / 2; }
  function linkGeometry(t, c) {
    const tg = fkTarget(c);
    if (!tg) return null;
    const a = size(t), b = size(tg.t);
    const i = t.cols.indexOf(c), j = tg.t.cols.indexOf(tg.k);
    const y0 = rowY(t, i), y3 = rowY(tg.t, j);
    let x0, x3, d0, d3;
    const ca = t.x + a.w / 2, cb = tg.t.x + b.w / 2;
    const apart = t.x + a.w + 40 < tg.t.x || tg.t.x + b.w + 40 < t.x;
    if (t === tg.t || !apart) {
      // misma tabla o tablas una encima de otra: la flecha sale y entra por la derecha
      x0 = t.x + a.w; x3 = tg.t.x + b.w; d0 = 1; d3 = 1;
    } else if (cb > ca) { x0 = t.x + a.w; d0 = 1; x3 = tg.t.x; d3 = -1; }
    else { x0 = t.x; d0 = -1; x3 = tg.t.x + b.w; d3 = 1; }
    const k = t === tg.t ? 46 + Math.abs(y3 - y0) * 0.15 : Math.max(46, Math.abs(x3 - x0) * 0.45);
    let k0 = k, k3 = k;
    if (d0 === d3 && t !== tg.t) { const over = Math.abs(x3 - x0); if (x3 > x0) k0 += over; else k3 += over; }
    const P0 = { x: x0, y: y0 }, C1 = { x: x0 + d0 * k0, y: y0 }, C2 = { x: x3 + d3 * k3, y: y3 }, P3 = { x: x3, y: y3 };
    return { P0, C1, C2, P3, d3 };
  }
  function arrowHead(G, color) {
    // la punta mira hacia la clave primaria
    const dx = -G.d3, len = 11, half = 5.5;
    const tip = G.P3, bx = tip.x - dx * len;
    return `<polygon points="${tip.x},${tip.y} ${bx},${tip.y - half} ${bx},${tip.y + half}" fill="${color}"/>`;
  }

  /* ---------------- Dibujo ---------------- */
  function buildMarkup(P, forExport) {
    let links = '', shapes = '';
    tables().forEach((t) => t.cols.forEach((c) => {
      const G = linkGeometry(t, c);
      if (!G) return;
      const bad = typeMismatch(c);
      const isSel = !forExport && TB.sel && TB.sel.t === t.id && TB.sel.c === c.id;
      const color = bad ? P.err : P.link;
      const d = `M ${G.P0.x} ${G.P0.y} C ${G.C1.x} ${G.C1.y} ${G.C2.x} ${G.C2.y} ${G.P3.x} ${G.P3.y}`;
      if (isSel) links += `<path d="${d}" fill="none" stroke="${P.hl}" stroke-width="9" stroke-linecap="round" opacity=".9"/>`;
      links += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${isSel ? 2.6 : 2}"${bad ? ' stroke-dasharray="7 4"' : ''}/>`;
      links += `<circle cx="${G.P0.x}" cy="${G.P0.y}" r="3.6" fill="${color}"/>` + arrowHead(G, color);
      if (!forExport) links += `<path class="tb-link-hit" data-t="${t.id}" data-c="${c.id}" d="${d}" fill="none" stroke="transparent" stroke-width="14"/>`;
    }));

    tables().forEach((t) => {
      const { w, h } = size(t);
      const selT = !forExport && TB.sel && TB.sel.t === t.id;
      let g = `<g class="tb-table" data-t="${t.id}" transform="translate(${t.x},${t.y})">`;
      if (selT) g += `<rect x="-6" y="-6" width="${w + 12}" height="${h + 12}" rx="7" fill="${P.hl}" opacity=".85"/>`;
      g += `<rect width="${w}" height="${h}" rx="4" fill="${P.fill}" stroke="${P.stroke}" stroke-width="2"/>`;
      g += `<path d="M0 4 a4 4 0 0 1 4 -4 h${w - 8} a4 4 0 0 1 4 4 v${HEAD - 4} h${-w} z" fill="${P.stroke}"/>`;
      g += `<text x="${w / 2}" y="22" text-anchor="middle" font-family='${FONT}' font-size="15" font-weight="700" fill="${P.fill}">${esc(t.name)}</text>`;
      if (!t.cols.length) {
        g += `<text x="${w / 2}" y="${HEAD + 18}" text-anchor="middle" font-family='${FONT}' font-size="13" font-style="italic" fill="${P.muted}">sin columnas</text>`;
      }
      t.cols.forEach((c, i) => {
        const y = HEAD + i * ROW;
        const selC = !forExport && TB.sel && TB.sel.t === t.id && TB.sel.c === c.id && !TB.sel.fk;
        let r = `<g class="tb-row" data-t="${t.id}" data-c="${c.id}" transform="translate(0,${y})">`;
        r += `<rect x="1" width="${w - 2}" height="${ROW}" fill="${selC ? P.hl : (i % 2 ? P.zebra : P.fill)}"${selC ? ' opacity=".7"' : ''}/>`;
        if (i) r += `<line x1="1" x2="${w - 1}" y1="0" y2="0" stroke="${P.zebra}" stroke-width="1"/>`;
        // marcas PK / FK
        // PK: etiqueta amarilla. FK: etiqueta azul. Si es las dos cosas, van una al lado de la otra.
        const both = c.pk && c.fk;
        if (c.pk) r += `<rect x="8" y="6" width="22" height="15" rx="3" fill="${P.hl}" stroke="${P.stroke}" stroke-width=".8"/><text x="19" y="17.5" text-anchor="middle" font-family='${FONT}' font-size="9.5" font-weight="700" fill="${P.hlInk}">PK</text>`;
        if (c.fk) {
          const fx = both ? 33 : 8;
          r += `<rect x="${fx}" y="6" width="22" height="15" rx="3" fill="none" stroke="${P.link}" stroke-width="1.2"/><text x="${fx + 11}" y="17.5" text-anchor="middle" font-family='${FONT}' font-size="9.5" font-weight="700" fill="${P.link}">FK</text>`;
        }
        const nx = BADGE + (both ? 25 : 0);
        r += `<text x="${nx}" y="18.5" font-family='${FONT}' font-size="14" ${c.pk ? 'font-weight="700"' : ''} ${c.fk ? 'font-style="italic"' : ''} fill="${c.fk ? P.link : P.text}">${esc(c.name)}</text>`;
        if (c.pk) { const nw = tw(c.name, 14, true); r += `<line x1="${nx}" x2="${nx + nw}" y1="21.5" y2="21.5" stroke="${P.text}" stroke-width="1.3"/>`; }
        r += `<text x="${w - PADX}" y="18" text-anchor="end" font-family='${MONO}' font-size="12.5" ${c.type ? '' : 'font-style="italic"'} fill="${typeMismatch(c) ? P.err : P.muted}">${esc(c.type || '¿tipo?')}</text>`;
        if (!forExport) {
          r += `<circle class="tb-handle" data-t="${t.id}" data-c="${c.id}" cx="${w}" cy="${ROW / 2}" r="6" fill="${P.fill}" stroke="${P.link}" stroke-width="1.8"/>`;
        }
        r += '</g>';
        g += r;
      });
      g += '</g>';
      shapes += g;
    });
    return `<g class="tb-links">${links}</g><g class="tb-shapes">${shapes}</g><g class="tb-temp" pointer-events="none"></g>`;
  }

  function render() {
    if (!svg) return;
    world.setAttribute('transform', `translate(${TB.view.tx},${TB.view.ty}) scale(${TB.view.s})`);
    const big = 100 * TB.view.s, small = 20 * TB.view.s;
    svg.style.backgroundSize = `${big}px ${big}px, ${big}px ${big}px, ${small}px ${small}px, ${small}px ${small}px`;
    svg.style.backgroundPosition = `${TB.view.tx}px ${TB.view.ty}px`;
    world.innerHTML = buildMarkup(screenPalette(), false);
    emptyMsg.hidden = tables().length > 0;
    zoomLabel.textContent = Math.round(TB.view.s * 100) + '%';
  }

  /* ---------------- Vista ---------------- */
  function toWorld(cx, cy) {
    const r = svg.getBoundingClientRect();
    return { x: (cx - r.left - TB.view.tx) / TB.view.s, y: (cy - r.top - TB.view.ty) / TB.view.s };
  }
  function zoomAt(f, cx, cy) {
    const r = svg.getBoundingClientRect();
    const px = cx == null ? r.width / 2 : cx - r.left, py = cy == null ? r.height / 2 : cy - r.top;
    const s0 = TB.view.s, s1 = Math.min(3, Math.max(0.2, s0 * f));
    TB.view.tx = px - (px - TB.view.tx) * (s1 / s0);
    TB.view.ty = py - (py - TB.view.ty) * (s1 / s0);
    TB.view.s = s1; render();
  }
  function bbox() {
    if (!tables().length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    tables().forEach((t) => {
      const { w, h } = size(t);
      x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x + w); y1 = Math.max(y1, t.y + h);
    });
    // las flechas que salen por la derecha necesitan algo de sitio
    tables().forEach((t) => t.cols.forEach((c) => {
      const G = linkGeometry(t, c);
      if (G) { x1 = Math.max(x1, G.C1.x * 0.75 + G.P0.x * 0.25, G.C2.x * 0.75 + G.P3.x * 0.25); x0 = Math.min(x0, G.C1.x * 0.75 + G.P0.x * 0.25, G.C2.x * 0.75 + G.P3.x * 0.25); }
    }));
    return { x0: x0 - 30, y0: y0 - 30, x1: x1 + 30, y1: y1 + 30 };
  }
  function fit() {
    const b = bbox(), r = svg.getBoundingClientRect();
    if (!b || !r.width) { TB.view = { tx: 40, ty: 40, s: 1 }; render(); return; }
    const s = Math.min(1.3, Math.max(0.2, Math.min(r.width / (b.x1 - b.x0), r.height / (b.y1 - b.y0)) * 0.95));
    TB.view.s = s;
    TB.view.tx = r.width / 2 - ((b.x0 + b.x1) / 2) * s;
    TB.view.ty = r.height / 2 - ((b.y0 + b.y1) / 2) * s;
    render();
  }

  /* ---------------- Operaciones ---------------- */
  function cleanName(raw) {
    return U.sqlIdent(raw);
  }
  function uniqueTableName(base) {
    const used = new Set(tables().map((t) => t.name.toLowerCase()));
    if (!used.has(base)) return base;
    let i = 2; while (used.has(base + i)) i++; return base + i;
  }
  function uniqueColName(t, base) {
    const used = new Set(t.cols.map((c) => c.name.toLowerCase()));
    if (!used.has(base.toLowerCase())) return base;
    let i = 2; while (used.has((base + i).toLowerCase())) i++; return base + i;
  }
  function freeSpot(w, h) {
    // a la derecha de lo que se ve, buscando un hueco sin tablas
    const r = svg.getBoundingClientRect();
    const c = toWorld(r.left + Math.min(r.width, 900) * 0.15, r.top + r.height * 0.15);
    const boxes = tables().map((t) => { const s = size(t); return { x0: t.x - 40, y0: t.y - 40, x1: t.x + s.w + 40, y1: t.y + s.h + 40 }; });
    const free = (x, y) => boxes.every((b) => x + w < b.x0 || x > b.x1 || y + h < b.y0 || y > b.y1);
    // tres tablas por fila, para que el conjunto quepa bien en pantalla
    for (let row = 0; row < 20; row++) for (let col = 0; col < 3; col++) {
      const x = Math.round(c.x + col * 290), y = Math.round(c.y + row * 230);
      if (free(x, y)) return { x, y };
    }
    return { x: Math.round(c.x), y: Math.round(c.y) };
  }
  function addTable() {
    const name = uniqueTableName('tabla');
    const t = { id: uid('t'), name, x: 0, y: 0, cols: [] };
    const p = freeSpot(190, HEAD + ROW * 3);
    t.x = p.x; t.y = p.y;
    tables().push(t);
    TB.sel = { t: t.id, c: null };
    commit(); render(); renderProps();
    const i = document.getElementById('tbName'); if (i) { i.focus(); i.select(); }
    return t;
  }
  function addColumn(t, name, extra) {
    const c = Object.assign({ id: uid('c'), name: uniqueColName(t, cleanName(name || 'columna')), type: '', pk: false, fk: null }, extra || {});
    t.cols.push(c);
    return c;
  }
  /* Copia la clave primaria de otra tabla como clave ajena (paso de las relaciones 1:N y N:M) */
  function passPk(t, src) {
    const pks = pkCols(src);
    if (!pks.length) { toast(`La tabla ${src.name} todavía no tiene clave primaria.`); return []; }
    return pks.map((k) => {
      let name = k.name;
      if (t.cols.some((c) => c.name.toLowerCase() === name.toLowerCase())) name = k.name + '_' + src.name.replace(/s$/i, '');
      return addColumn(t, name, { type: k.type || '', fk: { table: src.id, col: k.id } });
    });
  }
  function removeTable(id) {
    TB.model.tables = tables().filter((t) => t.id !== id);
    const lost = cleanFks();
    if (TB.sel && TB.sel.t === id) TB.sel = null;
    return lost;
  }
  function deleteSelection() {
    if (!TB.sel) return;
    const t = tableById(TB.sel.t);
    if (!t) return;
    if (TB.sel.c && TB.sel.fk) {
      const c = colById(t, TB.sel.c);
      if (c) { c.fk = null; toast(`${t.name}.${c.name} ya no es clave ajena.`); }
      TB.sel = { t: t.id, c: TB.sel.c };
    } else {
      const lost = removeTable(t.id);
      toast(`Tabla ${t.name} eliminada` + (lost ? `. Se han quitado ${lost} claves ajenas que apuntaban a ella.` : '.'));
    }
    commit(); render(); renderProps();
  }
  function select(sel) {
    TB.sel = sel;
    render(); renderProps();
  }

  /* ---------------- SQL ---------------- */
  function createSql(t) {
    if (!t.cols.length) return `-- La tabla ${t.name} todavía no tiene columnas.`;
    const pks = pkCols(t);
    const lines = t.cols.map((c) => {
      let l = `  ${c.name}${c.type ? ' ' + c.type : ''}`;
      if (c.pk && pks.length === 1) l += ' PRIMARY KEY';
      if (c.pk && pks.length > 1) l += ' NOT NULL';
      return l;
    });
    if (pks.length > 1) lines.push(`  PRIMARY KEY (${pks.map((c) => c.name).join(', ')})`);
    // claves ajenas: las columnas que apuntan juntas a la clave primaria completa de otra tabla van en una sola FOREIGN KEY
    const groups = new Map();
    t.cols.forEach((c) => { const tg = fkTarget(c); if (tg) { if (!groups.has(tg.t.id)) groups.set(tg.t.id, []); groups.get(tg.t.id).push({ c, tg }); } });
    groups.forEach((list) => {
      const target = list[0].tg.t, tpk = pkCols(target);
      const covers = list.length > 1 && list.length === tpk.length && tpk.every((k) => list.some((x) => x.tg.k === k));
      if (covers) {
        const ordered = tpk.map((k) => list.find((x) => x.tg.k === k));
        lines.push(`  FOREIGN KEY (${ordered.map((x) => x.c.name).join(', ')}) REFERENCES ${target.name} (${tpk.map((k) => k.name).join(', ')})`);
      } else {
        list.forEach((x) => lines.push(`  FOREIGN KEY (${x.c.name}) REFERENCES ${target.name} (${x.tg.k.name})`));
      }
    });
    return `CREATE TABLE ${t.name} (\n${lines.join(',\n')}\n);`;
  }
  function orderedTables() {
    // primero las tablas a las que apuntan las demás
    const out = [], done = new Set(), list = tables().slice();
    let guard = 0;
    while (out.length < list.length && guard++ < 500) {
      let progress = false;
      list.forEach((t) => {
        if (done.has(t.id)) return;
        const deps = new Set();
        t.cols.forEach((c) => { const tg = fkTarget(c); if (tg && tg.t !== t) deps.add(tg.t.id); });
        if ([...deps].every((d) => done.has(d))) { out.push(t); done.add(t.id); progress = true; }
      });
      if (!progress) { list.forEach((t) => { if (!done.has(t.id)) { out.push(t); done.add(t.id); } }); }
    }
    return out;
  }
  function scriptSql() {
    const ts = orderedTables();
    return '-- Tablas creadas en la pestaña «Paso a tablas» de SGBD\n-- Están ordenadas para que cada tabla se cree después de las tablas a las que apunta.\n\n' +
      ts.map(createSql).join('\n\n') + '\n';
  }
  function sendToSql() {
    if (!tables().length) { toast('Todavía no hay tablas.'); return; }
    if (window.App && App.openInSql) App.openInSql(scriptSql());
  }

  /* ---------------- Panel lateral ---------------- */
  function fkOptions(c) {
    let h = '<option value="">No es clave ajena</option>';
    tables().forEach((t) => pkCols(t).forEach((k) => {
      if (k === c) return;
      const v = t.id + '|' + k.id;
      const on = c.fk && c.fk.table === t.id && c.fk.col === k.id;
      h += `<option value="${v}"${on ? ' selected' : ''}>${esc(t.name)}.${esc(k.name)}</option>`;
    }));
    return h;
  }
  function renderProps() {
    if (!props) return;
    const t = TB.sel && tableById(TB.sel.t);
    if (!t) { props.innerHTML = emptyPropsHtml(); wireEmpty(); return; }
    const others = tables().filter((o) => o !== t && pkCols(o).length);
    let h = `<h3>${esc(t.name)}</h3><p class="kind">Tabla, ${t.cols.length} ${t.cols.length === 1 ? 'columna' : 'columnas'}</p>
      <label class="field"><span>Nombre de la tabla</span><input type="text" id="tbName" value="${esc(t.name)}" autocomplete="off" spellcheck="false"></label>
      <div class="props-section"><h4>Columnas</h4>`;
    if (!t.cols.length) h += '<p class="props-help">Todavía no tiene columnas. Añade una abajo.</p>';
    t.cols.forEach((c, i) => {
      const focus = TB.sel.c === c.id;
      const tg = fkTarget(c);
      h += `<div class="tb-col${focus ? ' focus' : ''}" data-c="${c.id}">
        <div class="tb-col-row">
          <input class="input grow" data-f="name" type="text" value="${esc(c.name)}" aria-label="Nombre de la columna" autocomplete="off" spellcheck="false">
          <button class="btn icon small" data-f="up" title="Subir" aria-label="Subir"${i ? '' : ' disabled'}>↑</button>
          <button class="btn icon small" data-f="down" title="Bajar" aria-label="Bajar"${i < t.cols.length - 1 ? '' : ' disabled'}>↓</button>
          <button class="btn icon small danger-ghost" data-f="del" title="Eliminar columna" aria-label="Eliminar columna">×</button>
        </div>
        <div class="tb-col-row">
          <input class="input type" data-f="type" type="text" list="tbTypes" value="${esc(c.type || '')}" placeholder="tipo de dato" aria-label="Tipo de dato" autocomplete="off" spellcheck="false">
          <label class="tb-pk"><input type="checkbox" data-f="pk"${c.pk ? ' checked' : ''}> Clave primaria</label>
        </div>
        <div class="tb-col-row"><span class="tb-fk-label">Apunta a</span><select class="input grow" data-f="fk" aria-label="Clave ajena: columna a la que apunta">${fkOptions(c)}</select></div>
        ${typeMismatch(c) ? `<p class="tb-warn">El tipo no coincide con el de ${esc(tg.t.name)}.${esc(tg.k.name)} (${esc(tg.k.type)}). Una clave ajena debe tener el mismo tipo que la clave primaria a la que apunta.</p>` : ''}
      </div>`;
    });
    h += `<div class="inline-row"><input class="input" id="tbNewCol" type="text" placeholder="Nueva columna, p. ej. nombre" aria-label="Nombre de la nueva columna" autocomplete="off" spellcheck="false"><button class="btn primary" id="tbAddCol">Añadir</button></div></div>
      <div class="props-section"><h4>Pasar una clave primaria</h4>
        <p class="props-help">Copia aquí la clave primaria de otra tabla como clave ajena. Es lo que se hace en las relaciones 1:N (en la tabla del lado N) y en las N:M (en la tabla nueva).</p>
        ${others.length ? `<div class="inline-row"><select class="input" id="tbPassFrom">${others.map((o) => `<option value="${o.id}">${esc(o.name)} (${pkCols(o).map((k) => esc(k.name)).join(', ')})</option>`).join('')}</select><button class="btn primary" id="tbPass">Pasar</button></div>`
        : '<p class="props-help"><em>Antes tiene que haber otra tabla con clave primaria.</em></p>'}
      </div>
      <div class="props-section"><h4>Código SQL de esta tabla</h4><pre class="tb-sql">${hlSql(createSql(t))}</pre>
        <button class="btn go" id="tbToSql2">Llevar todas las tablas a Base de datos SQL</button></div>
      <div class="props-section"><button class="btn danger-ghost" id="tbDelTable">Eliminar tabla</button></div>`;
    props.innerHTML = h;
    wireProps(t);
  }
  function hlSql(s) {
    return esc(s)
      .replace(/(--[^\n]*)/g, '<span class="tk-com">$1</span>')
      .replace(/\b(CREATE TABLE|PRIMARY KEY|FOREIGN KEY|REFERENCES|NOT NULL|INTEGER|DECIMAL|VARCHAR|DATE|TIME)\b/g, '<span class="tk-kw">$1</span>');
  }
  function emptyPropsHtml() {
    return `<div class="props-empty"><h3>Cómo pasar a tablas</h3>
      <ol>
        <li>Pulsa <strong>Tabla</strong> para crear una tabla por cada entidad y añádele sus columnas. Marca la <strong>clave primaria</strong>.</li>
        <li>Relación <strong>1:N</strong>: en la tabla del lado N, pulsa <strong>Pasar</strong> para copiar la clave primaria del lado 1 como clave ajena.</li>
        <li>Relación <strong>N:M</strong>: crea una tabla nueva, pasa las dos claves primarias y márcalas juntas como clave primaria.</li>
        <li>También puedes arrastrar el punto azul de una columna hasta la clave primaria de otra tabla: esa columna pasa a ser clave ajena.</li>
        <li>Cuando termines, pulsa <strong>Llevar a SQL</strong> para crear las tablas en la base de datos.</li>
      </ol>
      <div class="legend tb-legend" aria-label="Leyenda">
        <svg viewBox="0 0 54 30"><rect x="14" y="7" width="26" height="16" rx="3" fill="var(--hl)" stroke="var(--er-stroke)" stroke-width=".8"/><text x="27" y="19" text-anchor="middle" font-size="10" font-weight="700" fill="var(--hl-ink)">PK</text></svg><span>Clave primaria (subrayada)</span>
        <svg viewBox="0 0 54 30"><rect x="14" y="7" width="26" height="16" rx="3" fill="none" stroke="var(--er-label)" stroke-width="1.2"/><text x="27" y="19" text-anchor="middle" font-size="10" font-weight="700" fill="var(--er-label)">FK</text></svg><span>Clave ajena (en cursiva)</span>
        <svg viewBox="0 0 54 30"><circle cx="6" cy="15" r="3.5" fill="var(--er-label)"/><path d="M6 15 H40" stroke="var(--er-label)" stroke-width="2"/><polygon points="50,15 39,9.5 39,20.5" fill="var(--er-label)"/></svg><span>Flecha de la clave ajena a la clave primaria a la que apunta</span>
        <svg viewBox="0 0 54 30"><path d="M6 15 H40" stroke="var(--err)" stroke-width="2" stroke-dasharray="7 4"/><polygon points="50,15 39,9.5 39,20.5" fill="var(--err)"/></svg><span>Clave ajena con un tipo de dato distinto</span>
      </div>
      ${tables().length ? '<div class="props-section"><button class="btn go" id="tbToSql2">Llevar todas las tablas a Base de datos SQL</button></div>' : ''}</div>`;
  }
  function wireEmpty() {
    const b = document.getElementById('tbToSql2');
    if (b) b.addEventListener('click', sendToSql);
  }

  function rename(t, c, raw, input) {
    const prev = c ? c.name : t.name;
    const v = cleanName(raw);
    if (!String(raw).trim()) { input.value = prev; return false; }
    const clash = c ? t.cols.some((o) => o !== c && o.name.toLowerCase() === v.toLowerCase())
      : tables().some((o) => o !== t && o.name.toLowerCase() === v.toLowerCase());
    if (clash) {
      toast(c ? `La tabla ${t.name} ya tiene una columna llamada ${v}.` : `Ya hay una tabla llamada ${v}.`, 'err');
      input.value = prev; if (c) c.name = prev; else t.name = prev;
      render(); return false;
    }
    if (v !== String(raw).trim()) toast(`Los nombres no pueden llevar espacios, tildes ni símbolos: se queda «${v}».`);
    if (c) c.name = v; else t.name = v;
    input.value = v;
    return true;
  }

  function wireProps(t) {
    const $ = (id) => document.getElementById(id);
    const nm = $('tbName');
    nm.addEventListener('input', () => { t.name = nm.value; render(); const h3 = props.querySelector('h3'); if (h3) h3.textContent = nm.value; });
    nm.addEventListener('change', () => { rename(t, null, nm.value, nm); commit(); render(); renderProps(); });
    nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') nm.blur(); });

    props.querySelectorAll('.tb-col').forEach((box) => {
      const c = colById(t, box.dataset.c);
      if (!c) return;
      box.addEventListener('focusin', () => {
        if (TB.sel.c !== c.id) { TB.sel = { t: t.id, c: c.id }; render(); props.querySelectorAll('.tb-col').forEach((b) => b.classList.toggle('focus', b === box)); }
      });
      box.querySelectorAll('[data-f]').forEach((el) => {
        const f = el.dataset.f;
        if (f === 'name') {
          el.addEventListener('input', () => { c.name = el.value; render(); });
          el.addEventListener('change', () => { rename(t, c, el.value, el); commit(); render(); renderProps(); });
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
        } else if (f === 'type') {
          el.addEventListener('input', () => { c.type = el.value.toUpperCase().trim(); render(); });
          el.addEventListener('change', () => { c.type = el.value.toUpperCase().replace(/\s+/g, ''); commit(); render(); renderProps(); });
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
        } else if (f === 'pk') {
          el.addEventListener('change', () => {
            c.pk = el.checked;
            const lost = cleanFks();
            if (lost) toast(`Se han quitado ${lost} claves ajenas que apuntaban a ${t.name}.${c.name}, porque ya no es clave primaria.`);
            commit(); render(); renderProps();
          });
        } else if (f === 'fk') {
          el.addEventListener('change', () => {
            if (!el.value) c.fk = null;
            else { const [tt, cc] = el.value.split('|'); c.fk = { table: tt, col: cc }; }
            commit(); render(); renderProps();
          });
        } else if (f === 'up' || f === 'down') {
          el.addEventListener('click', () => {
            const i = t.cols.indexOf(c), j = f === 'up' ? i - 1 : i + 1;
            if (j < 0 || j >= t.cols.length) return;
            t.cols.splice(i, 1); t.cols.splice(j, 0, c);
            TB.sel = { t: t.id, c: c.id };
            commit(); render(); renderProps();
          });
        } else if (f === 'del') {
          el.addEventListener('click', () => {
            t.cols = t.cols.filter((x) => x !== c);
            const lost = cleanFks();
            TB.sel = { t: t.id, c: null };
            toast(`Columna ${c.name} eliminada` + (lost ? `. Se han quitado ${lost} claves ajenas que apuntaban a ella.` : '.'));
            commit(); render(); renderProps();
          });
        }
      });
    });

    const nc = $('tbNewCol'), add = $('tbAddCol');
    const doAdd = () => {
      const raw = nc.value.trim();
      const c = addColumn(t, raw || 'columna');
      if (raw && c.name !== raw) toast(`Los nombres no pueden llevar espacios, tildes ni símbolos: se queda «${c.name}».`);
      if (!t.cols.some((x) => x.pk) && t.cols.length === 1) c.pk = true;   // la primera columna suele ser la clave
      TB.sel = { t: t.id, c: c.id };
      commit(); render(); renderProps();
      const again = $('tbNewCol'); if (again) again.focus();
    };
    add.addEventListener('click', doAdd);
    nc.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });

    const pass = $('tbPass');
    if (pass) pass.addEventListener('click', () => {
      const src = tableById($('tbPassFrom').value);
      if (!src) return;
      const made = passPk(t, src);
      if (!made.length) return;
      TB.sel = { t: t.id, c: made[made.length - 1].id };
      toast(`${made.map((c) => c.name).join(', ')} en ${t.name} apunta${made.length > 1 ? 'n' : ''} ahora a ${src.name}.`, 'ok');
      commit(); render(); renderProps();
    });
    const toSql = $('tbToSql2'); if (toSql) toSql.addEventListener('click', sendToSql);
    $('tbDelTable').addEventListener('click', () => { TB.sel = { t: t.id, c: null }; deleteSelection(); });
  }

  /* ---------------- Lienzo: mover, desplazar y crear claves ajenas arrastrando ---------------- */
  let drag = null, pan = null, link = null;

  function rowAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !svg.contains(el)) return null;
    const row = el.closest('.tb-row');
    if (row) return { t: tableById(row.dataset.t), c: colById(tableById(row.dataset.t), row.dataset.c) };
    const tbl = el.closest('.tb-table');
    if (tbl) return { t: tableById(tbl.dataset.t), c: null };
    return null;
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    svg.focus({ preventScroll: true });
    const handle = e.target.closest && e.target.closest('.tb-handle');
    if (handle) {
      const t = tableById(handle.dataset.t), c = colById(t, handle.dataset.c);
      if (t && c) {
        const s = size(t);
        link = { t, c, from: { x: t.x + s.w, y: rowY(t, t.cols.indexOf(c)) }, moved: false };
        svg.setPointerCapture(e.pointerId);
        return;
      }
    }
    const hit = e.target.closest && e.target.closest('.tb-link-hit');
    if (hit) { select({ t: hit.dataset.t, c: hit.dataset.c, fk: true }); return; }
    const g = e.target.closest && e.target.closest('.tb-table');
    if (g) {
      const t = tableById(g.dataset.t);
      const row = e.target.closest('.tb-row');
      const sel = { t: t.id, c: row ? row.dataset.c : null };
      if (!TB.sel || TB.sel.t !== sel.t || TB.sel.c !== sel.c || TB.sel.fk) select(sel);
      const p = toWorld(e.clientX, e.clientY);
      drag = { t, sx: p.x, sy: p.y, ox: t.x, oy: t.y, moved: false };
    } else {
      pan = { sx: e.clientX, sy: e.clientY, tx: TB.view.tx, ty: TB.view.ty, moved: false };
      svg.classList.add('panning');
    }
    svg.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (link) {
      const p = toWorld(e.clientX, e.clientY);
      if (!link.moved && Math.hypot(p.x - link.from.x, p.y - link.from.y) < 4 / TB.view.s) return;
      link.moved = true;
      const over = rowAt(e.clientX, e.clientY);
      const ok = over && over.c && over.c.pk && over.c !== link.c;
      const P = screenPalette();
      const tmp = world.querySelector('.tb-temp');
      const dx = Math.max(40, Math.abs(p.x - link.from.x) * 0.5);
      tmp.innerHTML = `<path d="M ${link.from.x} ${link.from.y} C ${link.from.x + dx} ${link.from.y} ${p.x - (p.x > link.from.x ? dx : -dx)} ${p.y} ${p.x} ${p.y}" fill="none" stroke="${P.link}" stroke-width="2.2" stroke-dasharray="6 4"/>` +
        `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${ok ? P.link : P.fill}" stroke="${P.link}" stroke-width="2"/>`;
      world.querySelectorAll('.tb-row.drop').forEach((r) => r.classList.remove('drop'));
      if (ok) { const r = world.querySelector(`.tb-row[data-c="${over.c.id}"]`); if (r) r.classList.add('drop'); }
      return;
    }
    if (drag) {
      const p = toWorld(e.clientX, e.clientY);
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 3 / TB.view.s) return;
      drag.moved = true;
      drag.t.x = Math.round(drag.ox + dx); drag.t.y = Math.round(drag.oy + dy);
      render();
    } else if (pan) {
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (Math.hypot(dx, dy) > 3) pan.moved = true;
      TB.view.tx = pan.tx + dx; TB.view.ty = pan.ty + dy;
      render();
    }
  }
  function onPointerUp(e) {
    if (link) {
      const L = link; link = null;
      if (!L.moved) { select({ t: L.t.id, c: L.c.id }); return; }
      const over = rowAt(e.clientX, e.clientY);
      let target = null;
      if (over && over.c) target = over.c.pk ? { t: over.t, k: over.c } : 'notpk';
      else if (over && over.t) { const pks = pkCols(over.t); target = pks.length === 1 ? { t: over.t, k: pks[0] } : (pks.length ? 'many' : 'nopk'); }
      if (target && typeof target === 'object' && target.k === L.c) target = null;
      if (target && typeof target === 'object') {
        L.c.fk = { table: target.t.id, col: target.k.id };
        TB.sel = { t: L.t.id, c: L.c.id };
        commit();
        toast(`${L.t.name}.${L.c.name} es ahora clave ajena hacia ${target.t.name}.${target.k.name}.`, 'ok');
        if (typeMismatch(L.c)) toast(`Ojo: ${L.c.name} y ${target.k.name} no tienen el mismo tipo de dato.`, 'err');
      } else if (target === 'notpk') toast('Una clave ajena tiene que apuntar a una clave primaria. Suelta la flecha sobre una columna marcada con PK.');
      else if (target === 'many') toast('Esa tabla tiene una clave primaria de varias columnas: suelta la flecha sobre la columna exacta.');
      else if (target === 'nopk') toast(`La tabla ${over.t.name} todavía no tiene clave primaria.`);
      render(); renderProps();
      return;
    }
    if (drag && drag.moved) commit();
    if (pan && !pan.moved && TB.sel) select(null);
    drag = null; pan = null;
    svg.classList.remove('panning');
  }
  function onDblClick(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    const row = el.closest && el.closest('.tb-row');
    if (row) {
      select({ t: row.dataset.t, c: row.dataset.c });
      setTimeout(() => { const i = props.querySelector(`.tb-col[data-c="${row.dataset.c}"] [data-f="name"]`); if (i) { i.focus(); i.select(); } }, 30);
      return;
    }
    const g = el.closest && el.closest('.tb-table');
    if (g) { select({ t: g.dataset.t, c: null }); setTimeout(() => { const i = document.getElementById('tbName'); if (i) { i.focus(); i.select(); } }, 30); }
  }
  function onWheel(e) {
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
  }
  function onKey(e) {
    const view = document.getElementById('view-tables');
    if (!view || view.hidden) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag);
    if ((e.ctrlKey || e.metaKey) && !typing) {
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
    }
    if (typing) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && TB.sel) { e.preventDefault(); deleteSelection(); }
    if (e.key === 'Escape') select(null);
  }

  /* ---------------- Exportar, guardar y abrir ---------------- */
  function exportSvgString() {
    const b = bbox();
    if (!b) return null;
    const w = Math.ceil(b.x1 - b.x0), h = Math.ceil(b.y1 - b.y0) + 22;
    const credit = `<text x="${b.x1 - 8}" y="${b.y1 + 14}" text-anchor="end" font-family='${FONT}' font-size="10" fill="#6A7890">Hecho con SGBD (Juan Luis Torralbo Muñoz)</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x0} ${b.y0} ${w} ${h}"><rect x="${b.x0}" y="${b.y0}" width="${w}" height="${h}" fill="#FFFFFF"/>` +
      buildMarkup(PRINT, true) + credit + '</svg>';
  }
  function exportSvg() {
    const s = exportSvgString();
    if (!s) { toast('Todavía no hay tablas.'); return; }
    U.download('tablas.svg', s, 'image/svg+xml');
  }
  function exportPng() {
    const s = exportSvgString();
    if (!s) { toast('Todavía no hay tablas.'); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width * 2; c.height = img.height * 2;
      const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
      c.toBlob((blob) => { if (blob) U.download('tablas.png', blob); else toast('No se pudo crear la imagen.', 'err'); }, 'image/png');
    };
    img.onerror = () => toast('No se pudo crear la imagen PNG. Prueba con SVG.', 'err');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function validate(d) {
    if (!d || !Array.isArray(d.tables)) throw new Error('El archivo no contiene tablas de SGBD. ¿Es un diagrama E/R? Ábrelo en la pestaña Diagrama E/R.');
    const ids = new Set();
    d.tables.forEach((t) => {
      if (!t.id) t.id = uid('t');
      t.name = U.sqlIdent(t.name || 'tabla'); t.x = +t.x || 0; t.y = +t.y || 0;
      t.cols = Array.isArray(t.cols) ? t.cols : [];
      t.cols.forEach((c) => { if (!c.id) c.id = uid('c'); c.name = U.sqlIdent(c.name || 'columna'); c.type = String(c.type || ''); c.pk = !!c.pk; c.fk = c.fk && c.fk.table && c.fk.col ? { table: c.fk.table, col: c.fk.col } : null; ids.add(c.id); });
    });
    return { version: 1, kind: 'sgbd-tablas', tables: d.tables };
  }
  function setModel(d) {
    TB.model = validate(JSON.parse(JSON.stringify(d)));
    cleanFks();
    TB.sel = null; TB.undoStack = []; TB.redoStack = [];
    commit(); renderProps();
    requestAnimationFrame(fit);
  }
  function saveJson() {
    const d = JSON.parse(snapshot());
    d.app = 'SGBD (Juan Luis Torralbo Muñoz)'; d.saved = new Date().toISOString();
    U.download('tablas.json', JSON.stringify(d, null, 2), 'application/json');
    toast('Tablas guardadas como tablas.json', 'ok');
  }
  async function openJson() {
    const f = await U.pickFile('fileJson');
    if (!f) return;
    try { setModel(JSON.parse(await U.readFile(f))); toast('Tablas abiertas: ' + f.name, 'ok'); }
    catch (err) { toast('No se pudo abrir el archivo: ' + err.message, 'err'); }
  }

  /* ---------------- Inicio ---------------- */
  TB.init = function () {
    svg = document.getElementById('tbCanvas');
    world = document.getElementById('tbWorld');
    props = document.getElementById('tbProps');
    wrap = document.getElementById('tbCanvasWrap');
    emptyMsg = document.getElementById('tbEmpty');
    zoomLabel = document.getElementById('tbZoomLabel');
    document.getElementById('tbTypes').innerHTML = TYPES.map((t) => `<option value="${t}">`).join('');

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', () => { link = null; drag = null; pan = null; svg.classList.remove('panning'); render(); });
    svg.addEventListener('dblclick', onDblClick);
    svg.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKey);

    const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    on('tbAddTable', addTable);
    on('tbUndo', undo);
    on('tbRedo', redo);
    on('tbDelete', () => { if (TB.sel) deleteSelection(); else toast('Selecciona primero una tabla o una flecha.'); });
    on('tbZoomIn', () => zoomAt(1.2));
    on('tbZoomOut', () => zoomAt(1 / 1.2));
    on('tbFit', fit);
    on('tbToSql', sendToSql);
    on('tbNew', () => { if (tables().length && !confirm('¿Empezar en blanco? Se perderán las tablas si no las has guardado.')) return; setModel({ tables: [] }); });
    on('tbOpen', openJson);
    on('tbSave', saveJson);
    on('tbPng', exportPng);
    on('tbSvg', exportSvg);
    new ResizeObserver(() => render()).observe(wrap);

    const saved = U.storage.get(STORE_KEY, null);
    if (saved) { try { TB.model = validate(JSON.parse(saved)); cleanFks(); } catch (e) { /* se ignora */ } }
    TB.undoStack = [snapshot()];
    updateUndo(); renderProps();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  };
  /* Dibuja otro modelo (por ejemplo, el esquema de la base de datos abierta) con el mismo aspecto, sin tocar el del alumno */
  function withModel(model, fn) {
    const m = TB.model, s = TB.sel;
    TB.model = model; TB.sel = null;
    try { return fn(); } finally { TB.model = m; TB.sel = s; }
  }
  TB.sizeOf = size;
  TB.drawModel = (model) => withModel(model, () => ({ markup: buildMarkup(screenPalette(), true), bbox: bbox() }));
  TB.svgStringFor = (model) => withModel(model, exportSvgString);

  TB.render = render;
  TB.fit = fit;
  TB.scriptSql = scriptSql;
  TB.setModel = setModel;
  TB.getModel = () => JSON.parse(snapshot());
  window.TB = TB;
})();
