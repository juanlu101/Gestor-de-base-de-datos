/* =========================================================
   SGBD: editor de diagramas E/R en notación de Chen
   Creada por Juan Luis Torralbo Muñoz
   ========================================================= */
(function () {
  'use strict';
  const { esc, uid, toast } = U;

  const DTYPES = ['INTEGER', 'DECIMAL(10,2)', 'VARCHAR(9)', 'VARCHAR(15)', 'VARCHAR(50)', 'VARCHAR(100)', 'TEXT', 'DATE', 'DATETIME', 'BOOLEAN'];
  const FONT = '"Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif';
  const STORE_KEY = 'sgbd.er';

  const ER = {
    diagram: { version: 1, nodes: [] },
    selected: null,
    view: { tx: 0, ty: 0, s: 1 },
    undoStack: [],
    redoStack: [],
    onChange: null
  };

  let svg, world, props, wrap, emptyMsg, zoomLabel;

  /* ---------------- Medida de texto ---------------- */
  const measureCtx = document.createElement('canvas').getContext('2d');
  function textWidth(text, size, bold) {
    measureCtx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT;
    return measureCtx.measureText(text || ' ').width;
  }

  /* ---------------- Utilidades del modelo ---------------- */
  const byId = (id) => ER.diagram.nodes.find((n) => n.id === id);
  const nodesOf = (kind) => ER.diagram.nodes.filter((n) => n.kind === kind);
  const attrsOf = (ownerId) => ER.diagram.nodes.filter((n) => n.kind === 'attr' && n.owner === ownerId);

  function descendants(id) {
    const out = [];
    attrsOf(id).forEach((a) => { out.push(a); out.push(...descendants(a.id)); });
    return out;
  }

  function size(n) {
    if (n.kind === 'entity') {
      const w = Math.max(120, textWidth(n.name, 15, true) + 40);
      return { w, h: 56 };
    }
    if (n.kind === 'rel') {
      const w = Math.max(124, textWidth(n.name, 14, true) + 70);
      return { w, h: 76 };
    }
    const rx = Math.max(46, textWidth(n.name, 14, n.key) / 2 + 20);
    return { w: rx * 2, h: 42 };
  }

  function boundary(n, ux, uy) {
    const { w, h } = size(n);
    const hw = w / 2, hh = h / 2;
    let t;
    if (n.kind === 'entity') {
      t = Math.min(ux ? hw / Math.abs(ux) : Infinity, uy ? hh / Math.abs(uy) : Infinity);
    } else if (n.kind === 'rel') {
      t = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh);
    } else {
      t = 1 / Math.sqrt((ux / hw) ** 2 + (uy / hh) ** 2);
    }
    return { x: n.x + ux * t, y: n.y + uy * t };
  }

  function cardinality(rel) {
    if (!rel.parts || rel.parts.length < 2) return '';
    return rel.parts.map((p) => (p.max === '1' ? '1' : 'N')).join(':').replace(/^N:N$/, 'N:M');
  }

  function guessType(name, isKey) {
    const s = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/^(dni|nif|nie)\b/.test(s)) return 'VARCHAR(9)';
    if (/(telefono|movil|tlf)/.test(s)) return 'VARCHAR(15)';
    if (/(fecha|nacimiento|alta|baja)/.test(s)) return 'DATE';
    if (/(precio|nota|importe|salario|sueldo|peso|altura|media|coste|total)/.test(s)) return 'DECIMAL(10,2)';
    if (/^(id|num|n_|nia|nre|cantidad|edad|horas|stock|anio|ano|unidades|plazas|capacidad|planta|puntos|goles|ejemplares|duracion|paginas)/.test(s)) return 'INTEGER';
    if (/(email|correo|nombre|apellido|direccion|titulo|descripcion|calle|ciudad|localidad)/.test(s)) return 'VARCHAR(100)';
    if (/^(cod|codigo)/.test(s)) return 'VARCHAR(9)';
    return isKey ? 'INTEGER' : 'VARCHAR(50)';
  }

  /* ---------------- Historial ---------------- */
  function snapshot() { return JSON.stringify(ER.diagram); }
  function commit() {
    const snap = snapshot();
    if (ER.undoStack[ER.undoStack.length - 1] === snap) return;
    ER.undoStack.push(snap);
    if (ER.undoStack.length > 80) ER.undoStack.shift();
    ER.redoStack = [];
    persist();
    updateUndoButtons();
    if (ER.onChange) ER.onChange();
  }
  const persist = U.debounce(() => U.storage.set(STORE_KEY, snapshot()), 250);

  function undo() {
    if (ER.undoStack.length < 2) return;
    ER.redoStack.push(ER.undoStack.pop());
    ER.diagram = JSON.parse(ER.undoStack[ER.undoStack.length - 1]);
    if (ER.selected && !byId(ER.selected)) ER.selected = null;
    persist(); render(); renderProps(); updateUndoButtons();
  }
  function redo() {
    if (!ER.redoStack.length) return;
    const snap = ER.redoStack.pop();
    ER.undoStack.push(snap);
    ER.diagram = JSON.parse(snap);
    if (ER.selected && !byId(ER.selected)) ER.selected = null;
    persist(); render(); renderProps(); updateUndoButtons();
  }
  function updateUndoButtons() {
    const u = document.getElementById('erUndo'), r = document.getElementById('erRedo');
    if (u) u.disabled = ER.undoStack.length < 2;
    if (r) r.disabled = !ER.redoStack.length;
  }

  /* ---------------- Paletas de color ---------------- */
  function screenPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    return {
      fill: v('--er-fill', '#fff'), stroke: v('--er-stroke', '#1B2A4A'), text: v('--er-text', '#1B2A4A'),
      label: v('--er-label', '#3558A8'), line: v('--er-line', '#43536F'), hl: v('--hl', '#FFE45C'),
      halo: v('--paper', '#F6F8FB')
    };
  }
  const PRINT = {
    fill: '#FFFFFF', stroke: '#1B2A4A', text: '#1B2A4A',
    label: '#3558A8', line: '#43536F', hl: '#FFE45C', halo: '#FFFFFF'
  };

  /* ---------------- Dibujo ---------------- */
  function buildMarkup(P, selectedId, forExport) {
    let lines = '', labels = '', shapes = '';
    const nodes = ER.diagram.nodes;

    // Líneas de atributos
    nodes.forEach((a) => {
      if (a.kind !== 'attr') return;
      const o = byId(a.owner);
      if (!o) return;
      lines += `<line x1="${o.x}" y1="${o.y}" x2="${a.x}" y2="${a.y}" stroke="${P.line}" stroke-width="1.5"/>`;
    });

    // Líneas de relaciones con sus participaciones (mín, máx)
    nodes.forEach((r) => {
      if (r.kind !== 'rel') return;
      const counts = {};
      (r.parts || []).forEach((p) => { counts[p.entity] = (counts[p.entity] || 0) + 1; });
      const seen = {};
      (r.parts || []).forEach((p) => {
        const e = byId(p.entity);
        if (!e) return;
        const k = counts[p.entity];
        const i = seen[p.entity] = (seen[p.entity] === undefined ? 0 : seen[p.entity] + 1);
        let dx = e.x - r.x, dy = e.y - r.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const off = (i - (k - 1) / 2) * 30;
        const x1 = r.x + px * off, y1 = r.y + py * off;
        const x2 = e.x + px * off, y2 = e.y + py * off;
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${P.line}" stroke-width="1.8"/>`;
        // punto del borde de la entidad, desplazado según offset
        const b = boundary(e, -ux, -uy);
        const bx = b.x + px * off, by = b.y + py * off;
        const side = off >= 0 ? 1 : -1;
        const lx = bx - ux * 24 + px * 14 * side, ly = by - uy * 24 + py * 14 * side + 4;
        const txt = '(' + (p.min || '0') + ',' + (p.max || 'N') + ')';
        labels += `<text x="${lx}" y="${ly}" text-anchor="middle" font-family='${FONT}' font-size="13" font-weight="700" fill="${P.label}" paint-order="stroke" stroke="${P.halo}" stroke-width="4">${txt}</text>`;
        if (p.role) {
          const mx = (x1 + x2) / 2 - px * 12 * side, my = (y1 + y2) / 2 - py * 12 * side + 4;
          labels += `<text x="${mx}" y="${my}" text-anchor="middle" font-family='${FONT}' font-size="12" font-style="italic" fill="${P.line}" paint-order="stroke" stroke="${P.halo}" stroke-width="4">${esc(p.role)}</text>`;
        }
      });
    });

    // Formas
    nodes.forEach((n) => {
      const { w, h } = size(n);
      const sel = n.id === selectedId && !forExport;
      let g = `<g class="er-node" data-id="${n.id}" transform="translate(${n.x},${n.y})">`;
      if (n.kind === 'entity') {
        if (sel) g += `<rect x="${-w / 2 - 7}" y="${-h / 2 - 7}" width="${w + 14}" height="${h + 14}" rx="4" fill="${P.hl}" opacity=".85"/>`;
        g += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${P.fill}" stroke="${P.stroke}" stroke-width="2"/>`;
        if (n.weak) g += `<rect x="${-w / 2 + 5}" y="${-h / 2 + 5}" width="${w - 10}" height="${h - 10}" fill="none" stroke="${P.stroke}" stroke-width="1.6"/>`;
        g += `<text y="5.5" text-anchor="middle" font-family='${FONT}' font-size="15" font-weight="700" fill="${P.text}">${esc(n.name)}</text>`;
      } else if (n.kind === 'rel') {
        const pts = (dw, dh) => `0,${-h / 2 + dh} ${w / 2 - dw},0 0,${h / 2 - dh} ${-w / 2 + dw},0`;
        if (sel) g += `<polygon points="0,${-h / 2 - 9} ${w / 2 + 14},0 0,${h / 2 + 9} ${-w / 2 - 14},0" fill="${P.hl}" opacity=".85"/>`;
        g += `<polygon points="${pts(0, 0)}" fill="${P.fill}" stroke="${P.stroke}" stroke-width="2"/>`;
        if (n.identifying) g += `<polygon points="${pts(12, 6)}" fill="none" stroke="${P.stroke}" stroke-width="1.6"/>`;
        g += `<text y="5" text-anchor="middle" font-family='${FONT}' font-size="14" font-weight="700" fill="${P.text}">${esc(n.name)}</text>`;
        const c = cardinality(n);
        if (c) g += `<text y="${-h / 2 - 8}" text-anchor="middle" font-family='${FONT}' font-size="13" font-weight="700" fill="${P.label}">${c}</text>`;
      } else {
        const rx = w / 2, ry = h / 2;
        if (sel) g += `<ellipse rx="${rx + 7}" ry="${ry + 7}" fill="${P.hl}" opacity=".85"/>`;
        const dash = n.derived ? ' stroke-dasharray="5 4"' : '';
        g += `<ellipse rx="${rx}" ry="${ry}" fill="${P.fill}" stroke="${P.stroke}" stroke-width="1.7"${dash}/>`;
        if (n.multi) g += `<ellipse rx="${rx - 5}" ry="${ry - 5}" fill="none" stroke="${P.stroke}" stroke-width="1.4"${dash}/>`;
        const bold = n.key || n.partial;
        g += `<text y="5" text-anchor="middle" font-family='${FONT}' font-size="14" ${bold ? 'font-weight="700"' : ''} fill="${P.text}">${esc(n.name)}</text>`;
        if (n.key || n.partial) {
          const tw = textWidth(n.name, 14, true);
          g += `<line x1="${-tw / 2}" y1="9" x2="${tw / 2}" y2="9" stroke="${P.text}" stroke-width="1.4"${n.partial && !n.key ? ' stroke-dasharray="4 3"' : ''}/>`;
        }
      }
      g += '</g>';
      shapes += g;
    });

    return `<g class="er-lines">${lines}</g><g class="er-shapes">${shapes}</g><g class="er-labels" pointer-events="none">${labels}</g>`;
  }

  function render() {
    world.setAttribute('transform', `translate(${ER.view.tx},${ER.view.ty}) scale(${ER.view.s})`);
    const big = 100 * ER.view.s, small = 20 * ER.view.s;
    svg.style.backgroundSize = `${big}px ${big}px, ${big}px ${big}px, ${small}px ${small}px, ${small}px ${small}px`;
    svg.style.backgroundPosition = `${ER.view.tx}px ${ER.view.ty}px`;
    world.innerHTML = buildMarkup(screenPalette(), ER.selected, false);
    emptyMsg.hidden = ER.diagram.nodes.length > 0;
    zoomLabel.textContent = Math.round(ER.view.s * 100) + '%';
  }

  /* ---------------- Coordenadas ---------------- */
  function toWorld(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left - ER.view.tx) / ER.view.s, y: (clientY - r.top - ER.view.ty) / ER.view.s };
  }
  function viewCenter() {
    const r = svg.getBoundingClientRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }
  function zoomAt(factor, cx, cy) {
    const r = svg.getBoundingClientRect();
    const px = cx == null ? r.width / 2 : cx - r.left;
    const py = cy == null ? r.height / 2 : cy - r.top;
    const s0 = ER.view.s;
    const s1 = Math.min(3, Math.max(0.2, s0 * factor));
    ER.view.tx = px - (px - ER.view.tx) * (s1 / s0);
    ER.view.ty = py - (py - ER.view.ty) * (s1 / s0);
    ER.view.s = s1;
    render();
  }
  function bbox() {
    const ns = ER.diagram.nodes;
    if (!ns.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ns.forEach((n) => {
      const { w, h } = size(n);
      x0 = Math.min(x0, n.x - w / 2); y0 = Math.min(y0, n.y - h / 2 - 20);
      x1 = Math.max(x1, n.x + w / 2); y1 = Math.max(y1, n.y + h / 2 + 10);
    });
    return { x0: x0 - 30, y0: y0 - 20, x1: x1 + 30, y1: y1 + 20 };
  }
  function fit() {
    const b = bbox();
    const r = svg.getBoundingClientRect();
    if (!b || !r.width) { ER.view = { tx: r.width / 2 || 300, ty: r.height / 2 || 200, s: 1 }; render(); return; }
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    const s = Math.min(1.3, Math.max(0.2, Math.min(r.width / bw, r.height / bh) * 0.95));
    ER.view.s = s;
    ER.view.tx = r.width / 2 - ((b.x0 + b.x1) / 2) * s;
    ER.view.ty = r.height / 2 - ((b.y0 + b.y1) / 2) * s;
    render();
  }

  /* ---------------- Operaciones ---------------- */
  function uniqueName(base, kind) {
    const names = new Set(nodesOf(kind).map((n) => n.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    let i = 2;
    while (names.has((base + i).toLowerCase())) i++;
    return base + i;
  }

  function addEntity(at) {
    const p = at || viewCenter();
    const n = { id: uid('e'), kind: 'entity', name: uniqueName('Entidad', 'entity'), x: Math.round(p.x), y: Math.round(p.y), weak: false };
    ER.diagram.nodes.push(n);
    select(n.id); commit(); focusName();
    return n;
  }

  function addRel(entityA, entityB) {
    let x, y;
    const a = entityA && byId(entityA), b = entityB && byId(entityB);
    if (a && b && a !== b) { x = (a.x + b.x) / 2; y = (a.y + b.y) / 2; }
    else if (a) { x = a.x + 230; y = a.y; }
    else { const c = viewCenter(); x = c.x; y = c.y; }
    const parts = [];
    if (a) parts.push({ entity: a.id, min: '1', max: '1', role: '' });
    if (b) parts.push({ entity: b.id, min: '0', max: 'N', role: '' });
    if (a && b && a === b) { parts[0].role = 'rol 1'; parts[1].role = 'rol 2'; }
    const n = { id: uid('r'), kind: 'rel', name: uniqueName('Relación', 'rel'), x: Math.round(x), y: Math.round(y), identifying: false, parts };
    ER.diagram.nodes.push(n);
    select(n.id); commit(); focusName();
    return n;
  }

  const ANGLES = [-90, -45, -135, 90, 45, 135, 0, 180, -68, -112, 68, 112, -22, -158, 22, 158];
  function addAttr(ownerId, name) {
    const o = byId(ownerId);
    if (!o) { toast('Selecciona primero una entidad, relación o atributo compuesto.'); return null; }
    const siblings = attrsOf(ownerId);
    let ang, dist;
    if (o.kind === 'attr') {
      const gp = byId(o.owner);
      const base = gp ? Math.atan2(o.y - gp.y, o.x - gp.x) * 180 / Math.PI : -90;
      ang = base + [0, -40, 40, -80, 80][siblings.length % 5];
      dist = 78;
    } else {
      ang = ANGLES[siblings.length % ANGLES.length];
      const { w, h } = size(o);
      dist = (Math.abs(Math.cos(ang * Math.PI / 180)) > 0.7 ? w / 2 + 70 : h / 2 + 62) + Math.floor(siblings.length / ANGLES.length) * 40;
    }
    const rad = ang * Math.PI / 180;
    const isFirst = o.kind === 'entity' && !o.weak && siblings.length === 0;
    const nm = name || (isFirst ? 'id_' + U.sqlIdent(o.name).toLowerCase() : 'atributo' + (siblings.length + 1));
    const n = {
      id: uid('a'), kind: 'attr', name: nm, owner: o.id,
      x: Math.round(o.x + Math.cos(rad) * dist), y: Math.round(o.y + Math.sin(rad) * dist),
      key: isFirst, partial: false, multi: false, derived: false, required: false,
      dtype: guessType(nm, isFirst)
    };
    ER.diagram.nodes.push(n);
    return n;
  }

  function removeNode(id) {
    const n = byId(id);
    if (!n) return;
    const kill = new Set([id, ...descendants(id).map((d) => d.id)]);
    ER.diagram.nodes = ER.diagram.nodes.filter((x) => !kill.has(x.id));
    if (n.kind === 'entity') {
      nodesOf('rel').forEach((r) => { r.parts = (r.parts || []).filter((p) => p.entity !== id); });
    }
    if (kill.has(ER.selected)) ER.selected = null;
  }

  function deleteSelected() {
    if (!ER.selected) return;
    const n = byId(ER.selected);
    removeNode(ER.selected);
    ER.selected = null;
    render(); renderProps(); commit();
    toast('Eliminado: ' + (n ? n.name : 'elemento'));
  }

  function select(id) {
    ER.selected = id;
    render();
    renderProps();
  }
  function focusName() {
    setTimeout(() => {
      const i = document.getElementById('pName');
      if (i) { i.focus(); i.select(); }
    }, 30);
  }

  /* ---------------- Panel de propiedades ---------------- */
  function entityOptions(selectedId) {
    return nodesOf('entity').map((e) => `<option value="${e.id}"${e.id === selectedId ? ' selected' : ''}>${esc(e.name)}</option>`).join('');
  }

  function attrListHtml(ownerId) {
    const list = attrsOf(ownerId);
    if (!list.length) return '<p class="props-help">Todavía no tiene atributos.</p>';
    return '<ul class="attr-list">' + list.map((a) => {
      const flags = [a.key ? 'clave' : '', a.partial ? 'parcial' : '', a.multi ? 'multi' : '', a.derived ? 'derivado' : '', attrsOf(a.id).length ? 'compuesto' : ''].filter(Boolean).join(', ');
      return `<li><button data-goto="${a.id}"><span class="${a.key ? 'pk' : ''}">${esc(a.name)}</span><span class="tag">${esc(flags || a.dtype)}</span></button></li>`;
    }).join('') + '</ul>';
  }

  function addAttrRow(ph) {
    return `<div class="inline-row"><input class="input" id="pNewAttr" type="text" placeholder="${ph}" aria-label="Nombre del nuevo atributo"><button class="btn primary" id="pAddAttr">Añadir</button></div>`;
  }

  function renderProps() {
    const n = ER.selected && byId(ER.selected);
    if (!n) { props.innerHTML = emptyPropsHtml(); return; }
    let h = '';
    if (n.kind === 'entity') {
      h += `<h3>${esc(n.name)}</h3><p class="kind">Entidad${n.weak ? ' débil' : ''}</p>
        <label class="field"><span>Nombre</span><input type="text" id="pName" value="${esc(n.name)}"></label>
        <label class="opt"><input type="checkbox" id="pWeak"${n.weak ? ' checked' : ''}><span>Entidad débil<small>Depende de otra entidad para existir o identificarse (se dibuja con doble rectángulo).</small></span></label>
        <div class="props-section"><h4>Atributos</h4>${attrListHtml(n.id)}${addAttrRow('Nuevo atributo, p. ej. nombre')}</div>
        <div class="props-section"><h4>Relacionar</h4>
          <p class="props-help">Crea una relación entre esta entidad y otra. Elige la misma entidad para una relación reflexiva.</p>
          <div class="inline-row"><select class="input" id="pRelWith">${entityOptions(nodesOf('entity').find((e) => e.id !== n.id)?.id)}</select><button class="btn primary" id="pMakeRel">Crear</button></div>
        </div>`;
    } else if (n.kind === 'rel') {
      const c = cardinality(n);
      h += `<h3>${esc(n.name)}</h3><p class="kind">Relación${c ? ' <span class="card-badge">' + c + '</span>' : ''}</p>
        <label class="field"><span>Nombre</span><input type="text" id="pName" value="${esc(n.name)}"></label>
        <label class="opt"><input type="checkbox" id="pIdent"${n.identifying ? ' checked' : ''}><span>Relación de identificación<small>Une una entidad débil con la entidad de la que depende (doble rombo).</small></span></label>
        <div class="props-section"><h4>Entidades participantes</h4>
        <p class="props-help">(mín, máx) junto a cada entidad indica con cuántas ocurrencias de <em>esa</em> entidad se relaciona <em>una</em> ocurrencia de la otra. Ejemplo: Profesor (1,1) imparte Asignatura (0,N).</p>`;
      (n.parts || []).forEach((p, i) => {
        h += `<div class="part" data-part="${i}">
          <div class="part-row"><select class="grow" data-f="entity" aria-label="Entidad">${entityOptions(p.entity)}</select>
          <button class="btn icon small danger-ghost" data-f="remove" title="Quitar participante" aria-label="Quitar participante">×</button></div>
          <div class="part-row">
            <label>mín</label><select class="mini" data-f="min"><option${p.min === '0' ? ' selected' : ''}>0</option><option${p.min === '1' ? ' selected' : ''}>1</option></select>
            <label>máx</label><select class="mini" data-f="max"><option${p.max === '1' ? ' selected' : ''}>1</option><option${p.max === 'N' ? ' selected' : ''}>N</option></select>
            <input class="grow" data-f="role" type="text" placeholder="rol (opcional)" value="${esc(p.role || '')}" aria-label="Rol">
          </div></div>`;
      });
      h += `<button class="btn" id="pAddPart"${nodesOf('entity').length ? '' : ' disabled'}>Añadir participante</button></div>
        <div class="props-section"><h4>Atributos de la relación</h4>${attrListHtml(n.id)}${addAttrRow('p. ej. fecha, nota…')}</div>`;
    } else {
      const owner = byId(n.owner);
      const ownerIsWeak = owner && owner.kind === 'entity' && owner.weak;
      const ownerIsAttr = owner && owner.kind === 'attr';
      h += `<h3>${esc(n.name)}</h3><p class="kind">Atributo de <button class="btn small" style="width:auto;padding:0 8px" data-goto="${owner ? owner.id : ''}">${esc(owner ? owner.name : '¿?')}</button></p>
        <label class="field"><span>Nombre</span><input type="text" id="pName" value="${esc(n.name)}"></label>
        <label class="field"><span>Tipo de dato</span><select id="pType">${DTYPES.map((t) => `<option${t === n.dtype ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        ${ownerIsAttr ? '' : `<label class="opt"><input type="checkbox" id="pKey"${n.key ? ' checked' : ''}><span>Clave primaria (identificador)<small>Distingue cada ocurrencia. Se dibuja subrayado.</small></span></label>`}
        ${ownerIsWeak ? `<label class="opt"><input type="checkbox" id="pPartial"${n.partial ? ' checked' : ''}><span>Clave parcial (discriminante)<small>Identifica a la entidad débil junto con la clave de la entidad fuerte. Subrayado discontinuo.</small></span></label>` : ''}
        <label class="opt"><input type="checkbox" id="pReq"${n.required || n.key ? ' checked' : ''}${n.key ? ' disabled' : ''}><span>Obligatorio<small>No puede quedar vacío (NOT NULL).</small></span></label>
        <label class="opt"><input type="checkbox" id="pMulti"${n.multi ? ' checked' : ''}><span>Multivaluado<small>Puede tener varios valores, como varios teléfonos. Doble elipse.</small></span></label>
        <label class="opt"><input type="checkbox" id="pDerived"${n.derived ? ' checked' : ''}><span>Derivado<small>Se calcula a partir de otros datos, como la edad. Elipse discontinua.</small></span></label>
        <div class="props-section"><h4>Subatributos</h4><p class="props-help">Si el atributo es compuesto (por ejemplo, dirección = calle + número + CP), añade aquí sus partes.</p>${attrListHtml(n.id)}${addAttrRow('p. ej. calle')}</div>`;
    }
    h += `<div class="props-section"><button class="btn danger-ghost" id="pDelete">Eliminar ${n.kind === 'entity' ? 'entidad' : n.kind === 'rel' ? 'relación' : 'atributo'}</button></div>`;
    props.innerHTML = h;
    wireProps(n);
  }

  function emptyPropsHtml() {
    return `<div class="props-empty"><h3>Cómo empezar</h3>
      <ol>
        <li>Crea las <strong>entidades</strong> (cosas sobre las que guardar datos: Alumno, Libro…).</li>
        <li>Selecciona una entidad y añádele <strong>atributos</strong>. Marca cuál es la clave primaria.</li>
        <li>Desde una entidad, pulsa <strong>Crear</strong> en «Relacionar» para unirla con otra.</li>
        <li>En la relación, ajusta las participaciones (mín, máx).</li>
        <li>Guarda el diagrama o expórtalo como imagen desde <strong>Archivo</strong>.</li>
      </ol>
      <div class="legend" aria-label="Leyenda de símbolos">
        <svg viewBox="0 0 54 30"><rect class="ls" x="4" y="5" width="46" height="20"/></svg><span>Entidad</span>
        <svg viewBox="0 0 54 30"><rect class="ls" x="4" y="5" width="46" height="20"/><rect class="ls" x="8" y="9" width="38" height="12"/></svg><span>Entidad débil</span>
        <svg viewBox="0 0 54 30"><path class="ls" d="M27 3 L51 15 L27 27 L3 15 Z"/></svg><span>Relación</span>
        <svg viewBox="0 0 54 30"><path class="ls" d="M27 3 L51 15 L27 27 L3 15 Z"/><path class="ls" d="M27 8 L41 15 L27 22 L13 15 Z"/></svg><span>Relación de identificación</span>
        <svg viewBox="0 0 54 30"><ellipse class="ls" cx="27" cy="15" rx="23" ry="11"/></svg><span>Atributo (subrayado si es clave)</span>
        <svg viewBox="0 0 54 30"><ellipse class="ls" cx="27" cy="15" rx="23" ry="11"/><ellipse class="ls" cx="27" cy="15" rx="18" ry="7"/></svg><span>Atributo multivaluado</span>
        <svg viewBox="0 0 54 30"><ellipse class="ls ld" cx="27" cy="15" rx="23" ry="11"/></svg><span>Atributo derivado</span>
      </div></div>`;
  }

  function wireProps(n) {
    const $ = (id) => document.getElementById(id);
    const nameI = $('pName');
    if (nameI) {
      nameI.addEventListener('input', () => {
        n.name = nameI.value;
        if (n.kind === 'attr' && !n._typeTouched) n.dtype = guessType(n.name, n.key);
        render();
        const h3 = props.querySelector('h3'); if (h3) h3.textContent = n.name;
      });
      nameI.addEventListener('change', () => {
        if (!n.name.trim()) { n.name = n.kind === 'entity' ? 'Entidad' : n.kind === 'rel' ? 'Relación' : 'atributo'; nameI.value = n.name; render(); }
        commit(); renderProps();
      });
      nameI.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameI.blur(); });
    }
    const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener('change', () => { fn(el); render(); renderProps(); commit(); }); };
    bind('pWeak', (el) => { n.weak = el.checked; if (!n.weak) attrsOf(n.id).forEach((a) => { a.partial = false; }); });
    bind('pIdent', (el) => { n.identifying = el.checked; });
    bind('pType', (el) => { n.dtype = el.value; n._typeTouched = true; });
    bind('pKey', (el) => { n.key = el.checked; if (n.key) { n.multi = false; n.derived = false; n.partial = false; } });
    bind('pPartial', (el) => { n.partial = el.checked; if (n.partial) { n.key = false; n.multi = false; n.derived = false; } });
    bind('pReq', (el) => { n.required = el.checked; });
    bind('pMulti', (el) => { n.multi = el.checked; if (n.multi) { n.key = false; n.partial = false; } });
    bind('pDerived', (el) => { n.derived = el.checked; if (n.derived) { n.key = false; n.partial = false; } });

    const newAttr = $('pNewAttr'), addBtn = $('pAddAttr');
    if (addBtn) {
      const doAdd = () => {
        const name = newAttr.value.trim();
        const a = addAttr(n.id, name || null);
        if (!a) return;
        render(); renderProps(); commit();
        const again = $('pNewAttr'); if (again) again.focus();
      };
      addBtn.addEventListener('click', doAdd);
      newAttr.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    }
    const mk = $('pMakeRel');
    if (mk) mk.addEventListener('click', () => {
      const other = $('pRelWith').value;
      if (!other) { toast('Crea antes otra entidad para relacionarla.'); return; }
      addRel(n.id, other);
    });

    props.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.goto) select(b.dataset.goto); }));

    props.querySelectorAll('.part').forEach((box) => {
      const i = +box.dataset.part;
      box.querySelectorAll('[data-f]').forEach((el) => {
        const f = el.dataset.f;
        if (f === 'remove') {
          el.addEventListener('click', () => { n.parts.splice(i, 1); render(); renderProps(); commit(); });
        } else if (f === 'role') {
          el.addEventListener('input', () => { n.parts[i].role = el.value; render(); });
          el.addEventListener('change', () => commit());
        } else {
          el.addEventListener('change', () => { n.parts[i][f] = el.value; render(); renderProps(); commit(); });
        }
      });
    });
    const addPart = $('pAddPart');
    if (addPart) addPart.addEventListener('click', () => {
      const ents = nodesOf('entity');
      if (!ents.length) return;
      const used = new Set(n.parts.map((p) => p.entity));
      const e = ents.find((x) => !used.has(x.id)) || ents[0];
      n.parts.push({ entity: e.id, min: '0', max: 'N', role: '' });
      render(); renderProps(); commit();
    });
    const del = $('pDelete');
    if (del) del.addEventListener('click', deleteSelected);
  }

  /* ---------------- Interacción con el lienzo ---------------- */
  let drag = null, pan = null;

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    svg.focus({ preventScroll: true });
    const g = e.target.closest('.er-node');
    if (g) {
      const n = byId(g.dataset.id);
      if (!n) return;
      if (ER.selected !== n.id) select(n.id);
      const p = toWorld(e.clientX, e.clientY);
      const followers = n.kind === 'attr' ? descendants(n.id) : descendants(n.id);
      drag = { n, sx: p.x, sy: p.y, ox: n.x, oy: n.y, moved: false, follow: followers.map((f) => ({ f, ox: f.x, oy: f.y })) };
    } else {
      pan = { sx: e.clientX, sy: e.clientY, tx: ER.view.tx, ty: ER.view.ty, moved: false };
      svg.classList.add('panning');
    }
    svg.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (drag) {
      const p = toWorld(e.clientX, e.clientY);
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 3 / ER.view.s) return;
      drag.moved = true;
      drag.n.x = Math.round(drag.ox + dx); drag.n.y = Math.round(drag.oy + dy);
      drag.follow.forEach((o) => { o.f.x = Math.round(o.ox + dx); o.f.y = Math.round(o.oy + dy); });
      render();
    } else if (pan) {
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (Math.hypot(dx, dy) > 3) pan.moved = true;
      ER.view.tx = pan.tx + dx; ER.view.ty = pan.ty + dy;
      render();
    }
  }
  function onPointerUp() {
    if (drag && drag.moved) commit();
    if (pan && !pan.moved && ER.selected) select(null);
    drag = null; pan = null;
    svg.classList.remove('panning');
  }
  function onDblClick(e) {
    const g = e.target.closest('.er-node');
    if (g) { select(g.dataset.id); focusName(); return; }
    addEntity(toWorld(e.clientX, e.clientY));
  }
  function onWheel(e) {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomAt(f, e.clientX, e.clientY);
  }
  function onKey(e) {
    const view = document.getElementById('view-er');
    if (!view || view.hidden) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag);
    if ((e.ctrlKey || e.metaKey) && !typing) {
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
    }
    if (typing) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && ER.selected) { e.preventDefault(); deleteSelected(); }
    if (e.key === 'Escape') select(null);
  }

  /* ---------------- Exportación ---------------- */
  function exportSvgString() {
    const b = bbox();
    if (!b) return null;
    const w = Math.ceil(b.x1 - b.x0), h = Math.ceil(b.y1 - b.y0) + 22;
    const credit = `<text x="${b.x1 - 8}" y="${b.y1 + 14}" text-anchor="end" font-family='${FONT}' font-size="10" fill="#6A7890">Hecho con SGBD (Juan Luis Torralbo Muñoz)</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x0} ${b.y0} ${w} ${h}">` +
      `<rect x="${b.x0}" y="${b.y0}" width="${w}" height="${h}" fill="#FFFFFF"/>` +
      buildMarkup(PRINT, null, true) + credit + '</svg>';
  }
  function exportSvg() {
    const s = exportSvgString();
    if (!s) { toast('El diagrama está vacío.'); return; }
    U.download('diagrama-er.svg', s, 'image/svg+xml');
  }
  function exportPng() {
    const s = exportSvgString();
    if (!s) { toast('El diagrama está vacío.'); return; }
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    img.onload = () => {
      const scale = 2;
      const c = document.createElement('canvas');
      c.width = img.width * scale; c.height = img.height * scale;
      const ctx = c.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      c.toBlob((blob) => { if (blob) U.download('diagrama-er.png', blob); else toast('No se pudo crear la imagen.', 'err'); }, 'image/png');
    };
    img.onerror = () => toast('No se pudo crear la imagen PNG. Prueba con SVG.', 'err');
    img.src = url;
  }

  /* ---------------- Carga y guardado ---------------- */
  function validate(d) {
    if (!d || !Array.isArray(d.nodes)) throw new Error('El archivo no contiene un diagrama de SGBD.');
    d.nodes.forEach((n) => {
      if (!n.id || !n.kind) throw new Error('Hay elementos sin identificador en el archivo.');
      n.x = +n.x || 0; n.y = +n.y || 0; n.name = String(n.name || '');
      if (n.kind === 'rel') n.parts = Array.isArray(n.parts) ? n.parts : [];
      if (n.kind === 'attr' && !n.dtype) n.dtype = guessType(n.name, n.key);
    });
    return { version: 1, title: d.title || '', nodes: d.nodes };
  }
  function setDiagram(d, opts) {
    ER.diagram = validate(JSON.parse(JSON.stringify(d)));
    ER.selected = null;
    ER.undoStack = []; ER.redoStack = [];
    commit();
    renderProps();
    requestAnimationFrame(fit);
    if (!(opts && opts.silent) && ER.onChange) ER.onChange();
  }
  function getDiagram() { return JSON.parse(snapshot()); }

  function saveJson() {
    const d = getDiagram();
    d.app = 'SGBD (Juan Luis Torralbo Muñoz)';
    d.saved = new Date().toISOString();
    U.download('diagrama-er.json', JSON.stringify(d, null, 2), 'application/json');
    toast('Diagrama guardado como diagrama-er.json', 'ok');
  }
  async function openJson() {
    const f = await U.pickFile('fileJson');
    if (!f) return;
    try {
      const d = JSON.parse(await U.readFile(f));
      setDiagram(d);
      toast('Diagrama abierto: ' + f.name, 'ok');
    } catch (err) {
      toast('No se pudo abrir el archivo: ' + err.message, 'err');
    }
  }

  /* ---------------- Inicio ---------------- */
  ER.init = function () {
    svg = document.getElementById('erCanvas');
    world = document.getElementById('erWorld');
    props = document.getElementById('erProps');
    wrap = document.getElementById('erCanvasWrap');
    emptyMsg = document.getElementById('erEmpty');
    zoomLabel = document.getElementById('erZoomLabel');

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('dblclick', onDblClick);
    svg.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKey);

    const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    on('erAddEntity', () => addEntity());
    on('erAddRel', () => {
      const s = ER.selected && byId(ER.selected);
      const ents = nodesOf('entity');
      if (s && s.kind === 'entity') {
        const other = ents.find((e) => e.id !== s.id);
        addRel(s.id, other ? other.id : null);
      } else addRel(null, null);
    });
    on('erAddAttr', () => {
      const s = ER.selected && byId(ER.selected);
      if (!s) { toast('Selecciona la entidad o relación a la que quieres añadir el atributo.'); return; }
      const a = addAttr(s.id);
      if (a) { select(a.id); commit(); focusName(); }
    });
    on('erUndo', undo);
    on('erRedo', redo);
    on('erDelete', () => { if (ER.selected) deleteSelected(); else toast('Selecciona primero un elemento.'); });
    on('erZoomIn', () => zoomAt(1.2));
    on('erZoomOut', () => zoomAt(1 / 1.2));
    on('erFit', fit);
    const closeMenu = (btn) => { const d = btn.closest('details'); if (d) d.open = false; };
    on('erNew', (e) => {
      closeMenu(e.target);
      if (ER.diagram.nodes.length && !confirm('¿Empezar un diagrama nuevo? Se perderá el actual si no lo has guardado.')) return;
      setDiagram({ nodes: [] });
    });
    on('erOpen', (e) => { closeMenu(e.target); openJson(); });
    on('erSave', (e) => { closeMenu(e.target); saveJson(); });
    on('erPng', (e) => { closeMenu(e.target); exportPng(); });
    on('erSvg', (e) => { closeMenu(e.target); exportSvg(); });

    new ResizeObserver(() => render()).observe(wrap);

    // Recuperar el último diagrama
    const saved = U.storage.get(STORE_KEY, null);
    let loaded = false;
    if (saved) {
      try { ER.diagram = validate(JSON.parse(saved)); loaded = true; } catch (e) { /* ignorar */ }
    }
    ER.undoStack = [snapshot()];
    updateUndoButtons();
    renderProps();
    requestAnimationFrame(fit);
    // Las fuentes web cambian las medidas del texto: redibujar al cargarlas
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  };

  ER.setDiagram = setDiagram;
  ER.getDiagram = getDiagram;
  ER.render = render;
  ER.fit = fit;
  ER.cardinality = cardinality;
  window.ER = ER;
})();
