/* SGBD: editor SQL ligero con resaltado. Creada por Juan Luis Torralbo Muñoz. */
(function () {
  'use strict';

  const KW = new Set(('SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING ' +
    'GROUP BY ORDER HAVING LIMIT OFFSET ASC DESC DISTINCT ALL UNION INTERSECT EXCEPT INSERT INTO VALUES UPDATE SET DELETE ' +
    'CREATE TABLE VIEW INDEX UNIQUE PRIMARY KEY FOREIGN REFERENCES DROP ALTER ADD COLUMN RENAME TO IF EXISTS DEFAULT CHECK ' +
    'CONSTRAINT CASCADE RESTRICT NO ACTION CASE WHEN THEN ELSE END BEGIN COMMIT ROLLBACK TRANSACTION PRAGMA TRIGGER ' +
    'INTEGER INT TEXT REAL NUMERIC VARCHAR CHAR DECIMAL DATE DATETIME BOOLEAN BLOB AUTOINCREMENT WITH REPLACE ESCAPE GLOB TRUE FALSE').split(' '));
  const FN = new Set(('COUNT SUM AVG MIN MAX UPPER LOWER LENGTH ROUND SUBSTR SUBSTRING TRIM LTRIM RTRIM ABS COALESCE IFNULL NULLIF ' +
    'CAST STRFTIME JULIANDAY TIME DATE_FORMAT NOW TOTAL GROUP_CONCAT INSTR PRINTF RANDOM TYPEOF UNICODE CHAR HEX IIF').split(' '));

  function highlight(text) {
    const re = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|("(?:[^"]|"")*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-zÁÉÍÓÚáéíóúÑñ_][\wÁÉÍÓÚáéíóúÑñ]*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(text))) {
      out += U.esc(text.slice(last, m.index));
      const t = U.esc(m[0]);
      if (m[1]) out += `<span class="tk-com">${t}</span>`;
      else if (m[2]) out += `<span class="tk-str">${t}</span>`;
      else if (m[3]) out += t;
      else if (m[4]) out += `<span class="tk-num">${t}</span>`;
      else if (m[5]) {
        const up = m[5].toUpperCase();
        const next = text.slice(re.lastIndex).match(/^\s*\(/);
        if (FN.has(up) && next) out += `<span class="tk-fn">${t}</span>`;
        else if (KW.has(up)) out += `<span class="tk-kw">${t}</span>`;
        else out += t;
      }
      last = re.lastIndex;
    }
    out += U.esc(text.slice(last));
    return out;
  }

  function create(host, opts) {
    opts = opts || {};
    host.innerHTML = '<div class="gutter" aria-hidden="true"><div class="gutter-inner"></div></div><pre aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>';
    const ta = host.querySelector('textarea');
    const pre = host.querySelector('pre');
    const gut = host.querySelector('.gutter-inner');
    ta.setAttribute('aria-label', opts.label || 'Editor SQL');
    if (opts.placeholder) ta.placeholder = opts.placeholder;
    let lines = 0;

    function paint() {
      const v = ta.value;
      pre.innerHTML = highlight(v) + (v.endsWith('\n') || !v ? ' ' : '');
      const n = v.split('\n').length;
      if (n !== lines) {
        lines = n;
        let g = '';
        for (let i = 1; i <= n; i++) g += '<div>' + i + '</div>';
        gut.innerHTML = g;
      }
      sync();
    }
    function sync() {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
      gut.style.transform = `translateY(${-ta.scrollTop}px)`;
    }
    function insert(text) {
      ta.focus();
      if (!document.execCommand || !document.execCommand('insertText', false, text)) {
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
        ta.selectionStart = ta.selectionEnd = s + text.length;
      }
      paint();
    }

    ta.addEventListener('input', () => { paint(); if (opts.onInput) opts.onInput(ta.value); });
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey && opts.onRunSelection) opts.onRunSelection(); else if (opts.onRun) opts.onRun();
        return;
      }
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); insert('  '); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf('\n') + 1);
        const indent = (line.match(/^\s*/) || [''])[0];
        if (indent) { e.preventDefault(); insert('\n' + indent); }
      }
    });

    const api = {
      textarea: ta,
      get value() { return ta.value; },
      set value(v) { ta.value = v || ''; ta.scrollTop = 0; paint(); },
      selection() { return ta.value.slice(ta.selectionStart, ta.selectionEnd); },
      focus() { ta.focus(); },
      insert,
      refresh: paint
    };
    if (opts.value) api.value = opts.value; else paint();
    return api;
  }

  window.CodeEditor = { create, highlight };
})();
