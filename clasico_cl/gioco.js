// Caduta Libera · modalità Classico: porting HTML5 dell'app originale (grafica, suoni e layout estratti dall'APK).
(() => {
const LANG = (() => { try { const v = localStorage.getItem('ac_lang'); return v === 'es' ? 'es' : 'it'; } catch (e) { return 'it'; } })();
const T = {
 it: { you: 'Tu', choose: 'Scegli il tuo avversario', turn: 'Il tuo turno', oppTurn: 'Turno di', pass: 'Passi la domanda!', wrong: 'Sbagliato, riprova!', ok: 'Esatto!',
  name: 'Il tuo nome', gender: 'Femmina? Maschio?', local: 'Profilo solo su questo dispositivo (niente Facebook): nome, foto e genere restano qui.',
  noDia: 'Non hai abbastanza diamanti', ancora: 'Ancora', al: 'Al', win: 'Hai vinto', lost: 'Sei caduto!', fellAll: 'Hai battuto tutti i 10 avversari!', fin: 'GIOCO FINALE', passB: 'PASSA', finInfo: '10 domande in 2 minuti per il montepremi!', finWin: 'Hai superato il gioco finale!', finLost: 'Il tempo è scaduto: sei caduto!',
  info: 'Sfida 10 avversari. Hai 30 secondi a turno: completa la parola con le lettere che mancano e il turno passa all\'avversario. Se il tuo tempo finisce, la botola si apre! Usa i diamanti: ◀ passa la domanda, A rivela una lettera, ⌛ aggiunge tempo.',
  stats: (s) => `Partite: ${s.p} · Avversari battuti: ${s.b} · Record: ${eur(s.r)}`, ach: (s) => `Traguardi: ${s.r >= 100000 ? '🏆' : '·'} 100.000 € · ${s.p >= 10 ? '🏆' : '·'} 10 partite · ${s.b >= 50 ? '🏆' : '·'} 50 avversari`, type: 'Scrivi la risposta' },
 es: { you: 'Tú', choose: 'Elige a tu rival', turn: 'Tu turno', oppTurn: 'Turno de', pass: '¡Pasas la pregunta!', wrong: '¡Fallo, inténtalo otra vez!', ok: '¡Correcto!',
  name: 'Tu nombre', gender: '¿Mujer? ¿Hombre?', local: 'Perfil solo en este dispositivo (sin Facebook): nombre, foto y género se quedan aquí.',
  noDia: 'No tienes suficientes diamantes', ancora: 'Faltan', al: 'Para', win: 'Has ganado', lost: '¡Has caído!', fellAll: '¡Has derribado a los 10 rivales!', fin: 'JUEGO FINAL', passB: 'PASA', finInfo: '¡10 preguntas en 2 minutos por el bote!', finWin: '¡Has superado el juego final!', finLost: 'Se acabó el tiempo: ¡has caído!',
  info: 'Reta a 10 rivales. Tienes 30 segundos por turno: completa la palabra con las letras que faltan y el turno pasa al rival. Si se te acaba el tiempo, ¡se abre la trampilla! Usa los diamantes: ◀ pasa la pregunta, A revela una letra, ⌛ añade tiempo.',
  stats: (s) => `Partidas: ${s.p} · Rivales derribados: ${s.b} · Récord: ${eur(s.r)}`, ach: (s) => `Logros: ${s.r >= 100000 ? '🏆' : '·'} 100.000 € · ${s.p >= 10 ? '🏆' : '·'} 10 partidas · ${s.b >= 50 ? '🏆' : '·'} 50 rivales`, type: 'Escribe la respuesta' } }[LANG];
const NOMI_M = ['Silvio','Marco','Luca','Giorgio','Paolo','Franco','Davide','Matteo','Enzo','Carlo','Stefano','Nicola','Pietro','Alberto','Gianni'];
const NOMI_F = ['Giulia','Chiara','Sara','Elena','Francesca','Laura','Marta','Silvia','Anna','Paola','Federica','Valeria','Rosa','Ilaria','Monica'];
const VALORI = [20000, 15000, 15000, 10000, 10000, 10000, 7000, 5000, 5000, 3000];
const PRZ = ['prize_5_20000_l', 'prize_5_15000_r', 'prize_4_15000_l', 'prize_4_10000_r', 'prize_3_10000_l', 'prize_3_10000_r', 'prize_2_7000_l', 'prize_2_5000_r', 'prize_1_5000_l', 'prize_1_3000_r'];
const $ = (s) => document.querySelector(s), L = window.CL_LAYOUT;
const eur = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
const place = (el, k) => { const v = L[k]; if (!v) return; el.src = 'img/' + k + '.webp'; Object.assign(el.style, { left: v[0] + 'px', top: v[1] + 'px', width: v[2] + 'px', height: v[3] + 'px' }); };
document.querySelectorAll('[data-k]').forEach((e) => place(e, e.dataset.k));
// escala
const fit = () => { const s = Math.min(innerWidth / 540, innerHeight / 960); const st = $('#st'); st.style.transform = `scale(${s}) translate(-50%,-50%)`; st.style.transformOrigin = '0 0'; st.style.left = '50%'; st.style.top = '50%'; st.style.transform = `translate(-50%,-50%) scale(${s})`; st.style.transformOrigin = 'center'; };
addEventListener('resize', fit); fit();
// sonido
let mute = false; const SND = {}; const snd = (n, loop) => { if (mute) return null; try { const a = SND[n] || (SND[n] = new Audio('snd/' + n + '.mp3')); a.loop = !!loop; a.dataset.want = loop ? '1' : ''; a.currentTime = 0; a.play().catch(() => {}); return a; } catch (e) { return null; } };
const stop = (n) => { const a = SND[n]; if (a) { a.dataset.want = ''; a.pause(); a.currentTime = 0; } };
// stato persistente
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem('cl_' + k)) ?? d; } catch (e) { return d; } }, sv = (k, v) => { try { localStorage.setItem('cl_' + k, JSON.stringify(v)); } catch (e) {} };
let prof = ld('prof', null), stats = ld('stats', { p: 0, b: 0, r: 0 }), dia = ld('dia', 200);
const scr = (id) => { killAll && 0; document.querySelectorAll('.scr').forEach((s) => s.classList.toggle('on', s.id === id)); };
const pop = (t, ms = 2200) => new Promise((r) => { const p = $('#pop'); p.innerHTML = t; p.style.display = 'block'; setTimeout(() => { p.style.display = 'none'; r(); }, ms); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const myPic = () => prof && prof.pic ? prof.pic : 'img/ppl_sprite/avatar_' + (prof && prof.g === 'f' ? 'woman' : 'man') + '.webp';
const setDia = () => { document.querySelectorAll('.dia').forEach((d) => d.textContent = dia); sv('dia', dia); };
// MENU
$('#mPlay').onclick = () => { snd('Pass_2'); prof ? nuovaPartita() : apriProfilo(true); };
$('#mAch').onclick = () => pop(T.ach(stats), 3000); $('#mStat').onclick = () => pop(T.stats(stats), 3000);
$('#mProf').onclick = () => apriProfilo(false);
$('#mInfo').onclick = () => pop(T.info, 6500);
$('#mSnd').onclick = () => { mute = !mute; $('#mSnd').src = 'img/screen1_sprite_hd/button_sound_' + (mute ? 'off' : 'on') + '.webp'; if (mute) Object.values(SND).forEach((a) => a.pause()); };
const menu = () => { scr('sMenu'); stop('head_to_head_music'); $('#mBest').textContent = T.stats(stats); snd('intro-shorter'); };
// PROFILO
let profNext = false, tmp = null;
function apriProfilo(next) { profNext = next; tmp = Object.assign({ n: '', g: 'm', pic: null }, prof || {}); scr('sProf'); $('#pName').value = tmp.n; $('#pName').placeholder = T.name; $('#pNameL').textContent = T.name; $('#pGenL').textContent = T.gender; $('#pLocal').textContent = T.local; drawGen(); }
const drawGen = () => { $('#pW').style.cssText='left:170px;top:640px;width:90px';$('#pM').style.cssText='left:285px;top:640px;width:90px';
  $('#pW').src = 'img/screen1_sprite_hd/manage_button_gender_woman_' + (tmp.g === 'f' ? 'on' : 'off') + '.webp'; $('#pM').src = 'img/screen1_sprite_hd/manage_button_gender_man_' + (tmp.g === 'm' ? 'on' : 'off') + '.webp';
  $('#pPic').style.backgroundImage = `url(${tmp.pic || 'img/ppl_sprite/avatar_' + (tmp.g === 'f' ? 'woman' : 'man') + '.webp'})`; };
$('#pW').onclick = () => { tmp.g = 'f'; drawGen(); }; $('#pM').onclick = () => { tmp.g = 'm'; drawGen(); };
$('#pCam').onclick = () => $('#pFile').click(); $('#pPic').onclick = () => $('#pFile').click();
$('#pFile').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 220; const g = c.getContext('2d'); const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 220, 220); tmp.pic = c.toDataURL('image/jpeg', 0.85); drawGen(); }; im.src = URL.createObjectURL(f); };
$('#pClose').onclick = () => menu();
$('#pOk').onclick = () => { tmp.n = ($('#pName').value.trim() || T.you).slice(0, 12); prof = tmp; sv('prof', prof); profNext ? nuovaPartita() : menu(); };
// ===== motor tipo Corona: sprites centrados + transiciones (port fiel de Indoor / HeadToHead / DropScene) =====
const SEQ = window.CL_SEQ, PPL = window.CL_PPL;
const EZ = { lin: (t) => t, outQuart: (t) => 1 - Math.pow(1 - t, 4), inQuart: (t) => t * t * t * t, inQuint: (t) => t ** 5, outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutQuart: (t) => t < .5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2,
  inOutBack: (t) => { const c = 1.70158 * 1.525; return t < .5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; } };
let TW = [], timers = [];
const later = (ms, f) => { const t = setTimeout(f, ms); timers.push(t); return t; };
const killAll = () => { TW = []; timers.forEach(clearTimeout); timers = []; };
function tween(o, to, { time = 500, delay = 0, ease = 'lin', done } = {}) { const tw = { o, to, time, ease: EZ[ease] || EZ.lin, start: performance.now() + delay, from: null, done }; TW.push(tw); return tw; }
(function loop(now) { requestAnimationFrame(loop); TW = TW.filter((tw) => { if (now < tw.start) return true; if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.o[k]; }
  const p = Math.min(1, (now - tw.start) / Math.max(1, tw.time)), e = tw.ease(p); for (const k in tw.to) tw.o[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e; tw.o.draw && tw.o.draw();
  if (p >= 1) { tw.done && tw.done(); return false; } return true; }); })(performance.now());
class Spr { // como display.newImage(sheet, frame, x, y): el centro del marco original va en (x, y)
  constructor(par, key, x = 270, y = 480, opt = {}) { this.el = document.createElement(opt.head ? 'div' : 'img'); this.el.className = 'sp' + (opt.head ? ' head' : ''); this.x = x; this.y = y; this.sx = 1; this.sy = 1; this.rot = 0; this.alpha = 1; this.r = opt.r;
    if (opt.head) { this.el.style.backgroundImage = `url(${key})`; this.el.style.width = this.el.style.height = 2 * opt.r + 'px'; } else this.frame(key); par.appendChild(this.el); this.draw(); }
  frame(key) { this.k = key; const v = L[key] || [0, 0, 0, 0, 0, 0]; this.v = v; this.el.src = 'img/' + key + '.webp'; Object.assign(this.el.style, { width: v[2] + 'px', height: v[3] + 'px' }); this.draw && this.draw(); return this; }
  draw() { let l, t, ox, oy; if (this.r != null) { l = this.x - this.r; t = this.y - this.r; ox = oy = this.r; } else { const v = this.v; l = this.x - v[4] / 2 + v[0]; t = this.y - v[5] / 2 + v[1]; ox = v[4] / 2 - v[0]; oy = v[5] / 2 - v[1]; }
    const s = this.el.style; s.left = l + 'px'; s.top = t + 'px'; s.transformOrigin = `${ox}px ${oy}px`; s.transform = `rotate(${this.rot}deg) scale(${this.sx},${this.sy})`; s.opacity = this.alpha; }
}
const play = (o, frames, time, loops = 1) => { const n = frames.length, step = time / n; let k = 0; const f = () => { o.frame(frames[k % n]); k++; if (k < n * loops) later(step, f); }; f(); };
const txt = (par, t, x, y, w, size, col = '#fff', font = 'Arial') => { const d = document.createElement('div'); d.className = 'txt'; Object.assign(d.style, { left: (x - w / 2) + 'px', width: w + 'px', top: (y - size * .6) + 'px', font: `${size}px ${font}`, color: col, textShadow: 'none' }); d.textContent = t; par.appendChild(d); return d; };
const fadeTo = async (id, ms = 500) => { const cur = document.querySelector('.scr.on'), nx = $('#' + id); nx.style.transition = ''; nx.style.opacity = 0; nx.classList.add('on'); nx.offsetWidth; nx.style.transition = `opacity ${ms}ms`; nx.style.opacity = 1; if (cur && cur !== nx) { cur.style.transition = `opacity ${ms}ms`; cur.style.opacity = 0; } await sleep(ms); document.querySelectorAll('.scr').forEach((s) => { if (s !== nx) { s.classList.remove('on'); s.style.opacity = ''; } }); };
const lienzo = (id, bg) => { const r = $('#' + id); r.innerHTML = ''; const b = document.createElement('img'); b.className = 'bg'; b.src = 'img/' + bg + '.webp'; r.appendChild(b); return r; };
// ===== PARTITA =====
let G = null;
const VAL = [[20000, 'prize_5_20000_l'], [15000, 'prize_5_15000_r'], [15000, 'prize_4_15000_l'], [10000, 'prize_4_10000_r'], [10000, 'prize_3_10000_l'], [10000, 'prize_3_10000_r'], [7000, 'prize_2_7000_l'], [5000, 'prize_2_5000_r'], [5000, 'prize_1_5000_l'], [3000, 'prize_1_3000_r']];
const ANG = [306, 342, 18, 54, 90, 126, 162, 198, 234, 270];
const mazzo = () => { const a = window.CL_DOMANDE.map((d) => LANG === 'es' ? [d[2], d[3]] : [d[0], d[1]]); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function nuovaPartita() {
  const men = PPL.filter((p) => p.startsWith('man')).sort(() => Math.random() - .5), wom = PPL.filter((p) => p.startsWith('woman')).sort(() => Math.random() - .5);
  const vals = VAL.map((v, i) => i).sort(() => Math.random() - .5);
  const opp = []; for (let i = 0; i < 10; i++) { const f = Math.random() < .5, lst = f ? NOMI_F : NOMI_M;
    opp.push({ img: 'img/ppl_sprite/' + (f ? wom : men).pop() + '.webp', f, nome: lst[Math.random() * lst.length | 0], pz: vals[i], val: VAL[vals[i]][0], out: false, ang: ANG[i], level: 40 + (Math.random() * 30 | 0), body: f ? (Math.random() < .5 ? 2 : 3) : (Math.random() < .5 ? 1 : 4) }); }
  G = { opp, bank: 0, q: mazzo(), qi: 0, round: 0 }; stats.p++; sv('stats', stats); board(false);
}
const myBody = () => prof.g === 'f' ? 2 : 1;
const BODYDIR = ['', 'seq1_suit-hd', 'seq2_hasuda-hd', 'seq3_yellow-hd', 'seq4_sweater-hd'];
// ----- TABELLONE (Indoor) -----
async function board(addDia) {
  killAll(); stop('head_to_head_music'); const r = lienzo('sBoard', 'bg2'); const CY = 960 * .705;
  const h1 = new Spr(r, 'screen2_sprite_hd/compass_point_halo1', 270, CY), h2 = new Spr(r, 'screen2_sprite_hd/compass_point_halo2', 270, CY), cp = new Spr(r, 'screen2_sprite_hd/compass_point', 270, CY);
  let it = 0; const comp = () => { it++; tween(h1, { rot: -360 * it }, { time: 17000, done: comp }); tween(h2, { rot: 360 * it }, { time: 17000 }); }; comp();
  new Spr(r, 'screen2_sprite_hd/player_body' + myBody()); new Spr(r, myPic(), 270, CY, { head: 1, r: 70 }); const pf = new Spr(r, 'screen2_sprite_hd/head_frame', 270, CY); pf.sx = pf.sy = 1.2; pf.draw();
  const board = document.createElement('div'), left = document.createElement('div'); r.append(board, left);
  G.opp.forEach((o, i) => { const a = (36 * (i + 1)) * Math.PI / 180, x = 200 * Math.cos(a) + 270, y = 200 * Math.sin(a) + CY;
    const st = new Spr(r, 'screen2_sprite_hd/otherman_fell_icon', x, y); st.rot = o.ang; st.alpha = o.out ? 1 : 0; st.draw();
    if (!o.out) { const hd = new Spr(r, o.img, x, y, { head: 1, r: 57.5 }); new Spr(r, 'screen2_sprite_hd/head_frame', x, y); hd.el.classList.add('bt'); hd.el.onclick = () => scegli(i, cp); }
    new Spr(board, 'screen2_sprite_hd/' + VAL[o.pz][1] + (o.out ? '_dark' : '_light')); });
  new Spr(left, 'screen2_sprite_hd/to_million_label_bg'); new Spr(left, 'screen2_sprite_hd/to_million_label_' + Math.max(1, G.opp.filter((o) => !o.out).length)); left.style.opacity = 0;
  for (const k of ['button_home', 'score_middle', 'score_right', 'score_left', 'diamonds_count_bg']) { const s = new Spr(r, 'screen2_sprite_hd/' + k); if (k === 'button_home') { s.el.classList.add('bt'); s.el.onclick = () => { killAll(); menu(); }; } }
  const dv = L['screen2_sprite_hd/diamonds_count_bg'], dt = txt(r, dia, dv[0] + dv[2] / 2, dv[1] + dv[3] / 2, 100, 25);
  new Spr(r, 'screen2_sprite_hd/diamonds_bg'); new Spr(r, 'screen2_sprite_hd/diamonds_on');
  const sm = L['screen2_sprite_hd/score_middle']; txt(r, eur(G.bank), 270, sm[1] + sm[3] / 2, 324, 32, '#ffff00');
  for (const [k, f] of [['profile_frame', () => apriProfilo(false)], ['statistics_frame', () => pop(T.stats(stats), 3000)], ['achievment_frame', () => pop(T.ach(stats), 3000)]]) { const s = new Spr(r, 'screen2_sprite_hd/' + k); s.el.classList.add('bt'); s.el.onclick = f; }
  await fadeTo('sBoard', G.round ? 500 : 300); snd('intro-shorter');
  // tabellone ⇄ «Ancora N al milione» (como replaceBoardStatus cada 2,5 s)
  later(5000, () => { board.style.opacity = 0; left.style.opacity = 1; }); later(7500, () => { board.style.opacity = 1; left.style.opacity = 0; });
  if (addDia) { const n = 10 + 5 * G.round; dia += n; setDia(); dt.textContent = dia; snd('money_total'); const f = txt(r, '+' + n, dv[0] + dv[2] / 2, dv[1] + dv[3] / 2, 100, 27); const o = { y: 0, a: 1, draw() { f.style.transform = `translateY(${this.y}px)`; f.style.opacity = this.a; } }; tween(o, { y: -300, a: 0 }, { time: 2500 }); }
  busy = false;
}
let busy = false;
function scegli(i, cp) { if (busy) return; busy = true; snd('Correct_16'); tween(cp, { rot: G.opp[i].ang - 180 }, { time: 300 }); later(500, () => duello(i)); }
// ----- DUELLO (HeadToHead) -----
let D = null;
const PX = 365, PY = 150, OX = 192.5, CLY = PY + 86;
const letra = (c, tipo) => { const ch = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/[0-9]/.test(ch)) return `letters_${tipo}_n${ch}`; if (ch === "'") return `letters_${tipo}_apostrophe`; if (ch === '.') return `letters_${tipo}_dot`; if (ch === '/') return `letters_${tipo}_slash`; if (ch === '-') return `letters_${tipo}_separator`;
  if (!/[a-z]/.test(ch)) return `letters_${tipo}_separator`; const n = ch.charCodeAt(0) - 96; const sp = tipo === 'opponent' ? { u: '21.1u' } : { i: '9.1i', n: '14.1n', o: '15.1o', u: '21.1u' }; return `letters_${tipo}_${sp[ch] || n + ch}`; };
async function duello(i) {
  killAll(); const r = lienzo('sDuel', 'bg3'); const o = G.opp[i];
  D = { i, o, r, who: 0, q: null, guide: [], typed: [], end: false, turnos: 0, qn: 0 };
  D.ti = new Spr(r, 'screen3_sprite_hd/turn_indicator', PX - 2.5, PY); D.nm = txt(r, prof.n, PX - 2.5, prof.n.length >= 12 ? 62.5 : 82.5, 130, 21); D.nm.style.top = ((prof.n.length >= 12 ? 62.5 : 82.5) - 48) + 'px'; D.nm.style.opacity = 0;
  new Spr(r, myPic(), PX, PY, { head: 1, r: 72.5 }); D.pf = new Spr(r, 'screen3_sprite_hd/head_frame_onturn', PX, PY);
  new Spr(r, o.img, OX, PY, { head: 1, r: 72.5 }); D.of = new Spr(r, 'screen3_sprite_hd/head_frame_offturn', OX, PY);
  D.cm = new Spr(r, 'screen3_sprite_hd/timer_middle', PX, CLY); D.cm.sx = .1; D.cm.draw(); D.cr = new Spr(r, 'screen3_sprite_hd/timer_right', PX, CLY); D.cl = new Spr(r, 'screen3_sprite_hd/timer_left', PX, CLY);
  D.tt = txt(r, '00:30', PX, CLY, 120, 25, '#ffff00', 'Helvetica,Arial'); D.ttO = { x: PX, a: 0, draw() { D.tt.style.left = (this.x - 60) + 'px'; D.tt.style.opacity = this.a; } }; D.ttO.draw(); D.ti.sx = 1; 
  for (const k of ['diamonds_count_bg', 'diamonds_bg', 'diamonds_on']) new Spr(r, 'screen3_sprite_hd/' + k);
  const dv = L['screen3_sprite_hd/diamonds_count_bg']; D.dt = txt(r, dia, dv[0] + dv[2] / 2, dv[1] + dv[3] / 2, 90, 22);
  D.pu = {}; for (const [k, f] of [['powerup_passquestion', puPass], ['powerup_moretime', puTime], ['powerup_moreletter', puLet]]) { const s = new Spr(r, 'screen3_sprite_hd/' + k); s.el.classList.add('bt'); s.el.onclick = () => { if (D.who !== 0 || D.end || D.wait) return; tween(s, { sx: .95, sy: .95 }, { time: 60 }); tween(s, { sx: 1, sy: 1 }, { time: 60, delay: 80 }); f(s); }; D.pu[k] = s; }
  D.qt = document.createElement('div'); D.qt.className = 'txt'; Object.assign(D.qt.style, { left: '13px', width: '513px', top: '320px', font: '23px Arial', textShadow: 'none', lineHeight: '27px' }); r.appendChild(D.qt);
  D.tiles = document.createElement('div'); r.appendChild(D.tiles);
  await fadeTo('sDuel', 700); snd('head_to_head_music', true);
  apriOrologio(); D.t = 30000; later(1500, () => { nuovaDomanda(); D.last = performance.now(); D.run = true; });
  clearInterval(D.loop); D.loop = setInterval(ciclo, 33); $('#kb').value = ''; setTimeout(() => $('#kb').focus(), 300);
}
const fmt = (ms) => { ms = Math.max(0, ms); return String(Math.floor(ms / 1000)).padStart(2, '0') + ':' + String(Math.floor(ms % 1000 / 10)).padStart(2, '0'); };
function apriOrologio() { const x = D.cm.x; D.ti.alpha = 1; tween(D.ti, { sx: 1 }, { time: 500, delay: 500 }); tween(D.cm, { sx: 1 }, { time: 500, delay: 500 }); tween(D.cr, { x: x + 50 }, { time: 500, delay: 500 }); tween(D.cl, { x: x - 50 }, { time: 500, delay: 500 }); const n = { a: 0, draw() { D.nm.style.opacity = this.a; } }; tween(n, { a: 1 }, { time: 500, delay: 800 }); }
function chiudiEPassa(toMe) { const n = { a: 1, draw() { D.nm.style.opacity = this.a; } }; tween(n, { a: 0 }, { time: 500 }); tween(D.ti, { sx: 0.000001 }, { time: 500, delay: 500 }); tween(D.cm, { sx: .1 }, { time: 500, delay: 500 }); tween(D.cr, { x: D.cm.x }, { time: 500, delay: 500 }); tween(D.cl, { x: D.cm.x }, { time: 500, delay: 500 });
  tween(D.ttO, { a: 0 }, { time: 500, delay: 500, done: () => { const X = toMe ? PX : OX; D.nm.textContent = toMe ? prof.n : D.o.nome; D.nm.style.left = (X - 2.5 - 65) + 'px'; D.ti.alpha = 0; D.ti.draw(); D.ti.alpha = 1;
    tween(D.ti, { x: X - 2.5 }, { time: 500, delay: 500 }); tween(D.cm, { x: X }, { time: 500, delay: 500 }); tween(D.cr, { x: X, rot: toMe ? 0 : -360 }, { time: 500, delay: 500 }); tween(D.cl, { x: X, rot: toMe ? 0 : -360 }, { time: 500, delay: 500 }); tween(D.ttO, { x: X }, { time: 500, delay: 500, done: apriOrologio }); } }); }
function nuovaDomanda(keep) {
  if (!keep) { if (G.qi >= G.q.length) { G.q = mazzo(); G.qi = 0; } D.q = G.q[G.qi++]; const a = [...D.q[1].toUpperCase()]; const idx = a.map((c, k) => /\p{L}|\d/u.test(c) ? k : -1).filter((k) => k >= 0);
    const n = Math.max(1, Math.round(idx.length * (0.4 - Math.min(0.2, G.round * 0.02)))); const sh = new Set(idx.sort(() => Math.random() - .5).slice(0, n)); if (sh.size >= idx.length) sh.delete(idx[0]);
    D.ans = a; D.fixed = a.map((c, k) => c === ' ' || !/\p{L}|\d/u.test(c) || sh.has(k)); }
  D.typed = []; D.qt.textContent = D.q[0]; tween(D.ttO, { a: 1 }, { time: 250 }); D.t = 30000; D.warn = 0; D.err = true; D.wait = false; D.dec = false;
  if (D.who === 0) { D.pf.frame('screen3_sprite_hd/head_frame_onturn'); D.of.frame('screen3_sprite_hd/head_frame_offturn'); } else { D.turnos++; D.pf.frame('screen3_sprite_hd/head_frame_offturn'); D.of.frame('screen3_sprite_hd/head_frame_onturn'); }
  drawTiles();
}
function drawTiles(full) { // GuideManager.showOnScreen: righe da 13, centrate, y = 355 + 57,5·riga
  const box = D.tiles; box.innerHTML = ''; const a = D.ans, tipoOn = D.who === 0 ? 'on' : 'opponent'; const words = []; let w = [];
  a.forEach((c, k) => { if (c === ' ') { words.push(w); w = []; } else w.push(k); }); words.push(w);
  const rows = []; let row = [], cnt = 0; for (const wd of words) { if (row.length && cnt + wd.length > 13) { rows.push(row); row = []; cnt = 0; } row.push(wd); cnt += wd.length + 1; } rows.push(row);
  let ti = 0, cursor = null; const vals = []; for (const k of a.keys()) { if (a[k] === ' ') continue; if (D.fixed[k]) vals.push([k, 'fixed', a[k]]); else { const t = full ? a[k] : D.typed[ti++]; vals.push([k, t ? tipoOn : null, t]); if (!t && cursor == null) cursor = k; } }
  const map = new Map(vals.map((v) => [v[0], v]));
  rows.forEach((rw, ri) => { const size = rw.reduce((s, wd, j) => s + wd.length + (j < rw.length - 1 ? 1 : 0), 0); let x = (526.5 - size * 39) / 2 + 39 * .7; const y = 355 + 57.5 * (ri + 1);
    rw.forEach((wd) => { wd.forEach((k) => { const [, tipo, ch] = map.get(k); new Spr(box, 'letters_sprite_hd/' + (tipo ? letra(ch, tipo) : (D.who === 0 ? 'letters_blank' : 'letters_oppontnt_blank')), x, y); if (k === cursor && D.who === 0 && !full) new Spr(box, 'letters_sprite_hd/letters_on_light', x, y); x += 39; }); x += 39; }); });
}
const libere = () => D.ans.filter((c, k) => !D.fixed[k] && c !== ' ').length;
const risposta = () => { let ti = 0; return D.ans.map((c, k) => D.fixed[k] ? c : (D.typed[ti++] || '')).join(''); };
function ciclo() { if (!D || D.end || !D.run) return; const now = performance.now(); if (!D.wait) D.t -= now - D.last; D.last = now; D.tt.textContent = D.fin ? fmtM(D.t) : fmt(D.t);
  if (D.who === 1 && !D.dec && !D.wait) { D.dec = true; if (decideAI()) { const qn = G.qi; const dl = Math.random() > .2 ? (qn <= 2 ? 5500 + Math.random() * 2000 : qn <= 5 ? 6500 + Math.random() * 1000 : 7500 + Math.random() * 1000) : 8500 + Math.random() * 1500; D.aiT = later(dl, () => { if (!D.end && D.who === 1 && !D.wait) rispondeAI(); }); } }
  if (D.t <= 5500 && !D.warn && !D.wait) { D.warn = 1; snd('time_running_out'); }
  if (D.fin && D.t <= 0 && !D.wait) { D.end = true; return finTempo(); }
  if (D.t <= 0 && !D.wait) { D.t = 0; D.tt.textContent = fmt(0); D.end = true; stop('head_to_head_music'); $('#kb').blur(); later(1000, () => { snd('yes1'); drawTiles(true); }); later(3000, () => caduta(D.who === 0 ? 'me' : 'opp')); } }
function decideAI() { const t = D.turnos, rf = G.round * 2; let n; if (t <= 1) return true; else if (t <= 3) n = Math.random() * (D.o.level + 20 + rf); else if (t <= 4) n = Math.random() * (D.o.level + 15 + rf); else if (t <= 5) n = Math.random() * (D.o.level + 10 + rf); else if (t <= 7) n = Math.random() * (D.o.level - 20 + rf); else return false; return n >= 60; }
function rispondeAI() { snd('yes1'); D.typed = D.ans.filter((c, k) => !D.fixed[k] && c !== ' '); drawTiles(); later(150, () => giusto()); }
function giusto() { stop('time_running_out'); snd('correct answer'); D.wait = true; const toMe = D.who === 1; chiudiEPassa(toMe); later(3700, () => { if (D.end) return; D.who = toMe ? 0 : 1; nuovaDomanda(); D.last = performance.now(); if (toMe) $('#kb').focus(); }); }
$('#kb').addEventListener('input', () => { if (!D || D.who !== 0 || D.end || D.wait) { $('#kb').value = ''; return; } const v = norm($('#kb').value); const need = libere(); $('#kb').value = v.slice(0, need); D.typed = [...v.slice(0, need)]; drawTiles();
  if (D.typed.length >= need) { if (norm(risposta()) === norm(D.ans.join(''))) (D.fin ? finOk() : giusto()); else if (D.err) { snd('error'); D.err = false; if (D.fin) later(500, () => { if (!D.end) { $('#kb').value = ''; D.typed = []; drawTiles(); } }); } } else D.err = true; });
$('#sDuel').addEventListener('click', (e) => { if (!e.target.closest('.bt')) $('#kb').focus(); });
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const costo = (s, c) => { if (dia < c) { pop(T.noDia, 1500); return false; } dia -= c; setDia(); D.dt.textContent = dia; const f = txt(D.r, '-' + c, s.x, s.y, 90, 25, '#ff4040'); const o = { y: 0, a: 1, draw() { f.style.transform = `translateY(${this.y}px)`; f.style.opacity = this.a; } }; tween(o, { y: -125, a: 0 }, { time: 1500 }); return true; };
function puPass(s) { if (!costo(s, 30)) return; snd('Pass_2'); stop('time_running_out'); D.wait = true; chiudiEPassa(false); later(3700, () => { if (D.end) return; D.who = 1; nuovaDomanda(true); D.last = performance.now(); }); }
function puTime(s) { if (!costo(s, 25)) return; snd('Correct_7'); stop('time_running_out'); D.t += 10000; D.warn = 0; $('#kb').focus(); }
function puLet(s) { const libs = D.ans.map((c, k) => !D.fixed[k] && c !== ' ' ? k : -1).filter((k) => k >= 0); if (libs.length < 2) return; if (!costo(s, 20)) return; snd('Reveal'); D.fixed[libs[Math.random() * libs.length | 0]] = true; D.typed = []; $('#kb').value = ''; drawTiles(); $('#kb').focus(); }
// ----- CADUTA (DropScene) -----
async function caduta(loser) {
  clearInterval(D.loop); killAll(); stop('head_to_head_music'); stop('time_running_out'); const myTurn = loser === 'me'; const r = lienzo('sDrop', 'bg4');
  const c1 = document.createElement('div'), c2 = document.createElement('div'); r.append(c1, c2); new Spr(c1, 'screen4_sprite_hd/left_tube_cover_l'); new Spr(c1, 'screen4_sprite_hd/left_tube_cover_r'); new Spr(c2, 'screen4_sprite_hd/right_tube_cover_l'); new Spr(c2, 'screen4_sprite_hd/right_tube_cover_r');
  const ob = D.o.body, pb = myBody(); const wB = myTurn ? ob : pb, lB = myTurn ? pb : ob;
  const wd = 'win-' + BODYDIR[wB], ld = 'lose-' + BODYDIR[lB], W = SEQ[wd].map((f) => wd + '/' + f), Lf = SEQ[ld].map((f) => ld + '/' + f);
  const lx = myTurn ? 405 : 150, wx = myTurn ? 150 : 405, wxh = myTurn ? 142.5 : 397.5, by = 960 * .29, hy = 960 * .285;
  const lg = document.createElement('div'), wg = document.createElement('div'); r.append(lg, wg);
  const loseBody = new Spr(lg, Lf[0], lx, by), oppH = { img: D.o.img }, loseHead = new Spr(lg, myTurn ? myPic() : D.o.img, myTurn ? 405 : 142.5, 175, { head: 1, r: 74 }), loseHands = new Spr(lg, Lf[3], lx, hy);
  const winBody = new Spr(wg, W[0], wx, by), winHead = new Spr(wg, myTurn ? D.o.img : myPic(), myTurn ? 142.5 : 405, 175, { head: 1, r: 74 }), winHands = new Spr(wg, W[17], wxh, hy);
  const machine = new Spr(r, 'screen4_sprite_hd/prize_machine', 270, 1920), circ = new Spr(r, 'screen4_sprite_hd/number_circle_background', 150, 1920 - 262 + 25), amt = new Spr(r, 'screen4_sprite_hd/number_circle_prize_' + D.o.val, 150, 1920 - 262 + 25);
  circ.rot = amt.rot = 180; circ.draw(); amt.draw(); r.insertBefore(circ.el, machine.el); r.insertBefore(amt.el, machine.el); new Spr(r, 'screen4_sprite_hd/tubes_front', 270, 580);
  await fadeTo('sDrop', 500); await sleep(1500);
  // dropAction
  snd('contestant_Lock_2_A'); const cv = myTurn ? c2 : c1; cv.style.transition = 'opacity .1s'; cv.style.opacity = 0;
  // winner
  tween(winHead, { y: 185 }, { time: 400, ease: 'inOutBack' }); tween(winHead, { y: 155, x: winHead.x - 5, rot: -10 }, { time: 500, delay: 300, ease: 'inOutBack' }); play(winBody, W.slice(0, 17), 600); play(winHands, W.slice(17), 850);
  tween(winHead, { sx: 1.1, sy: .9 }, { time: 600, delay: 300, ease: 'inOutBack' }); tween(winHead, { sx: 1, sy: 1 }, { time: 600, delay: 700, ease: 'outCubic' });
  // loser
  for (const s of [loseHead, loseHands, loseBody]) tween(s, { y: s.y - 25 }, { time: 400, ease: 'outQuart' });
  play(loseBody, Lf.slice(0, 3), 400); loseHands.frame(Lf[3]); later(400, () => play(loseHands, Lf.slice(4, 15), 1500)); later(1400, () => play(loseHands, Lf.slice(15, 26), 750, 3));
  for (const s of [loseHead, loseHands, loseBody]) tween(s, { y: s.y + 325 }, { time: 1500, delay: 350, ease: 'inOutQuart' });
  tween(loseHead, { sx: .7, sy: 1.3 }, { time: 500, delay: 800, ease: 'inQuint' });
  tween(loseHead, { y: 960 + 500 }, { time: 1000, delay: 2200, ease: 'inQuart' }); tween(loseHands, { sx: .7, y: 960 + 500 }, { time: 1000, delay: 2200, ease: 'inQuart' }); tween(loseBody, { y: 960 + 500 + 230 }, { time: 1000, delay: 2200, ease: 'inQuart' });
  if (!myTurn) { later(5000, () => snd('open_coin')); tween(machine, { y: 480 }, { time: 1500, delay: 3000 }); for (const s of [circ, amt]) { tween(s, { y: 480 - 262 + 25 }, { time: 1500, delay: 3000 }); tween(s, { rot: 360 }, { time: 2250, delay: 5000 }); }
    await sleep(7250 + 1500); D.o.out = true; G.bank += D.o.val; G.round++; stats.b++; sv('stats', stats); if (G.opp.every((o) => o.out)) return giocoFinale(); board(true); }
  else { await sleep(4500); finePartita(false); }
}

// ----- GIOCO FINALE (come il juego final di ¡Ahora Caigo! Antena 3 2011-2021): da solo sulla botola centrale,
// 10 domande in 2:00; se le indovini tutte prima che scada il tempo porti a casa il montepremi, se no la botola si apre.
const fmtM = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const PIE = (c) => `<svg viewBox="0 0 50 50"><g fill="${c}"><ellipse cx="18" cy="18" rx="6" ry="10"/><ellipse cx="18" cy="36" rx="5" ry="6"/><ellipse cx="32" cy="16" rx="6" ry="10"/><ellipse cx="32" cy="34" rx="5" ry="6"/></g></svg>`;
const ORMA = (x, y, w, rot) => { const d = document.createElement('div'); d.className = 'sp'; d.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w}px;opacity:.55;transform:rotate(${rot}deg)`; d.innerHTML = `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="none" stroke="#ffcf4a" stroke-width="6"/><g fill="#ffcf4a"><ellipse cx="72" cy="68" rx="24" ry="42"/><ellipse cx="72" cy="146" rx="20" ry="24"/><ellipse cx="130" cy="58" rx="24" ry="42"/><ellipse cx="130" cy="136" rx="20" ry="24"/></g></svg>`; return d; };
async function giocoFinale() {
  killAll(); stop('head_to_head_music'); const r = lienzo('sFin', 'bg1');
  if (LANG === 'es' && window.__LOGO_AC) { const l = document.createElement('img'); l.src = window.__LOGO_AC; l.className = 'sp'; l.style.cssText = 'left:84px;top:-2px;width:372px;height:280px;object-fit:contain'; r.appendChild(l); }
  const CY = 960 * .705; const h1 = new Spr(r, 'screen2_sprite_hd/compass_point_halo1', 270, CY), h2 = new Spr(r, 'screen2_sprite_hd/compass_point_halo2', 270, CY);
  tween(h1, { rot: -360 }, { time: 17000 }); tween(h2, { rot: 360 }, { time: 17000 });
  new Spr(r, 'screen2_sprite_hd/player_body' + myBody()); new Spr(r, myPic(), 270, CY, { head: 1, r: 70 }); const pf = new Spr(r, 'screen2_sprite_hd/head_frame', 270, CY); pf.sx = pf.sy = 1.2; pf.draw();
  const t = document.createElement('div'); t.id = 'gfT'; t.textContent = T.fin; r.appendChild(t);
  const sub = txt(r, T.finInfo + '  ' + eur(G.bank), 270, 900, 520, 22, '#ffd84a'); sub.style.textShadow = '0 2px 3px #000';
  await fadeTo('sFin', 700); snd('intro-shorter'); await sleep(3600);
  // schermo del gioco finale
  const q = lienzo('sFin', 'bg3'); r.appendChild(ORMA(-70, 780, 230, -18)); r.appendChild(ORMA(380, 780, 230, 18));
  D = { fin: true, i: -1, o: null, r: q, who: 0, q: null, typed: [], end: false, turnos: 0, ok: 0, coda: [] };
  for (let k = 0; k < 10; k++) { if (G.qi >= G.q.length) { G.q = mazzo(); G.qi = 0; } D.coda.push(G.q[G.qi++]); }
  new Spr(q, myPic(), 270, PY, { head: 1, r: 72.5 }); D.pf = new Spr(q, 'screen3_sprite_hd/head_frame_onturn', 270, PY);
  D.mk = []; for (let k = 0; k < 10; k++) { const c = document.createElement('div'); c.className = 'gfc'; c.style.left = (8 + (k % 2) * 56) + 'px'; c.style.top = (14 + Math.floor(k / 2) * 54 + (k % 2) * 27) + 'px'; c.innerHTML = PIE('#fff'); q.appendChild(c); D.mk.push(c); }
  const TX = 430, TY = 236; D.cm = new Spr(q, 'screen3_sprite_hd/timer_middle', TX, TY); D.cr = new Spr(q, 'screen3_sprite_hd/timer_right', TX + 50, TY); D.cl = new Spr(q, 'screen3_sprite_hd/timer_left', TX - 50, TY);
  D.tt = txt(q, '02:00', TX, TY, 120, 25, '#ffff00', 'Helvetica,Arial'); D.ttO = { x: TX, a: 1, draw() { D.tt.style.opacity = this.a; } };
  D.qt = document.createElement('div'); D.qt.className = 'txt'; Object.assign(D.qt.style, { left: '13px', width: '513px', top: '320px', font: '23px Arial', textShadow: '0 2px 3px #000', lineHeight: '27px' }); q.appendChild(D.qt);
  D.tiles = document.createElement('div'); q.appendChild(D.tiles);
  // tastiera A–Z su due righe con le tessere originali
  ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ'].forEach((row, ri) => [...row].forEach((ch, k) => { const s = new Spr(q, 'letters_sprite_hd/' + letra(ch, 'fixed'), 270 + (k - 6) * 40, 680 + ri * 62); s.el.classList.add('gfk'); s.el.onpointerdown = (e) => { e.preventDefault(); s.el.classList.add('on'); setTimeout(() => s.el.classList.remove('on'), 140); tasto(ch); }; }));
  const bk = document.createElement('div'); bk.id = 'gfBk'; bk.textContent = '⌫'; bk.onpointerdown = (e) => { e.preventDefault(); tasto('⌫'); }; q.appendChild(bk);
  const ps = document.createElement('div'); ps.id = 'gfPass'; ps.textContent = T.passB; ps.onpointerdown = (e) => { e.preventDefault(); finPassa(); }; q.appendChild(ps);
  await fadeTo('sFin', 700); snd('head_to_head_music', true);
  D.t = 120000; later(1200, () => { finDomanda(); D.last = performance.now(); D.run = true; });
  clearInterval(D.loop); D.loop = setInterval(ciclo, 33); $('#kb').value = ''; setTimeout(() => $('#kb').focus(), 300);
}
function tasto(ch) { if (!D || !D.fin || D.end || D.wait) return; const kb = $('#kb'); kb.value = ch === '⌫' ? kb.value.slice(0, -1) : kb.value + ch; kb.dispatchEvent(new Event('input')); }
function finDomanda() { // come nuovaDomanda, ma con il tempo globale di 2 minuti
  D.q = D.coda[0]; const a = [...D.q[1].toUpperCase()]; const idx = a.map((c, k) => /\p{L}|\d/u.test(c) ? k : -1).filter((k) => k >= 0);
  const n = Math.max(1, Math.round(idx.length * 0.35)); const sh = new Set(idx.sort(() => Math.random() - .5).slice(0, n)); if (sh.size >= idx.length) sh.delete(idx[0]);
  D.ans = a; D.fixed = a.map((c, k) => c === ' ' || !/\p{L}|\d/u.test(c) || sh.has(k)); D.typed = []; D.qt.textContent = D.q[0]; D.err = true; D.wait = false; $('#kb').value = ''; drawTiles();
}
function finOk() { snd('correct answer'); D.wait = true; D.mk[D.ok].classList.add('on'); D.ok++; D.coda.shift(); drawTiles(true);
  if (D.ok >= 10) { D.end = true; stop('head_to_head_music'); stop('time_running_out'); later(900, () => finCaduta(true)); return; }
  later(900, () => { if (D.end) return; finDomanda(); D.last = performance.now(); }); }
function finPassa() { if (!D || !D.fin || D.end || D.wait) return; snd('Pass_2'); D.coda.push(D.coda.shift()); D.wait = true; later(350, () => { if (D.end) return; finDomanda(); D.last = performance.now(); }); }
function finTempo() { D.tt.textContent = '00:00'; stop('head_to_head_music'); $('#kb').blur(); later(1000, () => { snd('yes1'); drawTiles(true); }); later(3000, () => finCaduta(false)); }
async function finCaduta(win) { // DropScene con il solo concorrente sulla botola
  clearInterval(D.loop); killAll(); stop('time_running_out'); const r = lienzo('sDrop', 'bg4'); const pb = myBody(), dir = (win ? 'win-' : 'lose-') + BODYDIR[pb], F = SEQ[dir].map((f) => dir + '/' + f);
  const c1 = document.createElement('div'), c2 = document.createElement('div'); r.append(c1, c2); new Spr(c1, 'screen4_sprite_hd/left_tube_cover_l'); new Spr(c1, 'screen4_sprite_hd/left_tube_cover_r'); new Spr(c2, 'screen4_sprite_hd/right_tube_cover_l'); new Spr(c2, 'screen4_sprite_hd/right_tube_cover_r');
  const g = document.createElement('div'); r.append(g); const by = 960 * .29, hy = 960 * .285;
  const body = new Spr(g, F[0], 405, by), head = new Spr(g, myPic(), 405, 175, { head: 1, r: 74 }), hands = new Spr(g, win ? F[17] : F[3], win ? 397.5 : 405, hy);
  new Spr(r, 'screen4_sprite_hd/tubes_front', 270, 580); await fadeTo('sDrop', 500); await sleep(1200);
  if (win) { snd('money_total'); tween(head, { y: 185 }, { time: 400, ease: 'inOutBack' }); tween(head, { y: 155, x: head.x - 5, rot: -10 }, { time: 500, delay: 300, ease: 'inOutBack' }); play(body, F.slice(0, 17), 600); play(hands, F.slice(17), 850);
    const m = txt(r, eur(G.bank), 270, 470, 400, 54, '#ffd84a'); m.style.textShadow = '0 3px 6px #000'; m.style.opacity = 0; const o = { a: 0, y: 0, draw() { m.style.opacity = this.a; m.style.transform = `translateY(${this.y}px)`; } }; tween(o, { a: 1, y: -40 }, { time: 900, delay: 600, ease: 'outCubic' });
    await sleep(4500); return finePartita(true, true); }
  snd('contestant_Lock_2_A'); c2.style.transition = 'opacity .1s'; c2.style.opacity = 0;
  for (const s of [head, hands, body]) tween(s, { y: s.y - 25 }, { time: 400, ease: 'outQuart' });
  play(body, F.slice(0, 3), 400); later(400, () => play(hands, F.slice(4, 15), 1500)); later(1400, () => play(hands, F.slice(15, 26), 750, 3));
  for (const s of [head, hands, body]) tween(s, { y: s.y + 325 }, { time: 1500, delay: 350, ease: 'inOutQuart' }); tween(head, { sx: .7, sy: 1.3 }, { time: 500, delay: 800, ease: 'inQuint' });
  tween(head, { y: 960 + 500 }, { time: 1000, delay: 2200, ease: 'inQuart' }); tween(hands, { sx: .7, y: 960 + 500 }, { time: 1000, delay: 2200, ease: 'inQuart' }); tween(body, { y: 960 + 500 + 230 }, { time: 1000, delay: 2200, ease: 'inQuart' });
  await sleep(4500); finePartita(false, true);
}
window.__CL = { giocoFinale, nuovaPartita, duello, caduta, apriProfilo, board, menu, get G() { return G; }, get D() { return D; } };
function finePartita(all, fin) {
  scr('sEnd'); const n = G.opp.filter((o) => o.out).length; const g = n >= 10 ? '10' : n >= 8 ? '8-9' : n >= 6 ? '6-7' : n >= 3 ? '3-5' : '1-2';
  place($('#eG'), 'screen5_sprite_hd/' + g + '_graphic'); $('#eH').style.backgroundImage = `url(${myPic()})`;
  const premio = all ? G.bank : 0; if (premio > stats.r) stats.r = premio; sv('stats', stats);
  $('#eT').innerHTML = fin ? (all ? T.finWin + '<br>' + T.win + ': ' + eur(premio) : T.finLost + '<br>' + T.fellAll + ' · ' + eur(G.bank)) : (all ? T.fellAll + '<br>' + T.win + ': ' + eur(premio) : T.lost + '<br>' + n + ' / 10 · ' + eur(G.bank)); snd(all ? 'money_total' : 'error');
}
$('#eR').onclick = () => nuovaPartita();
try { if (window.__logoQue && window.__logoQue(LANG) === 'ac') { $('#acLogo').style.display = 'block'; $('#acLogoI').src = window.__LOGO_AC; document.title = '¡Ahora Caigo! · Clásico'; } } catch (e) {}
// desbloqueo de audio al primer toque (WebView/navegador): relanza la música pendiente
addEventListener('pointerdown', () => { Object.values(SND).forEach((a) => { if (a.loop && a.paused && !mute && a.dataset.want) a.play().catch(() => {}); }); if (!window.__clUnlock) { window.__clUnlock = 1; if ($('#sMenu').classList.contains('on')) snd('intro-shorter'); } }, true);
{ const v = document.createElement('div'); v.className = 'txt'; v.id = 'clVer'; v.style.cssText = 'left:6px;top:936px;font:12px Arial;opacity:.6;text-shadow:none'; v.textContent = 'v' + (window.CL_VERSION || '1.0.3'); $('#sMenu').appendChild(v); }
menu();
})();
