/* =====================================================================================================
   «Mi cabecera 3D» · módulo común a todos los juegos de Iker (sin conexión: web y APK Android WebView)
   El vídeo ENTERO se convierte en una escena 3D: para cada fotograma, una IA de estimación de profundidad
   (Depth Anything V2 small, ONNX q4f16, onnxruntime-web WASM, incluida en mc3d/) calcula el relieve, y el
   fotograma se convierte en una malla desplazada / nube de puntos que se rueda con cámara 3D real
   (paralaje, luces, niebla, partículas, efectos). La descripción en castellano decide el estilo.
   Se guarda en IndexedDB y suena como intro al empezar el Programa completo.
   API: MC3D.config({app, nombre, logo, titulo}) · MC3D.fila(opc) · MC3D.abrir() · MC3D.introPrograma()
        MC3D.vistaPrevia() · MC3D.hay()
   ===================================================================================================== */
(function () {
  'use strict';
  if (window.MC3D) return;
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const BASE = SRC.replace(/[^/]*$/, '');
  const CFG = { app: 'juego', nombre: 'Mi programa', logo: null, titulo: null };
  const K = s => 'mc3d_' + CFG.app + '_' + s;

  // ------------------------------------------------------------------ descripción → estilo
  const COLORES = { rojo: '#ff2a2a', roja: '#ff2a2a', azul: '#2f6bff', verde: '#2fe07a', amarillo: '#ffd21a', amarilla: '#ffd21a', dorado: '#ffc21a', dorada: '#ffc21a', oro: '#ffc21a', naranja: '#ff8a1a', morado: '#a040ff', morada: '#a040ff', violeta: '#9a3aff', lila: '#c08aff', purpura: '#a040ff', rosa: '#ff4fb0', fucsia: '#ff2ad0', cian: '#1ae0ff', turquesa: '#1ae0d0', celeste: '#7ac8ff', blanco: '#ffffff', blanca: '#ffffff', plateado: '#c8d0e0', plata: '#c8d0e0', granate: '#a01030', esmeralda: '#10c070' };
  const has = (s, ...w) => w.some(x => new RegExp('(^|[^a-z])' + x + '([^a-z]|$)').test(s));
  function interpretar(desc) {
    const raw = String(desc || '');
    const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const p = { colores: [], estilo: 'normal', modo: 'solido', camaras: [], temblor: false, vel: 1, relieve: 1, efectos: [], logo: true, titulo: null, dur: 0, mudo: false, calidad: 'normal', luces: 0.35, entendido: [] };
    const E = (t) => p.entendido.push(t);
    for (const w0 of s.split(/[^a-z]+/)) { const w = [w0, w0.replace(/s$/, ''), w0.replace(/es$/, '')].find(x => COLORES[x]); if (w && !p.colores.includes(COLORES[w]) && !(w === 'blanco' && /blanco y negro/.test(s))) p.colores.push(COLORES[w]); }
    if (p.colores.length) E('colores ' + s.split(/[^a-z]+/).filter(w0 => [w0, w0.replace(/s$/, ''), w0.replace(/es$/, '')].some(x => COLORES[x])).filter(w => !(w === 'blanco' && /blanco y negro/.test(s))).join(' y '));
    if (/blanco y negro|\bb\/n\b|escala de grises|en gris/.test(s)) { p.estilo = 'bn'; E('blanco y negro'); }
    else if (has(s, 'sepia', 'antiguo', 'antigua', 'vintage', 'retro', 'viejo')) { p.estilo = 'sepia'; E('retro/sepia'); }
    else if (has(s, 'neon', 'fosforito', 'fluorescente', 'cyberpunk', 'futurista')) { p.estilo = 'neon'; E('neón'); }
    else if (has(s, 'calido', 'calida', 'atardecer', 'puesta de sol')) { p.estilo = 'calido'; E('tonos cálidos'); }
    else if (has(s, 'frio', 'fria', 'hielo', 'invierno')) { p.estilo = 'frio'; E('tonos fríos'); }
    else if (has(s, 'oscuro', 'oscura', 'noche', 'nocturno', 'terror', 'miedo', 'misterio')) { p.estilo = 'oscuro'; E('oscuro'); }
    if (has(s, 'cine', 'cinematografico', 'pelicula', 'peliculero', 'epico', 'epica')) { p.cine = true; E('cinematográfico'); }
    if (has(s, 'holograma', 'holografico', 'holografica')) { p.modo = 'holo'; E('holograma'); }
    else if (/nube de puntos|puntos|pixeles|particulas de la imagen/.test(s)) { p.modo = 'puntos'; E('nube de puntos'); }
    else if (has(s, 'malla', 'alambre', 'wireframe', 'reticula', 'cuadricula', 'matrix')) { p.modo = 'malla'; E('malla de alambre'); }
    const cams = [[/gir|vuelta|orbit|alrededor|360|rodea/, 'orbita', 'cámara que gira'], [/acerc|zoom|entra|avanz|hacia dentro|meter/, 'acercar', 'se acerca'], [/alej|hacia atras|retroced/, 'alejar', 'se aleja'], [/lateral|travelling|travel|desliz|de lado|barrido/, 'lateral', 'travelling lateral'], [/vuel|vola|dron|drone|sobrevol/, 'vuelo', 'vuelo de dron'], [/arriba|cenital|grua|picado|desde lo alto/, 'grua', 'grúa / cenital'], [/fija|quieta|estatic|sin mover/, 'fija', 'cámara fija']];
    const pos = [];
    for (const [re, m, t] of cams) { const r = s.search(re); if (r >= 0 && !(m === 'vuelo' && /vuelta/.test(s) && !/vuel[aeo]|volar|dron/.test(s.replace(/vuelta/g, '')))) pos.push([r, m, t]); }
    pos.sort((a, b) => a[0] - b[0]); for (const [, m, t] of pos) { p.camaras.push(m); E(t); }
    if (!p.camaras.length) p.camaras = ['acercar', 'orbita'];
    if (has(s, 'temblor', 'tiembla', 'terremoto', 'vibra', 'vibracion', 'sacudida') || /camara en mano/.test(s)) { p.temblor = true; E('temblor'); }
    if (/camara lenta|a camara lenta|muy lento|muy despacio/.test(s)) { p.vel = 0.5; E('cámara lenta'); }
    else if (has(s, 'lento', 'lenta', 'despacio', 'pausado', 'tranquilo', 'relajado')) { p.vel = 0.7; E('despacio'); }
    else if (/muy rapido|a toda velocidad|frenetico|x2/.test(s)) { p.vel = 1.8; E('muy rápido'); }
    else if (has(s, 'rapido', 'rapida', 'veloz', 'dinamico', 'dinamica', 'energico', 'cañero')) { p.vel = 1.35; E('rápido'); }
    if (/mucho relieve|muy 3d|exagerad|extrem|profundo|mucha profundidad|muy profundo/.test(s)) { p.relieve = 1.7; E('mucho relieve'); }
    else if (/poco relieve|sutil|poca profundidad|ligero/.test(s)) { p.relieve = 0.55; E('relieve suave'); }
    const efs = [[/chispa|fuegos? artificiales|bengala/, 'chispas'], [/nieve|nevando|copos/, 'nieve'], [/lluvia|lloviendo/, 'lluvia'], [/confeti|serpentina|fiesta|celebracion/, 'confeti'], [/estrella|espacio|galaxia|universo|cosmos/, 'estrellas'], [/burbuja/, 'burbujas'], [/glitch|interferencia|fallo|distorsion|error/, 'glitch'], [/niebla|humo|bruma|neblina/, 'niebla'], [/brillo|brilla|resplandor|bloom|destello|reluc|glow/, 'brillo'], [/vhs|tv antigua|tele antigua|television antigua|lineas/, 'vhs'], [/vineta|bordes oscuros/, 'vineta'], [/luces|focos|laser|discoteca|luz de colores/, 'luces'], [/explot|explosion|desintegr|romp|estalla|se deshace/, 'explosion'], [/fuego|llamas|ascuas/, 'fuego']];
    for (const [re, e] of efs) if (re.test(s)) { p.efectos.push(e); E(e); }
    if (p.efectos.includes('luces')) p.luces = 0.7;
    if (/sin logo|sin texto|sin titulo|sin letras|sin rotulo/.test(s)) { p.logo = false; E('sin logo ni texto'); }
    const q = raw.match(/[«"“']([^»"”']{1,60})[»"”']/) || raw.match(/(?:texto|t[ií]tulo|r[oó]tulo|que ponga|que diga|pon(?:ga)?)\s*:?\s*([^,.;\n]{1,60})/i);
    if (q && p.logo) { p.titulo = q[1].trim(); E('texto «' + p.titulo + '»'); }
    else if (p.logo && /logo/.test(s)) E('con el logo');
    const d = s.match(/(\d{1,3})\s*(s\b|seg)/); if (d) { p.dur = Math.max(3, Math.min(60, +d[1])); E(p.dur + ' s'); }
    if (/sin sonido|sin audio|silencio|mudo|sin musica/.test(s)) { p.mudo = true; E('sin sonido'); }
    if (/alta calidad|maxima calidad|mucho detalle|mas detalle|calidad alta/.test(s)) p.calidad = 'alta';
    else if (/conversion rapida|calidad baja|baja calidad|rapidito/.test(s)) p.calidad = 'rapida';
    return p;
  }

  // ------------------------------------------------------------------ IndexedDB
  let dbP = null;
  function db() {
    if (!dbP) dbP = new Promise((ok, ko) => { const r = indexedDB.open('mc3d_' + CFG.app, 1); r.onupgradeneeded = () => { r.result.createObjectStore('meta'); r.result.createObjectStore('frames'); }; r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
    return dbP;
  }
  async function tx(store, mode, fn) { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction(store, mode); const st = t.objectStore(store); let res; Promise.resolve(fn(st)).then(v => res = v); t.oncomplete = () => ok(res); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); }
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const getMeta = () => tx('meta', 'readonly', st => req(st.get('meta'))).catch(() => null);
  const getBlob = k => tx('meta', 'readonly', st => req(st.get(k))).catch(() => null);
  async function borrar() { await tx('meta', 'readwrite', st => st.clear()); await tx('frames', 'readwrite', st => st.clear()); }

  // ------------------------------------------------------------------ IA: análisis del vídeo (planos, cámara, color, textos OCR, logo, audio)
  const espera = (el, ev, ms) => new Promise((ok) => { const t = setTimeout(() => { el.removeEventListener(ev, f); ok(false); }, ms); const f = () => { clearTimeout(t); el.removeEventListener(ev, f); ok(true); }; el.addEventListener(ev, f); });
  let ocrP = null;
  function cargarOCR() {
    if (ocrP) return ocrP;
    ocrP = (async () => {
      if (!window.Tesseract) await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = BASE + 'ocr/tesseract.min.js'; s.onload = ok; s.onerror = () => ko(new Error('OCR no disponible')); document.head.appendChild(s); });
      return Tesseract.createWorker('spa', 1, { workerPath: BASE + 'ocr/worker.min.js', corePath: BASE + 'ocr/', langPath: BASE + 'ocr/', gzip: true, workerBlobURL: false, cacheMethod: 'none', logger: () => { } });
    })();
    ocrP.catch(() => { ocrP = null; });
    return ocrP;
  }
  const limpia = s => s.replace(/[|_~^`´¨<>{}\[\]\\]/g, ' ').replace(/\s+/g, ' ').trim();
  // OCR: preparación de la imagen (gris, contraste, ampliada x2 y texto oscuro sobre claro) y limpieza de palabras
  const pre = document.createElement('canvas');
  function prepOCR(g, w, h, out) {
    const W2 = Math.min(1920, w * 2), H2 = Math.round(h * W2 / w); out.width = W2; out.height = H2; const o = out.getContext('2d', { willReadFrequently: true });
    o.imageSmoothingQuality = 'high'; o.drawImage(g.canvas, 0, 0, W2, H2); const id = o.getImageData(0, 0, W2, H2), d = id.data;
    const hist = new Uint32Array(256); for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; d[i] = l; hist[l]++; }
    let n = 0, lo = 0, hi = 255; const N = d.length / 4; for (let i = 0; i < 256; i++) { n += hist[i]; if (n < N * 0.02) lo = i; if (n < N * 0.98) hi = i; }
    const k = 255 / Math.max(1, hi - lo); for (let i = 0; i < d.length; i += 4) { let l = (d[i] - lo) * k; l = l < 0 ? 0 : l > 255 ? 255 : l; l = 255 - l; l = l < 110 ? l * 0.5 : l > 170 ? 255 : l; d[i] = d[i + 1] = d[i + 2] = l; }
    o.putImageData(id, 0, 0);
  }
  function prepRotulo(g, w, h, out) { // tercio inferior: rótulos de créditos (texto blanco sobre píldora de color)
    const y0 = Math.round(h * 0.55), hh = h - y0, k = Math.min(3, 2400 / w); out.width = Math.round(w * k); out.height = Math.round(hh * k);
    const o = out.getContext('2d', { willReadFrequently: true }); o.imageSmoothingQuality = 'high'; o.drawImage(g.canvas, 0, y0, w, hh, 0, 0, out.width, out.height);
    const id = o.getImageData(0, 0, out.width, out.height), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = Math.min(d[i], d[i + 1], d[i + 2]); d[i] = d[i + 1] = d[i + 2] = v > 185 ? 0 : 255; } o.putImageData(id, 0, 0);
  }
  // pequeño diccionario de créditos de tele para corregir palabras mal leídas (distancia de edición)
  const DICC = 'presentador presentadora copresentador co-presentador presentado presentada juego creado creada con por de del la el los las y sonido musica música programa original originales antena versiones versión version similares plataforma virtual campeón campeon dirección direccion produccion producción realizacion realización guion guión edicion edición montaje camara cámara iluminacion iluminación decorados vestuario maquillaje regidor regidora concursante concursantes invitado invitada invitados colaborador colaboradora colaboradores especial nochebuena navidad nochevieja halloween verano temporada estreno gran final muy pronto nuevo nueva esta noche lunes martes miercoles miércoles jueves viernes sabado sábado domingo agradecimientos gracias basado basada minijuego scratch formato ahora caigo studio estudio roblox showtime españa juego'.split(' ');
  const DN = DICC.map(w => [w, w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]);
  const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let pr = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cu = [i]; for (let j = 1; j <= n; j++) cu[j] = Math.min(pr[j] + 1, cu[j - 1] + 1, pr[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); pr = cu; } return pr[n]; };
  function corrige(w) { // devuelve [palabra corregida, encontrada en el diccionario]
    const base = w.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ-]/g, ''); if (base.length < 3) return [w, false];
    const n = base.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let best = null, bd = 9; for (const [orig, nn] of DN) { const d = lev(n, nn); if (d < bd) { bd = d; best = orig; } }
    const lim = n.length >= 8 ? 2 : n.length >= 5 ? 1 : 0;
    if (best && bd <= lim) { let r = best; if (/^[A-ZÁÉÍÓÚÑ]/.test(base)) r = r[0].toUpperCase() + r.slice(1); if (base === base.toUpperCase() && base.length > 1) r = r.toUpperCase(); return [w.replace(base, r), true]; }
    return [w, false];
  }
  const CORTAS = new Set(['y', 'a', 'o', 'e', 'u', 'de', 'la', 'el', 'en', 'tu', 'tv', 'mi', 'si', 'ya', 'al', 'lo', 'es', 'un', 'hd', 'no', 'se', 'te', 'me', 'le', 'su', 'yo', 'va', 'ha', 'he', 'ir', 'ni', 'os', 'nos', 'los', 'las', 'del', 'por', 'con', 'que', 'una', 'mas', 'muy', 'hoy', 'sin', 'sus', 'ver', 'dia', 'pre', 'ya']);
  const limpiaPal = w => w.replace(/^[^\wÁÉÍÓÚÑáéíóúñ¡¿#@(«"]+|[^\wÁÉÍÓÚÑáéíóúñ!?)»".,:]+$/g, '').replace(/[|_]{2,}/g, '');
  function palabraOK(t, c) {
    const w = limpiaPal(t || ''); if (!w) return false;
    const letras = (w.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g) || []).length; if (letras / w.length < 0.7) return false;
    const n = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (n.length <= 3 && !CORTAS.has(n) && !/^\d+$/.test(n)) return c >= 93 && /^[A-Z]/.test(w) && n.length === 3;
    if (/(.)\1\1/.test(n)) return false; // «lll», «ooo»: basura típica del OCR
    if (!/[aeiouy]/.test(n) && !/^\d+$/.test(n) && !/[_0-9]/.test(w)) return false; // sin vocales: no es castellano
    if (corrige(w)[1]) return true;
    if (/[_]|[a-z][A-Z]/.test(w) && n.length >= 6) return c >= 35; // nombres de usuario: Only_Marco, MikeyTheCat_Official
    return c >= (n.length >= 6 ? 55 : 70);
  }
  const conj = s => new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9_]+/).filter(Boolean));
  const jac = (a, b) => { const A = conj(a), B = conj(b); let i = 0; A.forEach(x => B.has(x) && i++); return i / Math.max(1, A.size + B.size - i); };
  function juntaVistas(vistas) { // una línea vale si se lee en 2 fotogramas del plano (o una vez con mucha confianza)
    const todas = vistas.flatMap((L, f) => L.map((l, i) => ({ ...l, f, i }))), out = [];
    for (const l of todas.slice().sort((a, b) => b.c - a.c)) {
      if (out.some(o => jac(o.txt, l.txt) >= 0.5)) continue;
      const vistoEn = new Set(todas.filter(o => jac(o.txt, l.txt) >= 0.5).map(o => o.f));
      if (vistoEn.size >= 2 || l.c >= 75) out.push(l);
    }
    return out.sort((a, b) => a.f - b.f || a.i - b.i);
  }
  async function analizar(file, desc, onProg, cancel) {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url; v.setAttribute('playsinline', '');
    v.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px'; document.body.appendChild(v);
    const t0 = performance.now();
    try {
      if (!(await espera(v, 'loadedmetadata', 15000)) && !v.videoWidth) throw new Error('No puedo leer ese vídeo. Prueba con un MP4 (H.264).');
      if (!v.videoWidth) await espera(v, 'loadeddata', 8000);
      const dur0 = isFinite(v.duration) && v.duration > 0 ? v.duration : 20, dur = Math.min(dur0, 90);
      const FPS = 5, n = Math.max(2, Math.floor(dur * FPS)), W = 64, H = 36;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
      const big = document.createElement('canvas'); big.width = Math.min(960, v.videoWidth); big.height = Math.round(big.width * v.videoHeight / v.videoWidth); const gb = big.getContext('2d', { willReadFrequently: true });
      const fr = []; let prev = null;
      const sad = (a, b, dx, dy, s) => { let e = 0, k = 0; for (let y = 4; y < H - 4; y += 2) for (let x = 4; x < W - 4; x += 2) { const xs = Math.round((x - W / 2) * s + W / 2 + dx), ys = Math.round((y - H / 2) * s + H / 2 + dy); if (xs < 0 || ys < 0 || xs >= W || ys >= H) continue; e += Math.abs(a[y * W + x] - b[ys * W + xs]); k++; } return e / Math.max(1, k); };
      for (let i = 0; i < n; i++) {
        if (cancel && cancel.no) throw new Error('cancelado');
        v.currentTime = Math.min(dur0 - 0.05, i / FPS + 0.01); await espera(v, 'seeked', 4000);
        g.drawImage(v, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data;
        const gr = new Float32Array(W * H), hist = new Float32Array(64); let R = 0, G = 0, B = 0, L = 0, S = 0;
        for (let k = 0; k < W * H; k++) { const r = d[k * 4], gg = d[k * 4 + 1], b = d[k * 4 + 2]; const l = 0.299 * r + 0.587 * gg + 0.114 * b; gr[k] = l; L += l; R += r; G += gg; B += b; S += Math.max(r, gg, b) - Math.min(r, gg, b); hist[(r >> 6) * 16 + (gg >> 6) * 4 + (b >> 6)]++; }
        const N = W * H; for (let k = 0; k < 64; k++) hist[k] /= N;
        const f = { t: i / FPS, luz: L / N, rgb: [R / N, G / N, B / N], sat: S / N, hist, gr, dx: 0, dy: 0, ds: 1, corte: false };
        if (prev) {
          let hd = 0; for (let k = 0; k < 64; k++) hd += Math.abs(hist[k] - prev.hist[k]);
          let best = [1e9, 0, 0, 1];
          for (const s of [0.96, 1, 1.04]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const e = sad(prev.gr, gr, dx, dy, s); if (e < best[0]) best = [e, dx, dy, s]; }
          f.dx = best[1]; f.dy = best[2]; f.ds = best[3]; f.err = best[0]; f.hd = hd;
          f.corte = hd > 0.55 || best[0] > 38;
          f.flash = f.luz - prev.luz > 45;
        }
        fr.push(f); prev = f;
        onProg && onProg({ f: (i + 1) / n * 0.55, txt: `Analizando planos y movimientos de cámara: ${i + 1} de ${n}`, img: (i % 5 === 0) ? (gb.drawImage(v, 0, 0, big.width, big.height), big) : null });
      }
      // planos (cortes con duración mínima 0,6 s)
      const planos = []; let ini = 0;
      for (let i = 1; i <= fr.length; i++) if (i === fr.length || (fr[i].corte && fr[i].t - fr[ini].t >= 0.6)) { planos.push(fr.slice(ini, i)); ini = i; }
      const tomas = planos.map((P, k) => {
        const m = (key) => P.slice(1).reduce((s, f) => s + f[key], 0) / Math.max(1, P.length - 1);
        const t0p = P[0].t, t1p = k + 1 < planos.length ? planos[k + 1][0].t : dur;
        return { t0: t0p, t1: t1p, dx: m('dx'), dy: m('dy'), ds: P.length > 1 ? P.slice(1).reduce((s, f) => s + (f.ds - 1), 0) / (P.length - 1) : 0, luz: P.reduce((s, f) => s + f.luz, 0) / P.length, rgb: [0, 1, 2].map(j => P.reduce((s, f) => s + f.rgb[j], 0) / P.length), sat: P.reduce((s, f) => s + f.sat, 0) / P.length, flash: P.some(f => f.flash), textos: [], logo: false };
      });
      // OCR de textos y títulos (un fotograma por plano)
      let ocr = null; try { onProg && onProg({ f: 0.57, txt: 'Cargando la IA de lectura de textos (OCR)…' }); ocr = await cargarOCR(); } catch (e) { console.warn('[MC3D] OCR', e); }
      const palabrasLogo = (CFG.palabrasLogo || String(CFG.nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(w => w.length > 2)).concat(['ahora', 'caigo', 'caduta', 'libera', 'pasapalabra', 'cazador', 'millonario', 'boom', 'acerte', 'caia', 'atrapa']); // el vídeo puede ser de otro juego de la familia
      for (let k = 0; k < tomas.length; k++) {
        if (cancel && cancel.no) throw new Error('cancelado');
        const T = tomas[k]; if (!ocr) break;
        const vistas = []; // líneas leídas en cada fotograma: se juntan los fotogramas seguidos del mismo plano
        for (const fr2 of [0.3, 0.55, 0.8]) {
          v.currentTime = Math.min(dur0 - 0.05, T.t0 + (T.t1 - T.t0) * fr2); await espera(v, 'seeked', 4000);
          gb.drawImage(v, 0, 0, big.width, big.height);
          for (const modo of fr2 === 0.55 ? ['rotulo', 'entero'] : ['rotulo']) {
            if (modo === 'rotulo') prepRotulo(gb, big.width, big.height, pre); else prepOCR(gb, big.width, big.height, pre);
            try {
              const r = await ocr.recognize(pre); const lin = [];
              for (const ln of (r.data.lines || [])) {
                const ws = (ln.words || []).filter(w => palabraOK(w.text, w.confidence)).map(w => { const [t, dic] = corrige(limpiaPal(w.text)); return { t, c: dic ? Math.max(w.confidence, 80) : w.confidence }; });
                if (ws.length && ws.reduce((a, w) => a + w.c, 0) / ws.length >= 55 && ws.map(w => w.t).join('').length >= 3) lin.push({ txt: ws.map(w => w.t).join(' '), c: ws.reduce((a, w) => a + w.c, 0) / ws.length, crudo: limpia(ln.text), modo });
              }
              vistas.push(lin);
            } catch (e) { vistas.push([]); }
          }
          onProg && onProg({ f: 0.57 + 0.35 * (k + fr2) / tomas.length, txt: `Leyendo textos y logos (OCR): plano ${k + 1} de ${tomas.length}`, img: pre });
        }
        T.crudo = vistas.flat().map(l => l.crudo);
        const jv = juntaVistas(vistas);
        T.rot = jv.filter(o => o.modo === 'rotulo'); T.textos = jv.filter(o => o.modo !== 'rotulo').map(o => o.txt);
        const norm = T.crudo.concat(T.textos).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        T.logo = palabrasLogo.length > 0 && palabrasLogo.some(w => norm.includes(w));
        if (T.logo) T.textos = T.textos.filter(x => !palabrasLogo.some(w => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(w)));
      }
      // textos fijos en pantalla (mosca, «muy pronto», hashtag…): palabras que salen en muchos planos se quitan de los rótulos
      const nw = w => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9#_]/g, '');
      const nl = x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const dl = {}; tomas.forEach(T => new Set((T.rot || []).map(o => nl(o.txt))).forEach(x => dl[x] = (dl[x] || 0) + 1));
      const df = {}; tomas.forEach(T => new Set(T.textos.join(' ').split(/\s+/).map(nw).filter(w => w.length > 1)).forEach(w => df[w] = (df[w] || 0) + 1));
      const fija = w => tomas.length >= 3 && (df[nw(w)] || 0) >= Math.max(2, tomas.length * 0.3);
      let hashtagV = null;
      for (const T of tomas) {
        for (const x of T.textos) { const h = x.match(/#\s?[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]{4,}/); if (h && !hashtagV) hashtagV = h[0].replace(/\s/g, ''); }
        const lim = T.textos.map(x => x.split(/\s+/).filter(w => !/^#/.test(w) && !fija(w) && /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]{2}/.test(w)).join(' ')).filter(x => (x.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length >= 4);
        // rótulos del tercio inferior: se quitan solo líneas enteras que se repiten en muchos planos (mosca, «muy pronto»)
        const rot = (T.rot || []).filter(o => !(tomas.length >= 3 && dl[nl(o.txt)] >= Math.max(2, tomas.length * 0.3)) && (o.txt.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length >= 5 && !/^#/.test(o.txt));
        // cada fotograma con rótulo = un rótulo (título + nombre); varios rótulos distintos en el mismo plano salen uno tras otro
        const grupos = []; for (const f of [...new Set(rot.map(o => o.f))].sort()) { const tx = rot.filter(o => o.f === f).map(o => o.txt).join(' ').replace(/\s+/g, ' ').slice(0, 60); if (!grupos.some(g => jac(g, tx) >= 0.5)) grupos.push(tx); }
        T.textos = grupos.length ? grupos : lim.length ? [lim.join(' ').slice(0, 60)] : [];
      }
      // audio: golpes (picos de energía) para sincronizar cortes, luces y efectos
      let golpes = [], audio = file.size >= 120e6;
      try {
        onProg && onProg({ f: 0.94, txt: 'Analizando la música y el sonido…' });
        if (file.size < 120e6) {
          const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC();
          const buf = await new Promise((ok, ko) => { file.arrayBuffer().then(ab => ctx.decodeAudioData(ab, ok, ko)).catch(ko); });
          const ch = buf.getChannelData(0), hop = Math.round(buf.sampleRate * 0.02), env = [];
          for (let i = 0; i + hop < ch.length; i += hop) { let e = 0; for (let j = 0; j < hop; j += 4) e += ch[i + j] * ch[i + j]; env.push(Math.sqrt(e / (hop / 4))); }
          const mean = env.reduce((a, b) => a + b, 0) / env.length; let ult = -1;
          for (let i = 12; i < env.length; i++) { let loc = 0; for (let j = i - 12; j < i; j++) loc += env[j]; loc /= 12; if (env[i] > loc * 1.7 && env[i] > mean * 1.1 && i - ult > 12) { golpes.push(+(i * 0.02).toFixed(2)); ult = i; } }
          let pico = 0; for (const x of env) if (x > pico) pico = x; audio = mean > 0.002 && pico > 0.01; ctx.close && ctx.close();
        }
      } catch (e) { console.warn('[MC3D] audio (sin pista de sonido)', e); audio = false; }
      const guion = { v: 2, nombre: file.name || 'vídeo', desc, dur, hashtag: hashtagV, w: v.videoWidth, h: v.videoHeight, tomas, golpes, audio, fecha: Date.now(), seg: Math.round((performance.now() - t0) / 1000) };
      await borrar();
      if (file.size < 200e6) await tx('meta', 'readwrite', st => st.put(file, 'video')); else guion.audio = false;
      await tx('meta', 'readwrite', st => st.put(guion, 'meta'));
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
      return guion;
    } finally { v.removeAttribute('src'); v.load(); v.remove(); URL.revokeObjectURL(url); }
  }

  // ------------------------------------------------------------------ guion → plan de rodaje en el plató 3D del juego
  const SUJETOS = { publico: /public|grada|espectador|gente|audiencia/, concursantes: /concursant|oponent|jugador|participant|rival/, presentador: /presentador|presentadora|host/, logo: /logo|titulo del programa|rotulo grande/, plato: /plato|escenario|set|estudio|trampilla|huella/ };
  function plan(guion, desc) {
    const p = interpretar(desc != null ? desc : guion.desc), s = String(desc != null ? desc : guion.desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const pide = Object.keys(SUJETOS).filter(k => SUJETOS[k].test(s));
    const ciclo = pide.length ? pide.concat(['plato', 'concursantes', 'publico']) : ['plato', 'concursantes', 'publico', 'plato', 'concursantes', 'presentador'];
    const camDesc = p.camaras.slice(); let ci = 0, si = 0;
    const tomas = guion.tomas.map((T, k) => {
      const ax = Math.abs(T.dx), ay = Math.abs(T.dy), az = Math.abs(T.ds) * 60;
      let mov = 'orbita', dir = 1;
      if (az > 0.9 && az >= ax && az >= ay) mov = T.ds > 0 ? 'acercar' : 'alejar';
      else if (ax > 0.25 && ax >= ay) { mov = 'lateral'; dir = T.dx > 0 ? -1 : 1; }
      else if (ay > 0.25) { mov = 'grua'; dir = T.dy > 0 ? -1 : 1; }
      else if (ax + ay < 0.08) mov = 'fija';
      if (/camara|gir|acerc|alej|lateral|dron|vuel|grua|cenital/.test(s) && camDesc.length && !(p.camaras.length === 2 && p.camaras[0] === 'acercar' && p.camaras[1] === 'orbita' && !/acerc|gir/.test(s))) mov = camDesc[ci++ % camDesc.length];
      const sujeto = T.logo ? 'logo' : ciclo[si++ % ciclo.length];
      return { t0: T.t0 / p.vel, t1: T.t1 / p.vel, mov, dir, vel: p.vel * (1 + Math.min(1.5, ax + ay + az) * 0.4), sujeto, textos: T.textos.slice(0, 3), flash: T.flash, rgb: T.rgb, luz: T.luz };
    });
    if (/logo al final|termina con el logo|acaba con el logo/.test(s) || (p.logo && !tomas.some(t => t.sujeto === 'logo') && tomas.length)) tomas[tomas.length - 1].sujeto = 'logo';
    if (/empieza con el logo|logo al principio/.test(s) && tomas.length) tomas[0].sujeto = 'logo';
    // textos: los del vídeo (OCR) + el de la descripción; si no hay ninguno, los créditos del juego
    const banners = [];
    tomas.forEach(t => { const n = t.textos.length, seg = (t.t1 - t.t0) / Math.max(1, n); t.textos.forEach((x, j) => banners.push({ t: t.t0 + seg * j + 0.3, txt: x, dur: Math.max(1600, Math.min(3500, seg * 1000 - 400)) })); });
    if (p.titulo) banners.push({ t: Math.max(0.5, (tomas.length ? tomas[tomas.length - 1].t0 : 1) + 0.4), txt: p.titulo, dur: 3000 });
    if (!banners.length && CFG.creditos) { const cr = CFG.creditos() || []; const usable = tomas.filter(t => t.sujeto !== 'logo' && t.t1 - t.t0 > 1); usable.slice(0, cr.length).forEach((t, k) => banners.push({ t: t.t0 + 0.3, txt: cr[k], dur: Math.max(1800, Math.min(3200, (t.t1 - t.t0) * 1000 - 300)) })); }
    const tag = (String(desc != null ? desc : guion.desc || '').match(/#[\wÁÉÍÓÚÑáéíóúñ]+/) || [])[0];
    const espec = [['nochebuena', 'nochebuena'], ['navidad', 'navidad'], ['nochevieja', 'findeano'], ['fin de ano', 'findeano'], ['halloween', 'halloween'], ['verano', 'verano'], ['carnaval', 'carnaval'], ['prime time', 'primetime'], ['primetime', 'primetime'], ['ninos', 'ninos'], ['infantil', 'ninos']].find(([k]) => s.includes(k));
    const look = p.estilo === 'oscuro' ? 'morado' : p.colores.length ? (/#(ff|c0|a0|9a)/i.test(p.colores[0]) && /a040ff|9a3aff|c08aff|ff4fb0|ff2ad0/.test(p.colores.join()) ? 'morado' : /2f6bff|1ae0ff|1ae0d0|7ac8ff/.test(p.colores.join()) ? 'cian' : /ffffff|c8d0e0/.test(p.colores.join()) ? 'blanco' : null) : null;
    return { dur: guion.dur / p.vel, vel: p.vel, tomas, banners, golpes: (guion.golpes || []).map(x => x / p.vel), hashtag: tag || (espec && CFG.hashtag ? CFG.hashtag(espec[1]) : null) || guion.hashtag || (CFG.hashtag ? CFG.hashtag(null) : null) || CFG.hashtagDef || ('#' + String(CFG.nombre).replace(/[^\wÁÉÍÓÚÑáéíóúñ]/g, '') + (espec ? espec[1][0].toUpperCase() + espec[1].slice(1) : '')), especial: espec && espec[1], efectos: p.efectos, look, mudo: p.mudo || !guion.audio, sinPista: !p.mudo && !guion.audio, colores: p.colores, p };
  }
  async function reproducir(opc = {}) {
    const guion = await getMeta(); if (!guion || guion.v !== 2) return false;
    if (!CFG.recrear) { alert('Este juego todavía no tiene plató para recrear la cabecera.'); return false; }
    const pl = plan(guion, opc.desc);
    const vid = pl.mudo ? null : await getBlob('video'); let audio = vid ? URL.createObjectURL(vid) : null, propio = !!audio;
    // vídeo sin pista de audio o en silencio: suena la sintonía del propio juego
    if (!audio && pl.sinPista && CFG.sintonia) { try { let u = typeof CFG.sintonia === 'function' ? await CFG.sintonia() : CFG.sintonia; if (u instanceof Blob) { u = URL.createObjectURL(u); propio = true; } if (u) { audio = u; pl.sintonia = true; } } catch (e) { console.warn('[MC3D] sintonía', e); } }
    PISTA_SINT = !!pl.sintonia; document.body.dataset.mc3d = '1'; try { await CFG.recrear(pl, { audio, sintonia: !!pl.sintonia, sintoniaJuego: (!audio && pl.sinPista && CFG.sintoniaJuego) ? CFG.sintoniaJuego : null, ctx: opc.ctx || null, preview: !!opc.preview }); } finally { delete document.body.dataset.mc3d; if (audio && propio) setTimeout(() => URL.revokeObjectURL(audio), 1000); }
    return true;
  }
  /** reproductor de audio sincronizado para los adaptadores de cada juego */
  let PISTA_SINT = false;
  function pista(url, vel) {
    const t0 = performance.now(); let a = null;
    if (url) { a = new Audio(url); a.playbackRate = vel || 1; a.preservesPitch = false; a.loop = !!PISTA_SINT; a.play().catch(() => { a = null; }); }
    return { t: () => a && !a.paused && !a.ended && a.currentTime > 0 ? a.currentTime / (vel || 1) : (performance.now() - t0) / 1000, parar: () => { try { a && a.pause(); } catch (e) { } }, el: () => a };
  }
  // ------------------------------------------------------------------ interfaz (Opciones › Mi cabecera 3D)
  const modoIntro = () => localStorage.getItem(K('modo')) || 'antes';
  function css() {
    if (document.getElementById('mc3dCss')) return;
    const st = document.createElement('style'); st.id = 'mc3dCss';
    st.textContent = `#mc3dPanel{position:fixed;inset:0;z-index:2147482000;background:#000b;display:flex;align-items:center;justify-content:center;font:15px system-ui,sans-serif;color:#fff}
#mc3dPanel .cj{width:min(640px,94vw);max-height:92vh;overflow:auto;background:linear-gradient(#16203f,#0a0f22);border:2px solid #ffc21a;border-radius:18px;padding:18px 20px;box-shadow:0 10px 50px #000}
#mc3dPanel h2{margin:0 0 6px;font-size:22px}#mc3dPanel p{margin:6px 0;line-height:1.35}#mc3dPanel .sm{font-size:13px;opacity:.8}
#mc3dPanel button{font:700 15px system-ui;padding:9px 16px;margin:4px 6px 4px 0;border-radius:20px;border:2px solid #ffc21a88;background:#ffffff14;color:#fff;cursor:pointer}
#mc3dPanel button.g{background:#ffc21a;color:#1a1000;border-color:#ffc21a}#mc3dPanel button.sel{background:#ffc21a44;border-color:#ffc21a}#mc3dPanel button:disabled{opacity:.45}
#mc3dPanel textarea{width:100%;box-sizing:border-box;min-height:84px;border-radius:12px;border:2px solid #ffffff33;background:#0006;color:#fff;font:15px system-ui;padding:10px}
#mc3dPanel .chips button{font-size:13px;padding:5px 10px;border-width:1px}#mc3dPanel .bar{height:12px;border-radius:6px;background:#ffffff22;overflow:hidden;margin:8px 0}#mc3dPanel .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffc21a,#ff6a1a)}
#mc3dPanel .vis{display:flex;gap:8px;margin:6px 0}#mc3dPanel .vis canvas{width:48%;border-radius:8px;background:#000}`;
    document.head.appendChild(st);
  }
  async function abrir() {
    css();
    const cerrarPrevio = document.getElementById('mc3dPanel'); if (cerrarPrevio) cerrarPrevio.remove();
    const pn = document.createElement('div'); pn.id = 'mc3dPanel';
    const meta = await getMeta();
    const descG = localStorage.getItem(K('desc')) || (meta && meta.desc) || '';
    pn.innerHTML = `<div class="cj"><h2>🎥 Mi cabecera 3D</h2>
<p class="sm">Sube un vídeo y describe cómo lo quieres. La IA analiza el vídeo (planos y cortes, movimientos de cámara, ritmo, colores, textos y títulos con OCR, cuándo sale el logo y la música) y <b>lo vuelve a rodar entero en 3D en el plató del juego</b>: los mismos planos y movimientos de cámara, los títulos en rótulos, el logo en 3D y el audio original de fondo. Funciona sin conexión y se guarda en este dispositivo. Sale al empezar el Programa completo.</p>
<p><button class="g" data-a="elegir">📁 Elegir vídeo</button><span data-k="arch" class="sm">${meta ? 'Guardada: ' + esc(meta.nombre) + (meta.v === 2 ? ' · ' + meta.tomas.length + ' planos · ' + meta.dur.toFixed(1) + ' s' : ' (versión anterior: vuelve a convertirla)') : 'Ningún vídeo todavía'}</span></p>
<input type="file" accept="video/*" style="display:none">
<p><b>¿Cómo la quieres?</b></p><textarea placeholder="Ej.: especial Nochebuena, la cámara vuela por el plató y enseña al público y a los concursantes, luces moradas, termina con el logo, #AhoraCaigoNochebuena y el texto «¡Esta noche, gran final!»">${esc(descG)}</textarea>
<div class="chips" data-k="chips"></div>
<p class="sm" data-k="ent"></p>
<p><button class="g" data-a="conv">✨ Recrear en 3D con IA</button><button data-a="cancel" style="display:none">✖ Cancelar</button></p>
<div data-k="prog" style="display:none"><div class="bar"><i></i></div><p class="sm" data-k="ptxt"></p><div class="vis"><canvas data-k="vc"></canvas></div></div>
<div data-k="txts"></div>
<p><button data-a="ver" ${meta ? '' : 'disabled'}>▶️ Vista previa</button><button data-a="guardar" ${meta ? '' : 'disabled'}>💾 Guardar descripción y rótulos</button><button data-a="borrar" ${meta ? '' : 'disabled'}>🗑 Borrar</button></p>
<p>Al empezar el Programa completo: <span data-k="modo"></span></p>
<p style="text-align:right"><button class="g" data-a="cerrar">Cerrar</button></p></div>`;
    document.body.appendChild(pn);
    const $ = s => pn.querySelector(s), ta = $('textarea'), inp = $('input');
    pn.addEventListener('click', e => e.stopPropagation()); pn.addEventListener('keydown', e => e.stopPropagation()); pn.addEventListener('keyup', e => e.stopPropagation());
    const ent = () => { const p = interpretar(ta.value); $('[data-k=ent]').textContent = 'La IA ha entendido: ' + (p.entendido.length ? p.entendido.join(' · ') : 'estilo por defecto (se acerca y gira, colores del vídeo)'); };
    ta.oninput = ent; ent();
    // textos que ha leído la IA en cada plano: se pueden corregir, borrar o añadir antes de rodar
    const pintaTextos = (m) => {
      const z = $('[data-k=txts]'); z.innerHTML = ''; if (!m || m.v !== 2) return;
      const h = document.createElement('p'); h.innerHTML = '<b>Rótulos detectados en el vídeo</b> <span class="sm">(corrígelos, bórralos o escribe uno nuevo; vacío = sin rótulo)</span>'; z.appendChild(h);
      m.tomas.forEach((T, k) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;align-items:center;margin:3px 0';
        const l = document.createElement('span'); l.className = 'sm'; l.style.cssText = 'min-width:92px'; l.textContent = `Plano ${k + 1} · ${T.t0.toFixed(1)} s${T.logo ? ' 🅻' : ''}`;
        const i = document.createElement('input'); i.type = 'text'; i.value = (T.textos || []).join(' | '); i.title = 'Separa con | varios rótulos del mismo plano'; i.placeholder = '(sin rótulo)'; i.dataset.k = k; i.style.cssText = 'flex:1;border-radius:8px;border:1px solid #ffffff44;background:#0006;color:#fff;padding:6px 8px;font:14px system-ui';
        i.onkeydown = e => e.stopPropagation(); r.append(l, i); z.appendChild(r); });
      const hb = document.createElement('p'); hb.innerHTML = '<span class="sm">Hashtag:</span> '; const hi = document.createElement('input'); hi.type = 'text'; hi.value = m.hashtag || ''; hi.placeholder = '(el del especial)'; hi.dataset.h = '1'; hi.style.cssText = 'border-radius:8px;border:1px solid #ffffff44;background:#0006;color:#fff;padding:6px 8px;font:14px system-ui'; hi.onkeydown = e => e.stopPropagation(); hb.appendChild(hi); z.appendChild(hb);
    };
    const guardaTextos = async () => { const m = await getMeta(); if (!m || m.v !== 2) return m; pn.querySelectorAll('[data-k=txts] input[data-k]').forEach(i => { const T = m.tomas[+i.dataset.k]; const v = i.value.trim(); T.textos = v ? v.split('|').map(x => x.trim()).filter(Boolean) : []; }); const hi = pn.querySelector('[data-k=txts] input[data-h]'); if (hi) m.hashtag = hi.value.trim() || null; m.desc = ta.value; await tx('meta', 'readwrite', st => st.put(m, 'meta')); return m; };
    pintaTextos(meta);

    for (const c of ['especial Nochebuena', 'especial Navidad', 'Halloween', 'gran final', 'enseña al público', 'enseña a los concursantes', 'el presentador', 'la cámara vuela por el plató', 'gira alrededor', 'se acerca', 'travelling lateral', 'desde arriba', 'luces moradas', 'luces azules', 'termina con el logo', 'empieza con el logo', 'confeti', 'fuegos artificiales', 'cámara lenta', 'rápido', 'sin sonido']) { const b = document.createElement('button'); b.textContent = '+ ' + c; b.onclick = () => { ta.value = (ta.value.trim() ? ta.value.trim().replace(/[.,]$/, '') + ', ' : '') + c; ent(); }; $('[data-k=chips]').appendChild(b); }
    let cal = localStorage.getItem(K('cal')) || 'normal';
    const grupo = (k, ops, val, set) => { const z = $(`[data-k=${k}]`); z.innerHTML = ''; for (const [v, t] of ops) { const b = document.createElement('button'); b.textContent = t; b.className = v === val ? 'sel' : ''; b.onclick = () => { set(v); z.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); }; z.appendChild(b); } };
    grupo('modo', [['antes', 'Antes de la cabecera'], ['sustituye', 'En lugar de la cabecera'], ['no', 'No sale']], modoIntro(), v => localStorage.setItem(K('modo'), v));
    let file = null, cancel = null;
    $('[data-a=elegir]').onclick = () => inp.click();
    inp.onchange = () => { file = inp.files[0]; if (file) $('[data-k=arch]').textContent = ' ' + file.name + ' (' + (file.size / 1e6).toFixed(1) + ' MB) · pulsa «Convertir»'; };
    pn.__setFile = f => { file = f; $('[data-k=arch]').textContent = ' ' + f.name; };
    const botones = on => pn.querySelectorAll('[data-a=conv],[data-a=ver],[data-a=borrar],[data-a=elegir],[data-a=guardar]').forEach(b => b.disabled = !on);
    $('[data-a=conv]').onclick = async () => {
      if (!file) { inp.click(); return; }
      const desc = ta.value;
      localStorage.setItem(K('desc'), ta.value);
      botones(false); $('[data-a=cancel]').style.display = ''; $('[data-k=prog]').style.display = ''; cancel = { no: false };
      const vc = $('[data-k=vc]');
      try {
        const m = await analizar(file, desc, pr => {
          $('.bar i').style.width = Math.round(pr.f * 100) + '%'; $('[data-k=ptxt]').textContent = pr.txt;
          if (pr.img) { vc.width = pr.img.width; vc.height = pr.img.height; vc.getContext('2d').drawImage(pr.img, 0, 0); } if (false) { vc.width = pr.img.width; vc.height = pr.img.height; vc.getContext('2d').drawImage(pr.img, 0, 0); vd.width = pr.dw; vd.height = pr.dh; const g = vd.getContext('2d'), id = g.createImageData(pr.dw, pr.dh); for (let k = 0; k < pr.dep.length; k++) { const x = pr.dep[k]; id.data[k * 4] = Math.min(255, x * 1.3); id.data[k * 4 + 1] = x * x / 255; id.data[k * 4 + 2] = 80 + x * 0.4; id.data[k * 4 + 3] = 255; } g.putImageData(id, 0, 0); }
        }, cancel);
        $('[data-k=ptxt]').textContent = `¡Lista! La IA ha analizado ${m.tomas.length} planos, ${m.tomas.reduce((a, t) => a + t.textos.length, 0)} textos, ${m.tomas.filter(t => t.logo).length} apariciones del logo y ${m.golpes.length} golpes de música en ${m.seg} s: se rodará en el plató 3D del juego. Pulsa «Vista previa».`; $('[data-k=arch]').textContent = ' Guardada: ' + m.nombre + ' · ' + m.tomas.length + ' planos'; pintaTextos(m);
      } catch (e) { $('[data-k=ptxt]').textContent = e.message === 'cancelado' ? 'Cancelado.' : '⚠️ ' + (e.message || e); }
      botones(true); $('[data-a=cancel]').style.display = 'none';
    };
    $('[data-a=cancel]').onclick = () => { if (cancel) cancel.no = true; };
    $('[data-a=ver]').onclick = async () => { localStorage.setItem(K('desc'), ta.value); await guardaTextos(); pn.style.display = 'none'; try { await reproducir({ desc: ta.value, preview: true }); } finally { pn.style.display = ''; } };
    $('[data-a=guardar]').onclick = async () => { localStorage.setItem(K('desc'), ta.value); const m = await guardaTextos(); if (m) { $('[data-k=ptxt]').textContent = 'Descripción guardada (no hace falta volver a analizar el vídeo: la descripción se aplica al rodar).'; $('[data-k=prog]').style.display = ''; } };
    $('[data-a=borrar]').onclick = async () => { if (!confirm('¿Borrar tu cabecera 3D de este dispositivo?')) return; await borrar(); $('[data-k=arch]').textContent = 'Ningún vídeo todavía'; pintaTextos(null); ['ver', 'borrar', 'guardar'].forEach(a => $(`[data-a=${a}]`).disabled = true); };
    $('[data-a=cerrar]').onclick = async () => { await guardaTextos(); if (cancel && !cancel.no && $('[data-a=cancel]').style.display === '') return; pn.remove(); };
    return pn;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** fila para el menú de Opciones de cada juego (usa las clases del juego para que encaje igual) */
  function fila(o = {}) {
    const row = document.createElement(o.tag || 'div'); row.className = o.rowClass || 'orow'; row.id = 'rowMiCabecera3D';
    if (o.style) row.style.cssText = o.style;
    const lb = document.createElement(o.labelTag || 'label'); lb.textContent = o.texto || '🎥 Mi cabecera 3D (tu vídeo recreado en 3D con IA)'; if (o.labelClass) lb.className = o.labelClass; row.appendChild(lb);
    const b = document.createElement('button'); b.className = o.btnClass || 'tbtn'; b.textContent = o.boton || 'Abrir'; b.onclick = ev => { ev.stopPropagation(); abrir(); }; row.appendChild(b);
    if (o.btnStyle) b.style.cssText = o.btnStyle;
    return row;
  }
  async function hay() { return !!(await getMeta()); }
  /** al empezar el Programa completo. Devuelve true si debe SUSTITUIR a la cabecera del juego. */
  // ------------------------------------------------------------------ adaptador genérico para los juegos con plató three.js propio
  // env: { THREE, scene, camera, centro:[x,y,z], radio, altura, concursantes:()=>[[x,y,z]...], presentador:()=>[x,y,z], publico:()=>[[x,y,z]...],
  //        logo:[[x,y,z] posición, [x,y,z] hacia dónde mira], toma:(fn)=>{} (el juego deja de mover la cámara), suelta:()=>{}, golpe:(i)=>{}, antes, despues, texto }
  function recrearGenerico(env) {
    return async function (pl, op) {
      const T3 = env.THREE, V = (a) => new T3.Vector3(a[0], a[1], a[2]), C = V(env.centro || [0, 1.5, 0]), R = env.radio || 9, H = env.altura || 3.5;
      const st = document.createElement('style'); st.textContent = '#hashtag,#bubble,.exHashBug,#topbar [id*=hash],#topbar [class*=hash],#hud [class*=hash]{visibility:hidden!important}.mc3dG{position:fixed;inset:0;z-index:2147481000;pointer-events:none;font-family:system-ui,Arial}.mc3dG .h{position:absolute;left:2%;top:3%;font:900 clamp(16px,2.6vw,30px) system-ui,Arial;color:#fff;text-shadow:0 2px 8px #000a}'
        + '.mc3dG .lt{position:absolute;left:3%;bottom:7%;display:flex;align-items:center;gap:8px;background:linear-gradient(#2f8bff,#0b4fd0);border:2px solid #8fd0ff;border-radius:999px;padding:6px 16px 6px 8px;font:800 clamp(13px,2vw,22px) system-ui,Arial;color:#fff;box-shadow:0 4px 18px #0008;transform:translateX(-130%);transition:transform .45s cubic-bezier(.2,.9,.3,1.2)}'
        + '.mc3dG .lt i{width:1.4em;height:1.4em;border-radius:50%;background:#ffd23a}.mc3dG .lt.on{transform:none}.mc3dG button{position:absolute;right:2%;bottom:3%;pointer-events:auto;font:800 15px system-ui;padding:9px 16px;border-radius:20px;border:2px solid #ffc21a;background:#000a;color:#fff}';
      const ov = document.createElement('div'); ov.className = 'mc3dG'; ov.innerHTML = '<div class="h"></div><div class="lt"><i></i><span></span></div><button>Saltar ⏭</button>';
      document.head.appendChild(st); document.body.appendChild(ov); ov.querySelector('.h').textContent = pl.hashtag || CFG.hashtagDef || ('#' + String(CFG.nombre || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, ''));
      let fin = false; ov.querySelector('button').onclick = () => { fin = true; };
      const cam = env.camera, pos = new T3.Vector3(), mira = new T3.Vector3();
      const sujeto = (t, k) => { const dir = t.dir || 1, a0 = (k * 1.37) % (Math.PI * 2), at = (a, r, h) => C.clone().add(new T3.Vector3(Math.sin(a) * r, h - C.y, Math.cos(a) * r));
        const L = (f, x) => { const l = f && f(); return l && l.length ? l : x; };
        if (t.sujeto === 'concursantes') { const cs = L(env.concursantes, null); if (cs) { const p = V(cs[(k * 3) % cs.length]); const out = p.clone().sub(C).setY(0).normalize(); const lado = new T3.Vector3(-out.z, 0, out.x).multiplyScalar(1.6 * dir); const h = new T3.Vector3(0, 1.9, 0);
          return [p.clone().addScaledVector(out, 4.6).add(lado).add(h), p.clone().add(new T3.Vector3(0, 1.3, 0)), p.clone().addScaledVector(out, 3.6).sub(lado).add(h), p.clone().add(new T3.Vector3(0, 1.3, 0))]; } }
        if (t.sujeto === 'presentador' && env.presentador) { const p = V(env.presentador()); const out = p.clone().sub(C).setY(0); if (out.lengthSq() < 0.01) out.set(0, 0, 1); out.normalize(); const lado = new T3.Vector3(-out.z, 0, out.x).multiplyScalar(1.2 * dir), m = p.clone().add(new T3.Vector3(0, 1.5, 0));
          return [m.clone().addScaledVector(out, 3.6).add(lado), m, m.clone().addScaledVector(out, 2.6).sub(lado), m]; }
        if (t.sujeto === 'publico') { const pu = L(env.publico, null); if (pu) { const p = V(pu[k % pu.length]); return [C.clone().lerp(p, 0.3).setY(H * 0.7), p, C.clone().lerp(p, 0.45).setY(H * 0.8).add(new T3.Vector3(dir, 0, 0)), p.clone().add(new T3.Vector3(2 * dir, 0, 0))]; } }
        if (t.sujeto === 'logo' && env.logoCam) { const a = V(env.logoCam[0]), m = V(env.logoCam[1]); return [a, m, a.clone().lerp(m, 0.18), m]; }
        if (t.sujeto === 'logo' && env.logo) { const p = V(env.logo[0]), m = V(env.logo[1]); const d = p.clone().sub(m).normalize(); return [p.clone().addScaledVector(d, 4).setY(p.y + 0.5), p, p.clone().addScaledVector(d, 6.5).setY(p.y + 0.3), p]; }
        switch (t.mov) {
          case 'acercar': return [at(a0, R * 1.5, H * 1.6), C, at(a0, R * 0.6, H * 0.7), C];
          case 'alejar': return [at(a0, R * 0.55, H * 0.6), C, at(a0 + 0.1 * dir, R * 1.6, H * 1.8), C];
          case 'lateral': { const a = at(a0 - 0.6 * dir, R, H * 0.8), b = at(a0 + 0.6 * dir, R, H * 0.8); return [a, C, b, C]; }
          case 'grua': return dir > 0 ? [at(a0, R, 0.8), C, at(a0, R, H * 2.4), C] : [at(a0, R * 0.6, H * 3), C, at(a0, R, H), C];
          case 'fija': return [at(a0, R, H), C, at(a0 + 0.06, R * 0.96, H), C];
          default: { const b = a0 + (t.mov === 'vuelo' ? 1.5 : 0.8) * dir, r = t.mov === 'vuelo' ? R * 1.3 : R; const h = t.mov === 'vuelo' ? H * 1.7 : H; return [at(a0, r, h), C, at(b, r, h), C, a0, b, r, h]; }
        }
      };
      // letras del logo que vuelan y se montan
      const montaLogo = () => { if (!env.logo) return null; const txt = String(env.texto || CFG.titulo || CFG.nombre || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9 ¡!¿?]/g, '').slice(0, 40); const g = new T3.Group(); env.scene.add(g); const p = V(env.logo[0]), m = V(env.logo[1]);
        const dirx = new T3.Vector3().subVectors(m, p).cross(new T3.Vector3(0, 1, 0)).normalize(), L = [], n = txt.length, w = Math.min(0.6, 5.5 / Math.max(1, n));
        [...txt].forEach((ch, i) => { if (ch === ' ') return; const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#ffd23a'; x.strokeStyle = '#7a3b00'; x.lineWidth = 8; x.font = '900 140px Arial'; x.textAlign = 'center'; x.strokeText(ch, 64, 135); x.fillText(ch, 64, 135);
          const tx = new T3.CanvasTexture(c); const me = new T3.Mesh(new T3.PlaneGeometry(w, w * 1.25), new T3.MeshBasicMaterial({ map: tx, transparent: true, side: T3.DoubleSide, depthTest: false })); me.renderOrder = 999;
          const dest = p.clone().addScaledVector(dirx, (i - (n - 1) / 2) * w), ori = dest.clone().add(new T3.Vector3((Math.random() - 0.5) * 24, Math.random() * 10 - 2, (Math.random() - 0.5) * 24));
          me.position.copy(ori); me.lookAt(me.position.clone().add(p.clone().sub(m))); const q = me.quaternion.clone(); me.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); g.add(me); L.push({ me, ori, dest, q0: me.quaternion.clone(), q, d: i * 0.07 }); });
        const t0 = performance.now(); return { tick() { const s = (performance.now() - t0) / 1000; L.forEach(o => { const u = Math.max(0, Math.min(1, (s - o.d) / 1.6)), e = 1 - Math.pow(1 - u, 3); o.me.position.lerpVectors(o.ori, o.dest, e); o.me.quaternion.slerpQuaternions(o.q0, o.q, e); }); },
          dispose() { env.scene.remove(g); g.traverse(o => { o.geometry && o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } }); } }; };
      const au = pista(op.audio, pl.vel), now = () => au.t(); const lt = ov.querySelector('.lt');
      let k = -1, cur = null, logo = null, bi = 0, gi = 0, ltT = 0; const bs = pl.banners.slice().sort((a, b) => a.t - b.t);
      try { env.antes && env.antes(pl); } catch (e) { console.warn('[MC3D]', e); }
      let paraSint = null; try { if (op.sintoniaJuego) paraSint = op.sintoniaJuego(); } catch (e) { console.warn('[MC3D] sintonía', e); }
      env.toma && env.toma();
      try {
        await new Promise(res => { const paso = () => {
          const t = now(); if (fin || t >= pl.dur) { res(); return; }
          while (k + 1 < pl.tomas.length && t >= pl.tomas[k + 1].t0) { k++; const T = pl.tomas[k]; cur = { T, p: sujeto(T, k) }; pos.copy(cur.p[0]); mira.copy(cur.p[1]);
            if (T.sujeto === 'logo') { if (!logo) logo = montaLogo(); } else if (logo) { logo.dispose(); logo = null; } }
          if (cur) { const u = Math.max(0, Math.min(1, (t - cur.T.t0) / Math.max(0.3, cur.T.t1 - cur.T.t0))), e = u * u * (3 - 2 * u);
            if (cur.p.length > 4) { const a = cur.p[4] + (cur.p[5] - cur.p[4]) * e; pos.set(C.x + Math.sin(a) * cur.p[6], cur.p[7], C.z + Math.cos(a) * cur.p[6]); mira.copy(C); }
            else { pos.lerpVectors(cur.p[0], cur.p[2], e); mira.lerpVectors(cur.p[1], cur.p[3], e); }
            cam.position.copy(pos); cam.lookAt(mira); env.mira && env.mira.copy(mira); cam.updateMatrixWorld && cam.updateMatrixWorld(); }
          if (logo) logo.tick();
          while (bi < bs.length && t >= bs[bi].t) { lt.querySelector('span').textContent = bs[bi].txt; lt.classList.add('on'); ltT = t + bs[bi].dur / 1000; bi++; }
          if (ltT && t >= ltT) { lt.classList.remove('on'); ltT = 0; }
          while (gi < pl.golpes.length && t >= pl.golpes[gi]) { try { env.golpe && env.golpe(gi); } catch (e) { } gi++; }
          requestAnimationFrame(paso); }; requestAnimationFrame(paso); });
      } finally { au.parar(); try { typeof paraSint === 'function' && paraSint(); } catch (e) { } if (logo) logo.dispose(); ov.remove(); st.remove(); try { env.suelta && env.suelta(); env.despues && env.despues(); } catch (e) { console.warn('[MC3D]', e); } }
    };
  }
  async function introPrograma(ctx) {
    try { if (window.__noMC3D || modoIntro() === 'no') return false; const g = await getMeta(); if (!g || g.v !== 2) return false; await reproducir({ ctx }); return modoIntro() === 'sustituye'; }
    catch (e) { console.warn('[MC3D]', e); return false; }
  }
  window.MC3D = { config: o => Object.assign(CFG, o), interpretar, analizar, plan, pista, reproducir, vistaPrevia: () => reproducir(), abrir, fila, hay, introPrograma, recrearGenerico, borrar, BASE, version: '1.0' };
})();
