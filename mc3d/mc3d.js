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

  // ------------------------------------------------------------------ IA de profundidad
  let motor = null;
  function cargarMotor() {
    if (motor) return motor;
    motor = (async () => {
      let w = null;
      try {
        w = new Worker(BASE + 'depth-worker.js', { type: 'module' });
        const pend = new Map(); let id = 0;
        w.onmessage = e => { const p = pend.get(e.data.id); if (p) { pend.delete(e.data.id); e.data.ok ? p[0](e.data) : p[1](new Error(e.data.error)); } };
        const call = (m, tr) => new Promise((ok, ko) => { m.id = ++id; pend.set(m.id, [ok, ko]); w.postMessage(m, tr || []); });
        await call({ tipo: 'init', base: BASE });
        return { depth: (rgba, W, H) => call({ tipo: 'depth', rgba, w: W, h: H }, [rgba.buffer]) };
      } catch (e) {
        try { w && w.terminate(); } catch (_) { }
        console.warn('[MC3D] worker no disponible, uso el hilo principal', e);
        const m = await import(BASE + 'depth-worker.js'); await m.init(BASE);
        return { depth: (rgba, W, H) => m.depth(rgba, W, H) };
      }
    })();
    motor.catch(() => { motor = null; });
    return motor;
  }

  // ------------------------------------------------------------------ conversión vídeo → escena 3D
  const espera = (el, ev, ms) => new Promise((ok, ko) => { const t = setTimeout(() => { el.removeEventListener(ev, f); ok(false); }, ms); const f = () => { clearTimeout(t); el.removeEventListener(ev, f); ok(true); }; el.addEventListener(ev, f); });
  async function convertir(file, desc, onProg, cancel) {
    const p = interpretar(desc);
    const url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.setAttribute('playsinline', ''); v.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px';
    document.body.appendChild(v);
    try {
      if (!(await espera(v, 'loadedmetadata', 15000)) && !v.videoWidth) throw new Error('No puedo leer ese vídeo. Prueba con un MP4 (H.264).');
      if (!v.videoWidth) await espera(v, 'loadeddata', 8000);
      const dur0 = isFinite(v.duration) && v.duration > 0 ? v.duration : 20;
      const dur = Math.min(dur0, p.dur || 45);
      const fps = Math.max(4, Math.min(12, Math.floor(360 / dur)));
      const n = Math.max(2, Math.floor(dur * fps));
      const vw = v.videoWidth, vh = v.videoHeight, asp = vw / vh;
      const CW = Math.min(720, vw), CH = Math.round(CW / asp);
      const lado = { rapida: 196, normal: 294, alta: 392 }[p.calidad] || 294;
      let dw, dh; if (asp >= 1) { dw = lado; dh = Math.max(56, Math.round(lado / asp / 14) * 14); } else { dh = lado; dw = Math.max(56, Math.round(lado * asp / 14) * 14); }
      onProg && onProg({ fase: 'ia', txt: 'Cargando la IA de profundidad…', f: 0 });
      const ia = await cargarMotor();
      const cc = document.createElement('canvas'); cc.width = CW; cc.height = CH; const gc = cc.getContext('2d', { willReadFrequently: true });
      const dc = document.createElement('canvas'); dc.width = dw; dc.height = dh; const gd = dc.getContext('2d', { willReadFrequently: true });
      await borrar();
      let prev = null, lo = null, hi = null; const t0 = performance.now();
      const deps = new Array(n);
      for (let i = 0; i < n; i++) {
        if (cancel && cancel.no) throw new Error('cancelado');
        const t = Math.min(dur0 - 0.05, i / fps + 0.001);
        v.currentTime = t; await espera(v, 'seeked', 4000);
        gc.drawImage(v, 0, 0, CW, CH);
        const jpg = await new Promise(ok => cc.toBlob(ok, 'image/jpeg', 0.82));
        let dep;
        if (i % 2 === 0 || i === n - 1) {
          gd.drawImage(v, 0, 0, dw, dh);
          const rgba = new Uint8ClampedArray(gd.getImageData(0, 0, dw, dh).data);
          const r = await ia.depth(rgba, dw, dh);
          const a = r.data; let mn = Infinity, mx = -Infinity;
          for (let k = 0; k < a.length; k += 7) { const x = a[k]; if (x < mn) mn = x; if (x > mx) mx = x; }
          lo = lo == null ? mn : lo * 0.6 + mn * 0.4; hi = hi == null ? mx : hi * 0.6 + mx * 0.4; // rango suavizado: sin parpadeo
          const sc = 255 / Math.max(1e-6, hi - lo); dep = new Uint8Array(a.length);
          for (let k = 0; k < a.length; k++) { let x = (a[k] - lo) * sc; x = x < 0 ? 0 : x > 255 ? 255 : x; dep[k] = prev ? (x * 0.75 + prev[k] * 0.25) : x; }
          prev = dep; dep.w = r.w; dep.h = r.h;
          if (i >= 2 && !deps[i - 1]) { const a0 = deps[i - 2], m = new Uint8Array(dep.length); for (let k = 0; k < m.length; k++) m[k] = (a0[k] + dep[k]) >> 1; deps[i - 1] = m; await tx('frames', 'readwrite', st => st.put({ jpg: deps.jpgPend, dep: m }, i - 1)); }
          deps[i] = dep;
          await tx('frames', 'readwrite', st => st.put({ jpg, dep }, i));
          if (onProg) { const el = (performance.now() - t0) / 1000, rest = el / (i + 1) * (n - i - 1); onProg({ fase: 'conv', f: (i + 1) / n, i, n, txt: `Convirtiendo a 3D: fotograma ${i + 1} de ${n} · quedan ~${rest < 60 ? Math.ceil(rest) + ' s' : Math.ceil(rest / 60) + ' min'}`, dep, dw: r.w, dh: r.h, img: cc }); }
        } else { deps.jpgPend = jpg; }
      }
      const dW = deps[0].w || dw, dH = deps[0].h || dh;
      let audio = false;
      if (file.size < 160e6) { await tx('meta', 'readwrite', st => st.put(file, 'video')); audio = true; }
      const meta = { v: 1, nombre: file.name || 'vídeo', desc, fps, n, dur: n / fps, w: CW, h: CH, dw: dW, dh: dH, audio, fecha: Date.now(), seg: Math.round((performance.now() - t0) / 1000) };
      await tx('meta', 'readwrite', st => st.put(meta, 'meta'));
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
      return meta;
    } finally { v.removeAttribute('src'); v.load(); v.remove(); URL.revokeObjectURL(url); }
  }

  // ------------------------------------------------------------------ reproductor WebGL2
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const VS_MALLA = `#version 300 es
  precision highp float; in vec2 aUV; uniform sampler2D uD0,uD1; uniform float uMix,uRel,uAsp,uExp,uT,uPx; uniform mat4 uPV;
  out vec2 vUV; out vec3 vP; out float vD;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  float dep(vec2 uv){return mix(texture(uD0,uv).r,texture(uD1,uv).r,uMix);}
  void main(){ vUV=aUV; float d=dep(aUV); vD=d;
    vec3 p=vec3((aUV.x-.5)*2.*uAsp,(aUV.y-.5)*2.,(d-.45)*uRel);
    if(uExp>0.){ vec3 r=vec3(h(aUV)-.5,h(aUV+3.1)-.5,h(aUV+7.7)+.2); p+=r*uExp*(2.5+d*2.)+vec3(0.,-uExp*uExp*.8,0.); }
    vP=p; vec4 c=uPV*vec4(p,1.); gl_Position=c; gl_PointSize=max(1.,uPx/c.w); }`;
  const FS_MALLA = `#version 300 es
  precision highp float; in vec2 vUV; in vec3 vP; in float vD; uniform sampler2D uC0,uC1; uniform float uMix,uT,uLuz,uModo,uNie,uGrid,uExp;
  uniform vec3 uL1,uL2,uNiebla; out vec4 o;
  void main(){ vec3 c=mix(texture(uC0,vUV).rgb,texture(uC1,vUV).rgb,uMix);
    vec3 n=normalize(cross(dFdx(vP),dFdy(vP))); if(n.z<0.)n=-n;
    vec3 l1=normalize(vec3(sin(uT*.7)*1.5,1.2,1.6)), l2=normalize(vec3(-cos(uT*.5)*1.6,-.4,1.2));
    float k1=max(dot(n,l1),0.), k2=max(dot(n,l2),0.); float sp=pow(max(dot(n,normalize(l1+vec3(0,0,1))),0.),24.);
    vec3 lit=c*(.55+.6*k1)+uL1*k1*.35+uL2*k2*.45+sp*.25;
    c=mix(c,lit,uLuz);
    float stretch=clamp(length(fwidth(vP.z))*6.,0.,1.); c*=1.-stretch*.35;
    if(uModo>1.5){ vec2 g=abs(fract(vUV*uGrid)-.5); float w=smoothstep(.42,.5,max(g.x,g.y)); c=mix(c*.18,uL1*1.4+c*.6,w); if(uModo>2.5){c=vec3(.3,.9,1.)*(dot(c,vec3(.33))*1.3+w*.6);} }
    if(uModo>0.5&&uModo<1.5){ vec2 q=gl_PointCoord-.5; if(dot(q,q)>.25)discard; }
    float f=clamp((1.-vD)*uNie,0.,1.); c=mix(c,uNiebla,f*.8);
    o=vec4(c,uModo>2.5?.85:1.); }`;
  const VS_PART = `#version 300 es
  precision highp float; in vec3 aS; uniform float uT,uTipo,uPx; uniform mat4 uPV; out vec3 vC; out float vA;
  float h(float x){return fract(sin(x*91.17)*43758.5453);}
  void main(){ float s=aS.x,s2=aS.y,s3=aS.z; vec3 p; vA=1.; float sz=6.;
    if(uTipo<.5){ p=vec3((s-.5)*7.,2.5-mod(uT*.25*(.5+s2)+s3*5.,5.),(s2-.5)*3.+.6); p.x+=sin(uT+s3*6.)*.15; vC=vec3(1.); sz=5.+s2*5.; }
    else if(uTipo<1.5){ p=vec3((s-.5)*7.,2.5-mod(uT*3.*(.7+s2)+s3*5.,5.),(s2-.5)*3.+.6); vC=vec3(.7,.8,1.); vA=.55; sz=2.5; }
    else if(uTipo<2.5){ float ph=mod(uT*.6+s3,1.); float a=s*6.283; vec3 c0=vec3((h(floor(uT*.6+s3)+s)-.5)*3.,(h(floor(uT*.6+s3)+s2*3.)-.2)*1.6,1.); p=c0+vec3(cos(a)*s2,sin(a)*s2,(s3-.5))*ph*1.6+vec3(0.,-ph*ph*.8,0.); vC=mix(vec3(1.,.85,.3),vec3(1.,.3,.1),ph); vA=1.-ph; sz=4.; }
    else if(uTipo<3.5){ p=vec3((s-.5)*7.,2.6-mod(uT*.6*(.6+s2)+s3*5.,5.2),(s2-.5)*3.+.6); p.x+=sin(uT*3.+s3*9.)*.12; vC=vec3(h(s*7.),h(s2*5.),h(s3*3.)); vC=normalize(vC+.05)*1.3; sz=7.; }
    else if(uTipo<4.5){ p=vec3((s-.5)*16.,(s2-.5)*10.,-3.-s3*6.); vC=vec3(1.,.95,.85); vA=.5+.5*sin(uT*3.+s*40.); sz=2.+s3*3.; }
    else if(uTipo<5.5){ p=vec3((s-.5)*6.,-2.5+mod(uT*.35*(.5+s2)+s3*5.,5.),(s2-.5)*2.5+.7); p.x+=sin(uT*1.5+s3*6.)*.2; vC=vec3(.7,.9,1.); vA=.6; sz=8.+s2*10.; }
    else { float ph=mod(uT*.5*(.6+s2)+s3,1.); p=vec3((s-.5)*6.+sin(uT*2.+s*20.)*.1*ph,-1.3+ph*2.6,(s2-.5)*2.+.8); vC=mix(vec3(1.,.9,.3),vec3(1.,.2,.0),ph); vA=1.-ph; sz=6.*(1.-ph)+2.; }
    vec4 c=uPV*vec4(p,1.); gl_Position=c; gl_PointSize=sz*uPx/c.w; }`;
  const FS_PART = `#version 300 es
  precision highp float; in vec3 vC; in float vA; out vec4 o; void main(){ vec2 q=gl_PointCoord-.5; float r=dot(q,q); if(r>.25)discard; o=vec4(vC,vA*(1.-r*4.)); }`;
  const VS_Q = `#version 300 es
  in vec2 aP; out vec2 vUV; void main(){ vUV=aP*.5+.5; gl_Position=vec4(aP,0.,1.); }`;
  const FS_POST = `#version 300 es
  precision highp float; in vec2 vUV; uniform sampler2D uS; uniform float uT,uFade,uEst,uBrillo,uGlitch,uVhs,uVin,uCine,uSat; uniform vec3 uTint,uTint2; uniform vec2 uRes; out vec4 o;
  float h(float x){return fract(sin(x*91.17)*43758.5453);}
  void main(){ vec2 uv=vUV; float g=0.;
    if(uGlitch>0.){ float b=floor(uv.y*24.+floor(uT*9.)); float on=step(.93,h(b+floor(uT*7.)))*uGlitch; uv.x+=(h(b)-.5)*.08*on; g=on; }
    if(uVhs>0.) uv.x+=sin(uv.y*300.+uT*20.)*.0008*uVhs;
    float sh=(.002+g*.012)*(uGlitch+uVhs*.5);
    vec3 c=vec3(texture(uS,uv+vec2(sh,0)).r,texture(uS,uv).g,texture(uS,uv-vec2(sh,0)).b);
    if(uBrillo>0.){ vec3 b=textureLod(uS,uv,3.).rgb*.5+textureLod(uS,uv,5.).rgb*.5; c+=max(b-.55,0.)*uBrillo*2.2; }
    float l=dot(c,vec3(.299,.587,.114));
    if(uEst<.5){} else if(uEst<1.5) c=vec3(l); else if(uEst<2.5) c=vec3(l)*vec3(1.1,.92,.7);
    else if(uEst<3.5){ c=mix(vec3(l),c,1.8); c=pow(c,vec3(1.15)); c+=uTint*pow(l,3.)*.6; }
    else if(uEst<4.5) c*=vec3(1.12,.98,.82); else if(uEst<5.5) c*=vec3(.82,.95,1.15); else c*=.7;
    c=mix(vec3(dot(c,vec3(.333))),c,uSat);
    c=mix(c,c*mix(uTint,uTint2,uv.y)*1.25,.38*step(.01,dot(uTint,uTint)));
    if(uCine>0.){ c=(c-.5)*1.12+.5; if(abs(uv.y-.5)>.41) c=vec3(0.); }
    if(uVhs>0.){ c*=.88+.12*sin(uv.y*uRes.y*1.6); c+=(h(uv.y*uRes.y+uT*60.)-.5)*.05*uVhs; }
    if(uVin>0.){ vec2 q=uv-.5; c*=1.-dot(q,q)*1.6*uVin; }
    o=vec4(clamp(c,0.,1.)*uFade,1.); }`;

  function prog(gl, vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < nu; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  // matrices
  const persp = (f, a, n, fa) => { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; };
  function lookAt(e, c, up) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map(x => x / l);
    let x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; l = Math.hypot(...x); x = x.map(v => v / l);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
  }
  const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  function camara(modo, u, T, asp) { // u: 0..1 dentro del tramo
    const D = 2.55 / Math.min(1, asp > 1 ? 1 : asp) ; const e = ss(u);
    switch (modo) {
      case 'orbita': { const a = Math.sin(u * Math.PI * 2 * 0.5 - Math.PI / 2) * 0.55; return { e: [Math.sin(a) * D, 0.15, Math.cos(a) * D], c: [0, 0, 0], r: 0 }; }
      case 'acercar': { const d = 3.4 - 1.65 * e; return { e: [0.25 * (1 - e), 0.18 * (1 - e) + 0.05, d], c: [0, 0, 0.1 * e], r: 0 }; }
      case 'alejar': { const d = 1.6 + 1.9 * e; return { e: [-0.2 * e, 0.1, d], c: [0, 0, 0], r: 0 }; }
      case 'lateral': { const x = -0.95 + 1.9 * e; return { e: [x, 0.05, D * 0.92], c: [x * 0.35, 0, 0], r: 0 }; }
      case 'vuelo': { const d = 3.6 - 2.1 * e; const a = Math.sin(u * Math.PI * 1.5) * 0.45; return { e: [Math.sin(a) * d, 0.6 * (1 - e) + Math.sin(u * 9) * 0.05, Math.cos(a) * d], c: [0, 0, 0], r: Math.sin(u * Math.PI * 2) * 0.08 }; }
      case 'grua': { const pt = 1.05 * (1 - e) + 0.08; return { e: [0, Math.sin(pt) * D, Math.cos(pt) * D], c: [0, 0, 0], r: 0 }; }
      default: { return { e: [Math.sin(T * 0.4) * 0.06, Math.sin(T * 0.3) * 0.04, D], c: [0, 0, 0], r: 0 }; }
    }
  }
  function camTotal(p, u, T, asp) {
    const L = p.camaras, n = L.length, x = Math.min(0.9999, u) * n, i = Math.floor(x), f = x - i;
    let a = camara(L[i], f, T, asp);
    const blend = 0.18;
    if (i + 1 < n && f > 1 - blend) { const b = camara(L[i + 1], 0, T, asp), w = ss((f - (1 - blend)) / blend); a = { e: a.e.map((v, k) => v + (b.e[k] - v) * w), c: a.c.map((v, k) => v + (b.c[k] - v) * w), r: a.r + (b.r - a.r) * w }; }
    if (p.temblor) { const s = 0.025; a.e = a.e.map((v, k) => v + (Math.sin(T * 23 + k * 7) + Math.sin(T * 31 + k)) * s); }
    return a;
  }

  async function reproducir(opc = {}) {
    const meta = await getMeta(); if (!meta) return false;
    const p = interpretar(opc.desc != null ? opc.desc : meta.desc);
    const frames = await tx('frames', 'readonly', st => req(st.getAll()));
    const vid = meta.audio && !p.mudo ? await getBlob('video') : null;
    return new Promise(async (fin) => {
      const ov = document.createElement('div');
      ov.id = 'mc3dIntro'; ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#000;touch-action:none';
      const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      const c2 = document.createElement('canvas'); c2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      const sk = document.createElement('button'); sk.textContent = 'Saltar ⏭'; sk.style.cssText = 'position:absolute;right:18px;top:16px;font:700 16px system-ui;padding:8px 16px;border-radius:20px;border:2px solid #fff8;background:#0008;color:#fff;cursor:pointer;z-index:2';
      ov.append(cv, c2, sk); document.body.appendChild(ov);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rs = () => { for (const c of [cv, c2]) { c.width = Math.round(ov.clientWidth * dpr); c.height = Math.round(ov.clientHeight * dpr); } };
      rs(); window.addEventListener('resize', rs);
      const gl = cv.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: !!opc.captura });
      let vivo = true, audio = null, aurl = null; const bm = new Map();
      const acabar = () => { if (!vivo) return; vivo = false; window.removeEventListener('resize', rs); try { audio && audio.pause(); } catch (e) { } if (aurl) URL.revokeObjectURL(aurl); for (const b of bm.values()) b && b.close && b.close(); ov.remove(); fin(true); };
      sk.onclick = e => { e.stopPropagation(); acabar(); };
      if (!gl) { alert('Este dispositivo no tiene WebGL2: no puedo reproducir la cabecera 3D.'); return acabar(); }
      gl.getExtension('EXT_color_buffer_float');
      const PM = prog(gl, VS_MALLA, FS_MALLA), PP = prog(gl, VS_PART, FS_PART), PQ = prog(gl, VS_Q, FS_POST);
      // malla
      const asp = meta.w / meta.h, GX = 220, GY = Math.max(40, Math.round(GX / asp));
      const uv = new Float32Array((GX + 1) * (GY + 1) * 2); let k = 0; for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) { uv[k++] = x / GX; uv[k++] = y / GY; }
      const ix = new Uint32Array(GX * GY * 6); k = 0; for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const a = y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1; ix.set([a, b, c, b, d, c], k); k += 6; }
      const vaoM = gl.createVertexArray(); gl.bindVertexArray(vaoM);
      let b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      let loc = gl.getAttribLocation(PM.p, 'aUV'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      b = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
      // nube de puntos más densa
      const PX = Math.min(meta.dw * 2, 420), PY = Math.round(PX / asp); const uvp = new Float32Array(PX * PY * 2); k = 0; for (let y = 0; y < PY; y++) for (let x = 0; x < PX; x++) { uvp[k++] = (x + .5) / PX; uvp[k++] = (y + .5) / PY; }
      const vaoP = gl.createVertexArray(); gl.bindVertexArray(vaoP); b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, uvp, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      // partículas
      const NP = 900, sd = new Float32Array(NP * 3); for (let i = 0; i < sd.length; i++) sd[i] = Math.random();
      const vaoS = gl.createVertexArray(); gl.bindVertexArray(vaoS); b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, sd, gl.STATIC_DRAW);
      loc = gl.getAttribLocation(PP.p, 'aS'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      const vaoQ = gl.createVertexArray(); gl.bindVertexArray(vaoQ); b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      loc = gl.getAttribLocation(PQ.p, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      const tex = (lin = true) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [a, v] of [[gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, v); return t; };
      const tC = [tex(), tex()], tD = [tex(), tex()];
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const subeD = (t, d) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); const fl = new Uint8Array(d.length); const W = meta.dw, H = meta.dh; for (let y = 0; y < H; y++) fl.set(d.subarray((H - 1 - y) * W, (H - y) * W), y * W); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, W, H, 0, gl.RED, gl.UNSIGNED_BYTE, fl); };
      const subeC = (t, im) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); };
      // FBO con mipmaps para el brillo
      let fbo = null, ftex = null, fW = 0, fH = 0, rb = null;
      const preparaFbo = () => { if (fW === cv.width && fH === cv.height) return; fW = cv.width; fH = cv.height; ftex = ftex || gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, ftex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fW, fH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); rb = rb || gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, fW, fH); fbo = fbo || gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ftex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); };
      // fotogramas: decodificación por delante
      const N = frames.length;
      const pide = i => { if (i < 0 || i >= N || bm.has(i)) return; bm.set(i, null); createImageBitmap(frames[i].jpg, { imageOrientation: 'flipY' }).then(x => { if (!vivo) return x.close && x.close(); bm.set(i, x); }).catch(() => { }); };
      for (let i = 0; i < Math.min(N, 10); i++) pide(i);
      await new Promise(r => { const t0 = performance.now(); const w = () => (bm.get(0) && bm.get(1 % N)) || performance.now() - t0 > 3000 ? r() : setTimeout(w, 30); w(); });
      // logo
      let logo = null; const lsrc = opc.logo || CFG.logo; if (p.logo && lsrc) { logo = new Image(); logo.src = typeof lsrc === 'function' ? lsrc() : lsrc; }
      const titulo = p.titulo || (p.logo ? (CFG.titulo || CFG.nombre) : '');
      // audio
      if (vid) { aurl = URL.createObjectURL(vid); audio = new Audio(aurl); audio.playbackRate = p.vel; audio.preservesPitch = false; audio.volume = 1; try { await audio.play(); } catch (e) { audio = null; } }
      const C1 = hex(p.colores[0] || (p.estilo === 'neon' ? '#ff2ad0' : '#ffc21a')), C2 = hex(p.colores[1] || p.colores[0] || (p.estilo === 'neon' ? '#1ae0ff' : '#5a8aff'));
      const tint = p.colores.length ? C1 : [0, 0, 0], tint2 = p.colores.length ? C2 : [0, 0, 0];
      const EST = { normal: 0, bn: 1, sepia: 2, neon: 3, calido: 4, frio: 5, oscuro: 6 }[p.estilo];
      const MODO = { solido: 0, puntos: 1, malla: 2, holo: 3 }[p.modo];
      const efe = e => p.efectos.includes(e);
      const TIPOS = { nieve: 0, lluvia: 1, chispas: 2, confeti: 3, estrellas: 4, burbujas: 5, fuego: 6 };
      const parts = p.efectos.filter(e => e in TIPOS).map(e => TIPOS[e]);
      const durV = meta.dur, durT = durV / p.vel + (titulo || logo ? 2.6 : 0.6);
      const g2 = c2.getContext('2d');
      let i0 = -1, t0 = performance.now(), last = performance.now();
      const pinta = () => {
        if (!vivo) return;
        const now = performance.now(), T = (now - t0) / 1000;
        let tv = audio && !audio.paused && !audio.ended ? audio.currentTime : T * p.vel;
        tv = Math.min(tv, durV - 1e-3);
        const fi = Math.min(N - 1.001, tv * meta.fps), a = Math.floor(fi), mix = fi - a;
        if (a !== i0 && bm.get(a)) {
          i0 = a; const nx = Math.min(N - 1, a + 1);
          subeC(tC[0], bm.get(a)); subeC(tC[1], bm.get(nx) || bm.get(a)); subeD(tD[0], frames[a].dep); subeD(tD[1], frames[nx].dep);
          for (const [j, x] of bm) if (j < a - 1 && x) { x.close && x.close(); bm.delete(j); }
          for (let j = a; j < a + 10; j++) pide(j);
        }
        const W = cv.width, H = cv.height, sa = W / H, u = Math.min(1, T / (durV / p.vel));
        const cam = camTotal(p, u, T, asp / sa);
        const up = [Math.sin(cam.r), Math.cos(cam.r), 0];
        const fit = Math.max(1, (asp / sa));
        const pv = mul(persp(0.82, sa, 0.05, 40), lookAt(cam.e.map((v, k) => k === 2 ? v * fit : v), cam.c, up));
        preparaFbo(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H);
        const bg = efe('estrellas') || p.estilo === 'oscuro' ? [0.01, 0.01, 0.03] : [tint[0] * 0.12 + 0.02, tint[1] * 0.12 + 0.02, tint[2] * 0.12 + 0.05];
        gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
        const fade = Math.min(1, T / 0.8) * Math.min(1, (durT - T) / 0.7);
        const expl = efe('explosion') ? Math.max(0, (T - (durV / p.vel - 1.6)) / 1.6) : 0;
        gl.useProgram(PM.p); const U = PM.u;
        gl.uniformMatrix4fv(U.uPV, false, pv); gl.uniform1f(U.uMix, mix); gl.uniform1f(U.uRel, 0.95 * p.relieve); gl.uniform1f(U.uAsp, asp); gl.uniform1f(U.uExp, expl * expl);
        gl.uniform1f(U.uT, T); gl.uniform1f(U.uPx, H * (MODO === 1 ? 0.012 : 0.004) * 2.2 * (240 / PX)); gl.uniform1f(U.uLuz, p.luces + (MODO ? 0.2 : 0)); gl.uniform1f(U.uModo, MODO);
        gl.uniform1f(U.uNie, efe('niebla') ? 1.1 : 0.15); gl.uniform1f(U.uGrid, 70); gl.uniform3fv(U.uL1, C1); gl.uniform3fv(U.uL2, C2); gl.uniform3fv(U.uNiebla, bg.map(x => x + 0.25));
        [[tC[0], 'uC0'], [tC[1], 'uC1'], [tD[0], 'uD0'], [tD[1], 'uD1']].forEach(([t, n], j) => { gl.activeTexture(gl.TEXTURE0 + j); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(U[n], j); });
        if (MODO === 3) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); }
        if (MODO === 1 || expl > 0.02) { gl.bindVertexArray(vaoP); gl.drawArrays(gl.POINTS, 0, PX * PY); }
        else { gl.bindVertexArray(vaoM); gl.drawElements(gl.TRIANGLES, GX * GY * 6, gl.UNSIGNED_INT, 0); }
        if (parts.length) {
          gl.useProgram(PP.p); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.bindVertexArray(vaoS);
          gl.uniformMatrix4fv(PP.u.uPV, false, pv); gl.uniform1f(PP.u.uT, T); gl.uniform1f(PP.u.uPx, H / 900);
          for (const tp of parts) { gl.uniform1f(PP.u.uTipo, tp); gl.drawArrays(gl.POINTS, 0, NP / parts.length | 0); }
          gl.depthMask(true);
        }
        gl.disable(gl.BLEND);
        gl.bindTexture(gl.TEXTURE_2D, ftex); gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.disable(gl.DEPTH_TEST);
        gl.useProgram(PQ.p); const Q = PQ.u; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ftex); gl.uniform1i(Q.uS, 0);
        gl.uniform1f(Q.uT, T); gl.uniform1f(Q.uFade, Math.max(0, fade)); gl.uniform1f(Q.uEst, EST); gl.uniform1f(Q.uBrillo, efe('brillo') || p.estilo === 'neon' || MODO === 3 ? 1 : 0.25);
        gl.uniform1f(Q.uGlitch, efe('glitch') ? 1 : 0); gl.uniform1f(Q.uVhs, efe('vhs') ? 1 : 0); gl.uniform1f(Q.uVin, efe('vineta') || p.cine ? 1 : 0.45); gl.uniform1f(Q.uCine, p.cine ? 1 : 0);
        gl.uniform1f(Q.uSat, p.estilo === 'neon' ? 1.5 : 1.08); gl.uniform3fv(Q.uTint, tint); gl.uniform3fv(Q.uTint2, tint2); gl.uniform2f(Q.uRes, W, H);
        gl.bindVertexArray(vaoQ); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
        // rótulo / logo
        g2.clearRect(0, 0, c2.width, c2.height);
        const tl = durV / p.vel - 1.2;
        if ((titulo || logo) && T > tl) {
          const k2 = Math.min(1, (T - tl) / 0.9), e = 1 - Math.pow(1 - k2, 3), op = Math.min(1, (durT - T) / 0.6);
          g2.save(); g2.globalAlpha = Math.max(0, op); g2.translate(c2.width / 2, c2.height / 2); g2.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); g2.globalAlpha *= e;
          let y = 0;
          if (logo && logo.complete && logo.naturalWidth) { const lh = c2.height * 0.42, lw = lh * logo.naturalWidth / logo.naturalHeight; const lw2 = Math.min(lw, c2.width * 0.7), lh2 = lw2 * logo.naturalHeight / logo.naturalWidth; g2.shadowColor = `rgb(${C1.map(x => x * 255 | 0)})`; g2.shadowBlur = 40 * dpr; g2.drawImage(logo, -lw2 / 2, -lh2 / 2 - (p.titulo ? c2.height * 0.08 : 0), lw2, lh2); y = lh2 / 2 + c2.height * 0.04; }
          if (titulo && (!logo || p.titulo || !(logo.complete && logo.naturalWidth))) {
            const fs = Math.min(c2.width / Math.max(6, titulo.length) * 1.5, c2.height * 0.14);
            g2.font = `900 ${fs}px system-ui, sans-serif`; g2.textAlign = 'center'; g2.textBaseline = 'middle';
            g2.shadowColor = `rgb(${C1.map(x => x * 255 | 0)})`; g2.shadowBlur = 30 * dpr; g2.lineWidth = fs * 0.08; g2.strokeStyle = '#000a'; g2.strokeText(titulo, 0, y); g2.fillStyle = '#fff'; g2.fillText(titulo, 0, y);
          }
          g2.restore();
        }
        if (opc.alFotograma) opc.alFotograma(T, durT);
        if (T >= durT) return acabar();
        requestAnimationFrame(pinta);
      };
      requestAnimationFrame(pinta);
      if (opc.alEmpezar) opc.alEmpezar({ acabar, ov });
    });
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
<p class="sm">Sube un vídeo y describe cómo lo quieres. La IA calcula la profundidad de cada fotograma y convierte <b>todo el vídeo en una escena 3D</b> (relieve, cámara que se mueve por dentro, luces y efectos). Funciona sin conexión y se guarda en este dispositivo. Sale al empezar el Programa completo.</p>
<p><button class="g" data-a="elegir">📁 Elegir vídeo</button><span data-k="arch" class="sm">${meta ? 'Guardada: ' + esc(meta.nombre) + ' · ' + meta.n + ' fotogramas 3D · ' + meta.dur.toFixed(1) + ' s' : 'Ningún vídeo todavía'}</span></p>
<input type="file" accept="video/*" style="display:none">
<p><b>¿Cómo la quieres?</b></p><textarea placeholder="Ej.: tonos dorados y morados, la cámara se acerca y gira alrededor, chispas y brillo, despacio, con el logo y el texto «¡Esta noche!»">${esc(descG)}</textarea>
<div class="chips" data-k="chips"></div>
<p class="sm" data-k="ent"></p>
<p>Calidad de la conversión: <span data-k="cal"></span></p>
<p><button class="g" data-a="conv">✨ Convertir en 3D con IA</button><button data-a="cancel" style="display:none">✖ Cancelar</button></p>
<div data-k="prog" style="display:none"><div class="bar"><i></i></div><p class="sm" data-k="ptxt"></p><div class="vis"><canvas data-k="vc"></canvas><canvas data-k="vd"></canvas></div></div>
<p><button data-a="ver" ${meta ? '' : 'disabled'}>▶️ Vista previa</button><button data-a="guardar" ${meta ? '' : 'disabled'}>💾 Guardar descripción</button><button data-a="borrar" ${meta ? '' : 'disabled'}>🗑 Borrar</button></p>
<p>Al empezar el Programa completo: <span data-k="modo"></span></p>
<p style="text-align:right"><button class="g" data-a="cerrar">Cerrar</button></p></div>`;
    document.body.appendChild(pn);
    const $ = s => pn.querySelector(s), ta = $('textarea'), inp = $('input');
    pn.addEventListener('click', e => e.stopPropagation()); pn.addEventListener('keydown', e => e.stopPropagation()); pn.addEventListener('keyup', e => e.stopPropagation());
    const ent = () => { const p = interpretar(ta.value); $('[data-k=ent]').textContent = 'La IA ha entendido: ' + (p.entendido.length ? p.entendido.join(' · ') : 'estilo por defecto (se acerca y gira, colores del vídeo)'); };
    ta.oninput = ent; ent();
    for (const c of ['dorado y morado', 'neón', 'blanco y negro', 'retro VHS', 'la cámara gira alrededor', 'se acerca', 'vuelo de dron', 'travelling lateral', 'nube de puntos', 'holograma', 'chispas', 'confeti', 'nieve', 'estrellas', 'brillo', 'glitch', 'niebla', 'explota al final', 'cámara lenta', 'rápido', 'mucho relieve', 'con el logo', 'sin sonido']) { const b = document.createElement('button'); b.textContent = '+ ' + c; b.onclick = () => { ta.value = (ta.value.trim() ? ta.value.trim().replace(/[.,]$/, '') + ', ' : '') + c; ent(); }; $('[data-k=chips]').appendChild(b); }
    let cal = localStorage.getItem(K('cal')) || 'normal';
    const grupo = (k, ops, val, set) => { const z = $(`[data-k=${k}]`); z.innerHTML = ''; for (const [v, t] of ops) { const b = document.createElement('button'); b.textContent = t; b.className = v === val ? 'sel' : ''; b.onclick = () => { set(v); z.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); }; z.appendChild(b); } };
    grupo('cal', [['rapida', 'Rápida'], ['normal', 'Normal'], ['alta', 'Alta']], cal, v => { cal = v; localStorage.setItem(K('cal'), v); });
    grupo('modo', [['antes', 'Antes de la cabecera'], ['sustituye', 'En lugar de la cabecera'], ['no', 'No sale']], modoIntro(), v => localStorage.setItem(K('modo'), v));
    let file = null, cancel = null;
    $('[data-a=elegir]').onclick = () => inp.click();
    inp.onchange = () => { file = inp.files[0]; if (file) $('[data-k=arch]').textContent = ' ' + file.name + ' (' + (file.size / 1e6).toFixed(1) + ' MB) · pulsa «Convertir»'; };
    pn.__setFile = f => { file = f; $('[data-k=arch]').textContent = ' ' + f.name; };
    const botones = on => pn.querySelectorAll('[data-a=conv],[data-a=ver],[data-a=borrar],[data-a=elegir],[data-a=guardar]').forEach(b => b.disabled = !on);
    $('[data-a=conv]').onclick = async () => {
      if (!file) { inp.click(); return; }
      const desc = ta.value + (cal !== 'normal' ? (cal === 'alta' ? ' · alta calidad' : ' · conversion rapida') : '');
      localStorage.setItem(K('desc'), ta.value);
      botones(false); $('[data-a=cancel]').style.display = ''; $('[data-k=prog]').style.display = ''; cancel = { no: false };
      const vc = $('[data-k=vc]'), vd = $('[data-k=vd]');
      try {
        const m = await convertir(file, desc, pr => {
          $('.bar i').style.width = Math.round(pr.f * 100) + '%'; $('[data-k=ptxt]').textContent = pr.txt;
          if (pr.dep) { vc.width = pr.img.width; vc.height = pr.img.height; vc.getContext('2d').drawImage(pr.img, 0, 0); vd.width = pr.dw; vd.height = pr.dh; const g = vd.getContext('2d'), id = g.createImageData(pr.dw, pr.dh); for (let k = 0; k < pr.dep.length; k++) { const x = pr.dep[k]; id.data[k * 4] = Math.min(255, x * 1.3); id.data[k * 4 + 1] = x * x / 255; id.data[k * 4 + 2] = 80 + x * 0.4; id.data[k * 4 + 3] = 255; } g.putImageData(id, 0, 0); }
        }, cancel);
        $('[data-k=ptxt]').textContent = `¡Lista! ${m.n} fotogramas convertidos a 3D en ${m.seg} s. Pulsa «Vista previa».`; $('[data-k=arch]').textContent = ' Guardada: ' + m.nombre + ' · ' + m.n + ' fotogramas 3D';
      } catch (e) { $('[data-k=ptxt]').textContent = e.message === 'cancelado' ? 'Cancelado.' : '⚠️ ' + (e.message || e); }
      botones(true); $('[data-a=cancel]').style.display = 'none';
    };
    $('[data-a=cancel]').onclick = () => { if (cancel) cancel.no = true; };
    $('[data-a=ver]').onclick = async () => { localStorage.setItem(K('desc'), ta.value); const m = await getMeta(); if (m) { m.desc = ta.value; await tx('meta', 'readwrite', st => st.put(m, 'meta')); } pn.style.display = 'none'; await reproducir({ desc: ta.value }); pn.style.display = ''; };
    $('[data-a=guardar]').onclick = async () => { localStorage.setItem(K('desc'), ta.value); const m = await getMeta(); if (m) { m.desc = ta.value; await tx('meta', 'readwrite', st => st.put(m, 'meta')); $('[data-k=ptxt]').textContent = 'Descripción guardada (no hace falta volver a convertir: el estilo se aplica al reproducir).'; $('[data-k=prog]').style.display = ''; } };
    $('[data-a=borrar]').onclick = async () => { if (!confirm('¿Borrar tu cabecera 3D de este dispositivo?')) return; await borrar(); $('[data-k=arch]').textContent = 'Ningún vídeo todavía'; ['ver', 'borrar', 'guardar'].forEach(a => $(`[data-a=${a}]`).disabled = true); };
    $('[data-a=cerrar]').onclick = () => { if (cancel && !cancel.no && $('[data-a=cancel]').style.display === '') return; pn.remove(); };
    return pn;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** fila para el menú de Opciones de cada juego (usa las clases del juego para que encaje igual) */
  function fila(o = {}) {
    const row = document.createElement(o.tag || 'div'); row.className = o.rowClass || 'orow'; row.id = 'rowMiCabecera3D';
    if (o.style) row.style.cssText = o.style;
    const lb = document.createElement(o.labelTag || 'label'); lb.textContent = o.texto || '🎥 Mi cabecera 3D (tu vídeo convertido en 3D con IA)'; if (o.labelClass) lb.className = o.labelClass; row.appendChild(lb);
    const b = document.createElement('button'); b.className = o.btnClass || 'tbtn'; b.textContent = o.boton || 'Abrir'; b.onclick = ev => { ev.stopPropagation(); abrir(); }; row.appendChild(b);
    if (o.btnStyle) b.style.cssText = o.btnStyle;
    return row;
  }
  async function hay() { return !!(await getMeta()); }
  /** al empezar el Programa completo. Devuelve true si debe SUSTITUIR a la cabecera del juego. */
  async function introPrograma() {
    try { if (window.__noMC3D || modoIntro() === 'no') return false; if (!(await hay())) return false; await reproducir(); return modoIntro() === 'sustituye'; }
    catch (e) { console.warn('[MC3D]', e); return false; }
  }
  window.MC3D = { config: o => Object.assign(CFG, o), interpretar, convertir, reproducir, vistaPrevia: () => reproducir(), abrir, fila, hay, introPrograma, borrar, BASE, version: '1.0' };
})();
