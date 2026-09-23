/* DatAula: utilidades comunes. Creada por Juan Luis Torralbo Muñoz. */
(function () {
  'use strict';

  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.uid = function (prefix) {
    return (prefix || 'n') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  };

  U.toast = function (msg, kind, ms) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), ms || (kind === 'err' ? 6000 : 3200));
  };

  U.download = function (filename, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  U.readFile = function (file, asBuffer) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      if (asBuffer) r.readAsArrayBuffer(file); else r.readAsText(file);
    });
  };

  /* Pide un archivo al usuario mediante un <input type=file> oculto */
  U.pickFile = function (inputId) {
    return new Promise((resolve) => {
      const input = document.getElementById(inputId);
      input.value = '';
      input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
      input.click();
    });
  };

  U.storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : v;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* nada */ }
    }
  };

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  /* Convierte texto a un identificador SQL seguro: sin tildes ni espacios */
  U.sqlIdent = function (name) {
    let s = String(name || '').trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/gi, (m) => (m === 'ñ' ? 'n' : 'N'))
      .replace(/[^A-Za-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!s) s = 'sin_nombre';
    if (/^[0-9]/.test(s)) s = '_' + s;
    return s;
  };

  /* Uint8Array <-> base64 (para guardar la BD en el navegador) */
  U.u8ToB64 = function (u8) {
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(s);
  };
  U.b64ToU8 = function (b64) {
    const s = atob(b64);
    const u8 = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  };

  U.today = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  window.U = U;
})();
