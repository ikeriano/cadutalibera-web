// Web pública: sin logos de las cadenas; el juego dibuja su propio emblema de huellas.
window.__LOGO_CL = null; window.__LOGO_AC = null;
window.__logoPref = function () { try { var v = localStorage.getItem('cl_logo'); return v === 'cl' || v === 'ac' ? v : 'auto'; } catch (e) { return 'auto'; } };
window.__logoQue = function (lang) { var p = window.__logoPref(); return p === 'auto' ? ((lang || window.__LANG) === 'es' ? 'ac' : 'cl') : p; };
window.__logoUrl = function () { return null; };
