/* =========================================================
   SGBD: esquema visual de la base de datos abierta.
   Dibuja sus tablas con las claves primarias y ajenas, y una flecha
   desde cada clave ajena hasta la clave primaria a la que apunta.
   Creada por Juan Luis Torralbo Muñoz
   ========================================================= */
(function () {
  'use strict';
  const { toast } = U;
  const GAP_X = 120, GAP_Y = 40;

  let dlg, svg, world, zoomLabel, titleEl;
  let model = null, dbName = '';
  const view = { tx: 0, ty: 0, s: 1 };

  /* ---------- De la estructura de SQLite al modelo de dibujo ---------- */
  function fromSchema(s) {
    const tables = s.tables.map((t) => ({
      id: 't:' + t.name, name: t.name, x: 0, y: 0,
      cols: t.cols.map((c) => ({ id: 'c:' + t.name + ':' + c.name, name: c.name, type: c.type || '', pk: !!c.pk, fk: null }))
    }));
    const byName = (n) => tables.find((t) => t.name.toLowerCase() === String(n).toLowerCase());
    s.tables.forEach((t) => {
      const src = byName(t.name);
      const used = {};
      t.fks.forEach((f) => {
        const target = byName(f.table);
        const col = src.cols.find((c) => c.name.toLowerCase() === String(f.from).toLowerCase());
        if (!target || !col || col.fk) return;
        let tc = f.to ? target.cols.find((c) => c.name.toLowerCase() === String(f.to).toLowerCase()) : null;
        if (!tc) {
          // REFERENCES tabla sin columna: apunta a su clave primaria (en orden, si tiene varias columnas)
          const pks = target.cols.filter((c) => c.pk);
          const k = (used[target.id] = (used[target.id] || 0) + 1) - 1;
          tc = pks[k] || pks[0];
        }
        if (tc) col.fk = { table: target.id, col: tc.id };
      });
    });
    return { version: 1, kind: 'sgbd-tablas', tables };
  }

  /* ---------- Colocación por columnas ---------- */
  function layout(m) {
    const T = m.tables;
    const out = new Map(T.map((t) => [t.id, new Set()]));     // tablas a las que apunta cada una
    T.forEach((t) => t.cols.forEach((c) => { if (c.fk && c.fk.table !== t.id) out.get(t.id).add(c.fk.table); }));
    const level = new Map(), visiting = new Set();
    function lv(id) {
      if (level.has(id)) return level.get(id);
      if (visiting.has(id)) return 0;            // ciclo: se corta aquí
      visiting.add(id);
      let L = 0;
      out.get(id).forEach((d) => { L = Math.max(L, lv(d) + 1); });
      visiting.delete(id);
      level.set(id, L);
      return L;
    }
    T.forEach((t) => lv(t.id));
    // cada tabla se acerca a las que apuntan a ella (justo a su izquierda), para que las flechas no salten columnas
    [...T].sort((a, b) => level.get(b.id) - level.get(a.id)).forEach((t) => {
      const refs = T.filter((o) => o !== t && out.get(o.id).has(t.id)).map((o) => level.get(o.id));
      if (refs.length) level.set(t.id, Math.max(level.get(t.id), Math.min(...refs) - 1));
    });
    const cols = [];
    T.forEach((t) => { const L = level.get(t.id); (cols[L] = cols[L] || []).push(t); });
    for (let i = 0; i < cols.length; i++) cols[i] = cols[i] || [];
    // orden dentro de cada columna: cerca de las tablas con las que se relaciona (dos pasadas)
    const pos = new Map();
    const setPos = () => cols.forEach((c) => c.forEach((t, i) => pos.set(t.id, i)));
    cols.forEach((c) => c.sort((a, b) => a.name.localeCompare(b.name)));
    setPos();
    const neighbours = (t) => {
      const n = [...out.get(t.id)];
      T.forEach((o) => { if (out.get(o.id).has(t.id)) n.push(o.id); });
      return n.filter((id) => id !== t.id);
    };
    for (let pass = 0; pass < 3; pass++) {
      cols.forEach((c) => {
        const bary = new Map(c.map((t) => {
          const n = neighbours(t);
          return [t.id, n.length ? n.reduce((a, id) => a + pos.get(id), 0) / n.length : pos.get(t.id)];
        }));
        c.sort((a, b) => bary.get(a.id) - bary.get(b.id));
        c.forEach((t, i) => pos.set(t.id, i));   // la siguiente columna ya usa el orden nuevo
      });
    }
    // posiciones: columnas de izquierda (tablas a las que se apunta) a derecha
    const heights = cols.map((c) => c.reduce((a, t) => a + TB.sizeOf(t).h, 0) + GAP_Y * Math.max(0, c.length - 1));
    const H = Math.max(...heights, 0);
    let x = 0;
    cols.forEach((c, i) => {
      const w = Math.max(...c.map((t) => TB.sizeOf(t).w), 0);
      let y = (H - heights[i]) / 2;
      c.forEach((t) => { t.x = Math.round(x); t.y = Math.round(y); y += TB.sizeOf(t).h + GAP_Y; });
      // si alguna tabla de esta columna apunta a sí misma, la flecha sale por la derecha: más hueco
      const self = c.some((t) => t.cols.some((col) => col.fk && col.fk.table === t.id));
      x += w + GAP_X + (self ? 60 : 0);
    });
  }

  /* ---------- Dibujo, zoom y desplazamiento ---------- */
  function render() {
    if (!model) return;
    world.setAttribute('transform', `translate(${view.tx},${view.ty}) scale(${view.s})`);
    const big = 100 * view.s, small = 20 * view.s;
    svg.style.backgroundSize = `${big}px ${big}px, ${big}px ${big}px, ${small}px ${small}px, ${small}px ${small}px`;
    svg.style.backgroundPosition = `${view.tx}px ${view.ty}px`;
    world.innerHTML = TB.drawModel(model).markup;
    zoomLabel.textContent = Math.round(view.s * 100) + '%';
  }
  function fit() {
    const b = TB.drawModel(model).bbox, r = svg.getBoundingClientRect();
    if (!b || !r.width) return;
    view.s = Math.min(1.4, Math.max(0.2, Math.min(r.width / (b.x1 - b.x0), r.height / (b.y1 - b.y0)) * 0.94));
    view.tx = r.width / 2 - ((b.x0 + b.x1) / 2) * view.s;
    view.ty = r.height / 2 - ((b.y0 + b.y1) / 2) * view.s;
    render();
  }
  function zoomAt(f, cx, cy) {
    const r = svg.getBoundingClientRect();
    const px = cx == null ? r.width / 2 : cx - r.left, py = cy == null ? r.height / 2 : cy - r.top;
    const s1 = Math.min(3, Math.max(0.2, view.s * f));
    view.tx = px - (px - view.tx) * (s1 / view.s);
    view.ty = py - (py - view.ty) * (s1 / view.s);
    view.s = s1; render();
  }
  const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - view.tx) / view.s, y: (cy - r.top - view.ty) / view.s }; };

  let drag = null, pan = null;
  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const g = e.target.closest && e.target.closest('.tb-table');
    if (g) {
      const t = model.tables.find((x) => x.id === g.dataset.t);
      const p = toWorld(e.clientX, e.clientY);
      drag = { t, sx: p.x, sy: p.y, ox: t.x, oy: t.y };
    } else {
      pan = { sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
      svg.classList.add('panning');
    }
    svg.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (drag) {
      const p = toWorld(e.clientX, e.clientY);
      drag.t.x = Math.round(drag.ox + p.x - drag.sx); drag.t.y = Math.round(drag.oy + p.y - drag.sy);
      render();
    } else if (pan) {
      view.tx = pan.tx + e.clientX - pan.sx; view.ty = pan.ty + e.clientY - pan.sy;
      render();
    }
  }
  function onUp() { drag = null; pan = null; svg.classList.remove('panning'); }

  /* ---------- Descargar como imagen ---------- */
  function fileBase() {
    return 'esquema-' + (U.sqlIdent(dbName || 'base_de_datos').toLowerCase() || 'base_de_datos');
  }
  function downloadPng() {
    const s = TB.svgStringFor(model);
    if (!s) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width * 2; c.height = img.height * 2;
      const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
      c.toBlob((blob) => { if (blob) U.download(fileBase() + '.png', blob); else toast('No se pudo crear la imagen.', 'err'); }, 'image/png');
    };
    img.onerror = () => toast('No se pudo crear la imagen.', 'err');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  /* ---------- Abrir y cerrar ---------- */
  function open() {
    if (!DB.ready || !DB.db) return;
    const s = DB.schema();
    if (!s.tables.length) { toast('La base de datos no tiene tablas.'); return; }
    dbName = DB.name || 'Base de datos';
    model = fromSchema(s);
    layout(model);
    titleEl.textContent = 'Esquema de ' + dbName;
    const fks = model.tables.reduce((a, t) => a + t.cols.filter((c) => c.fk).length, 0);
    document.getElementById('sdCount').textContent =
      `${model.tables.length} ${model.tables.length === 1 ? 'tabla' : 'tablas'}, ${fks} ${fks === 1 ? 'clave ajena' : 'claves ajenas'}`;
    dlg.showModal();
    requestAnimationFrame(fit);
  }

  const SV = {};
  SV.init = function () {
    dlg = document.getElementById('schemaDialog');
    svg = document.getElementById('sdCanvas');
    world = document.getElementById('sdWorld');
    zoomLabel = document.getElementById('sdZoom');
    titleEl = document.getElementById('schemaDialogTitle');
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY); }, { passive: false });
    const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    on('sdZoomIn', () => zoomAt(1.2));
    on('sdZoomOut', () => zoomAt(1 / 1.2));
    on('sdFit', fit);
    on('sdReorder', () => { layout(model); fit(); });
    on('sdPng', downloadPng);
    on('sdClose', () => dlg.close());
    // clic en el fondo oscuro: cerrar
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    new ResizeObserver(() => { if (dlg.open) render(); }).observe(svg);
  };
  SV.open = open;
  SV.render = () => { if (dlg && dlg.open) render(); };
  SV.modelFor = fromSchema;
  SV.layout = layout;
  window.SV = SV;
})();
