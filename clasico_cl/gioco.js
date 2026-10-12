// Caduta Libera · modalità Classico: porting HTML5 dell'app originale (grafica, suoni e layout estratti dall'APK).
(() => {
const LANG = (() => { try { const v = localStorage.getItem('ac_lang'); return v === 'es' ? 'es' : 'it'; } catch (e) { return 'it'; } })();
const T = {
 it: { you: 'Tu', choose: 'Scegli il tuo avversario', turn: 'Il tuo turno', oppTurn: 'Turno di', pass: 'Passi la domanda!', wrong: 'Sbagliato, riprova!', ok: 'Esatto!',
  name: 'Il tuo nome', gender: 'Femmina? Maschio?', local: 'Profilo solo su questo dispositivo (niente Facebook): nome, foto e genere restano qui.',
  noDia: 'Non hai abbastanza diamanti', ancora: 'Ancora', al: 'Al', win: 'Hai vinto', lost: 'Sei caduto!', fellAll: 'Hai battuto tutti i 10 avversari!',
  info: 'Sfida 10 avversari. Hai 30 secondi a turno: completa la parola con le lettere che mancano e il turno passa all\'avversario. Se il tuo tempo finisce, la botola si apre! Usa i diamanti: ◀ passa la domanda, A rivela una lettera, ⌛ aggiunge tempo.',
  stats: (s) => `Partite: ${s.p} · Avversari battuti: ${s.b} · Record: ${eur(s.r)}`, ach: (s) => `Traguardi: ${s.r >= 100000 ? '🏆' : '·'} 100.000 € · ${s.p >= 10 ? '🏆' : '·'} 10 partite · ${s.b >= 50 ? '🏆' : '·'} 50 avversari`, type: 'Scrivi la risposta' },
 es: { you: 'Tú', choose: 'Elige a tu rival', turn: 'Tu turno', oppTurn: 'Turno de', pass: '¡Pasas la pregunta!', wrong: '¡Fallo, inténtalo otra vez!', ok: '¡Correcto!',
  name: 'Tu nombre', gender: '¿Mujer? ¿Hombre?', local: 'Perfil solo en este dispositivo (sin Facebook): nombre, foto y género se quedan aquí.',
  noDia: 'No tienes suficientes diamantes', ancora: 'Faltan', al: 'Para', win: 'Has ganado', lost: '¡Has caído!', fellAll: '¡Has derribado a los 10 rivales!',
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
let mute = false; const SND = {}; const snd = (n, loop) => { if (mute) return null; try { const a = SND[n] || (SND[n] = new Audio('snd/' + n + '.mp3')); a.loop = !!loop; a.currentTime = 0; a.play().catch(() => {}); return a; } catch (e) { return null; } };
const stop = (n) => { const a = SND[n]; if (a) { a.pause(); a.currentTime = 0; } };
// stato persistente
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem('cl_' + k)) ?? d; } catch (e) { return d; } }, sv = (k, v) => { try { localStorage.setItem('cl_' + k, JSON.stringify(v)); } catch (e) {} };
let prof = ld('prof', null), stats = ld('stats', { p: 0, b: 0, r: 0 }), dia = ld('dia', 200);
const scr = (id) => { document.querySelectorAll('.scr').forEach((s) => s.classList.toggle('on', s.id === id)); };
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
// PARTITA
let G = null;
const mazzo = () => { const a = window.CL_DOMANDE.map((d) => LANG === 'es' ? [d[2], d[3]] : [d[0], d[1]]); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function nuovaPartita() {
  const used = new Set(); const opp = [];
  const fem = [0, 2, 4, 6, 8].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 10; i++) { let n; do n = 1 + (Math.random() * 137 | 0); while (used.has(n)); used.add(n); opp.push({ img: 'img/ppl_sprite/italian_' + n + '.webp', f: i % 2 === 0, nome: '', val: 0, out: false, body: 1 + (Math.random() * 4 | 0) }); }
  opp.forEach((o) => { const lst = o.f ? NOMI_F : NOMI_M; o.nome = lst[Math.random() * lst.length | 0]; });
  const vals = VALORI.map((v, i) => i).sort(() => Math.random() - 0.5); opp.forEach((o, i) => { o.val = VALORI[vals[i]]; o.pz = vals[i]; });
  G = { opp, bank: 0, q: mazzo(), qi: 0, round: 0, usedPz: new Set() }; stats.p++; sv('stats', stats); board();
}
function board(msg) {
  scr('sBoard'); setDia(); stop('head_to_head_music'); snd('small_Talk_loop', true);
  const left = G.opp.filter((o) => !o.out).length;
  $('#bank').textContent = eur(G.bank);
  // premios
  const pz = $('#prizes'); pz.innerHTML = '';
  PRZ.forEach((k, i) => { const im = document.createElement('img'); im.className = 'sp'; place(im, 'screen2_sprite_hd/' + k + (G.usedPz.has(i) ? '_dark' : '_light')); pz.appendChild(im); });
  const showGrid = G.round > 0 && G.round % 2 === 1; pz.style.display = showGrid ? '' : 'none'; $('#million').style.display = showGrid ? 'none' : '';
  place($('#milN'), 'screen2_sprite_hd/to_million_label_' + Math.max(1, left));
  // anillo
  const ring = $('#ring'); ring.innerHTML = ''; const cx = 270, cy = 690, R = 198;
  G.opp.forEach((o, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 10 + Math.PI / 10, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.98;
    const d = document.createElement('div'); d.className = 'slot'; d.style.left = (x - 50) + 'px'; d.style.top = (y - 51) + 'px';
    if (o.out) d.innerHTML = `<img src="img/screen2_sprite_hd/otherman_fell_icon.webp" style="width:92px;margin:5px">`;
    else { d.innerHTML = `<div class="head" style="left:9px;top:9px;width:82px;height:82px;background-image:url(${o.img})"></div><img class="sp" src="img/screen2_sprite_hd/head_frame.webp" style="left:0;top:0;width:100px;height:103px">`; d.onclick = () => scegli(i, d); }
    ring.appendChild(d); });
  const c = document.createElement('div'); c.className = 'l'; c.style.cssText = `left:${cx - 66}px;top:${cy - 120}px;width:132px;height:136px`;
  c.innerHTML = `<img id="comp" class="sp" src="img/screen2_sprite_hd/compass_point_halo1.webp" style="left:-55px;top:-55px;width:242px"><img class="sp spin" src="img/screen2_sprite_hd/compass_point_halo2.webp" style="left:-55px;top:-55px;width:242px"><div class="head" style="left:12px;top:12px;width:108px;height:108px;background-image:url(${myPic()})"></div><img class="sp" src="img/screen2_sprite_hd/head_frame_chosen.webp" style="left:0;top:0;width:132px;height:136px">`;
  ring.appendChild(c);
  const b = document.createElement('img'); b.className = 'sp'; place(b, 'screen2_sprite_hd/player_body' + (prof.g === 'f' ? 2 : 1)); b.style.top = (cy + 22) + 'px'; b.style.left = '229px'; b.style.height = '160px'; b.style.width = 'auto'; ring.appendChild(b);
  $('#bMsg').textContent = msg || T.choose;
}
$('#bHome').onclick = () => menu();
$('#bProf').onclick = () => apriProfilo(false);
$('#bStat').onclick = () => pop(T.stats(stats), 3000);
$('#bAch').onclick = () => pop(T.ach(stats), 3000);
let busy = false;
async function scegli(i, el) { if (busy) return; busy = true; snd('contestant_Lock_2_A'); el.style.filter = 'drop-shadow(0 0 18px #ff2a2a)'; await sleep(900); busy = false; duello(i); }
// DUELLO
let D = null, tick = null;
function duello(i) {
  stop('small_Talk_loop'); scr('sDuel'); setDia(); const o = G.opp[i];
  D = { i, o, t: [30000, 30000], who: 0, q: null, shown: new Set(), typed: '', aiT: null, end: false };
  $('#dN1').textContent = prof.n; $('#dN2').textContent = o.nome; $('#dH1').style.backgroundImage = `url(${myPic()})`; $('#dH2').style.backgroundImage = `url(${o.img})`;
  snd('head_to_head_music', true); nuovaDomanda(); turno(0);
  clearInterval(tick); let last = performance.now();
  tick = setInterval(() => { if (D.end) return; const now = performance.now(); D.t[D.who] -= now - last; last = now; drawT();
    if (D.t[D.who] <= 5500 && !D.warn) { D.warn = 1; snd('time_running_out'); }
    if (D.t[D.who] <= 0) { D.t[D.who] = 0; drawT(); fine(D.who === 0 ? 'opp' : 'me'); } }, 50);
  $('#kb').value = ''; setTimeout(() => $('#kb').focus(), 300);
}
const drawT = () => { const ms = Math.max(0, D.t[D.who]); $('#dT').textContent = String(Math.floor(ms / 1000)).padStart(2, '0') + ':' + String(Math.floor(ms % 1000 / 10)).padStart(2, '0'); };
function nuovaDomanda(keep) {
  if (!keep) { if (G.qi >= G.q.length) { G.q = mazzo(); G.qi = 0; } D.q = G.q[G.qi++]; }
  const a = D.q[1]; D.shown = new Set(); const idx = [...a].map((c, k) => /\p{L}/u.test(c) ? k : -1).filter((k) => k >= 0);
  const n = Math.max(1, Math.round(idx.length * (0.45 - Math.min(0.2, G.round * 0.02))));
  idx.sort(() => Math.random() - 0.5).slice(0, n).forEach((k) => D.shown.add(k));
  if (D.shown.size >= idx.length) D.shown.delete(idx[0]);
  D.typed = ''; $('#kb').value = ''; $('#dQ').textContent = D.q[0]; drawTiles(); snd('Reveal');
}
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
function drawTiles(typed) {
  const a = D.q[1], box = $('#tiles'); box.innerHTML = ''; const t = typed != null ? [...typed] : null;
  [...a].forEach((c, k) => { const d = document.createElement('div'); d.className = 'tile' + (c === ' ' ? ' sp0' : '');
    if (c !== ' ') { if (t && t.length) { const ch = t.shift(); d.textContent = ch; d.classList.add('typed'); } else if (D.shown.has(k)) { d.textContent = c; d.classList.add('rv'); } }
    box.appendChild(d); });
}
function turno(w) {
  D.who = w; D.warn = 0; place($('#dF1'), 'screen3_sprite_hd/head_frame_' + (w === 0 ? 'onturn' : 'offturn')); place($('#dF2'), 'screen3_sprite_hd/head_frame_' + (w === 1 ? 'onturn' : 'offturn'));
  $('#dF1').style.left = '89px'; $('#dF1').style.top = '16px'; $('#dF2').style.left = '279px'; $('#dF2').style.top = '16px';
  $('#dTry').textContent = w === 0 ? T.turn : T.oppTurn + ' ' + D.o.nome; $('#dHint').textContent = w === 0 ? T.type : '';
  ['#puPass', '#puLet', '#puTime'].forEach((s) => $(s).style.opacity = w === 0 ? 1 : 0.35);
  clearTimeout(D.aiT); drawT();
  if (w === 1) { // l'avversario risponde (o no)
    const p = Math.max(0.55, 0.9 - G.round * 0.035); const sa = Math.random() < p; const dl = 5500 + Math.random() * 4500;
    if (sa && dl < D.t[1]) D.aiT = setTimeout(() => { if (D.end) return; D.typed = D.q[1]; drawTiles(D.q[1].replace(/ /g, '')); snd('Correct_5'); setTimeout(() => { if (D.end) return; nuovaDomanda(); turno(0); $('#kb').focus(); }, 900); }, dl);
    else { // tentativi sbagliati visibili
      let k = 0; const fake = () => { if (D.end || D.who !== 1) return; snd('error'); $('#tiles').classList.add('shake'); setTimeout(() => $('#tiles').classList.remove('shake'), 400); if (++k < 4) D.aiT = setTimeout(fake, 4000 + Math.random() * 3000); }; D.aiT = setTimeout(fake, 3500);
    }
  }
}
$('#kb').addEventListener('input', () => { if (!D || D.who !== 0 || D.end || D._pause) { $('#kb').value = ''; return; } const v = norm($('#kb').value); const need = norm(D.q[1]).length; $('#kb').value = v.slice(0, need); drawTiles(v.slice(0, need)); snd('clockMove'); if (v.length >= need) prova(v.slice(0, need)); });
$('#kb').addEventListener('keydown', (e) => { if (e.key === 'Enter') prova(norm($('#kb').value)); });
$('#sDuel').addEventListener('click', (e) => { if (!e.target.closest('.bt')) $('#kb').focus(); });
function prova(v) {
  if (v === norm(D.q[1])) { snd('Correct_16'); $('#dTry').textContent = T.ok; drawTiles(D.q[1].replace(/ /g, '')); D.who = -1; setTimeout(() => { if (D.end) return; nuovaDomanda(); turno(1); }, 900); D.who = 0; D.t[0] += 0; D.end = false; D._pause = true; setTimeout(() => D._pause = false, 900); }
  else { snd('error'); $('#tiles').classList.add('shake'); setTimeout(() => { $('#tiles').classList.remove('shake'); $('#kb').value = ''; drawTiles(); }, 400); $('#dTry').textContent = T.wrong; }
}
const usa = (c) => { if (dia < c) { pop(T.noDia, 1500); return false; } dia -= c; setDia(); snd('powerUp'); return true; };
$('#puPass').onclick = () => { if (D.who !== 0 || D.end) return; if (!usa(30)) return; $('#dTry').textContent = T.pass; snd('Pass_2'); nuovaDomanda(true); turno(1); };
$('#puLet').onclick = () => { if (D.who !== 0 || D.end) return; const a = D.q[1]; const h = [...a].map((c, k) => /\p{L}/u.test(c) && !D.shown.has(k) ? k : -1).filter((k) => k >= 0); if (h.length < 2) return; if (!usa(20)) return; D.shown.add(h[Math.random() * h.length | 0]); $('#kb').value = ''; drawTiles(); $('#kb').focus(); };
$('#puTime').onclick = () => { if (D.who !== 0 || D.end) return; if (!usa(25)) return; D.t[0] += 10000; drawT(); $('#kb').focus(); };
async function fine(loser) {
  D.end = true; clearInterval(tick); clearTimeout(D.aiT); stop('head_to_head_music'); stop('time_running_out'); $('#kb').blur();
  await sleep(800); await caduta(loser);
  if (loser === 'opp') { D.o.out = true; G.bank += D.o.val; G.usedPz.add(D.o.pz); G.round++; stats.b++; dia += 15; sv('stats', stats);
    if (G.opp.every((o) => o.out)) return finePartita(true); board(); }
  else finePartita(false);
}
// CADUTA
async function caduta(loser) {
  scr('sDrop'); snd('Pass_2'); const meLose = loser === 'me';
  const fig = (el, x, lose, head, body) => { el.innerHTML = ''; el.style.left = '0px'; el.style.top = '0px'; el.style.transition = '';
    const pre = lose ? `lose-seq${body}_${['', 'suit', 'hasuda', 'yellow', 'sweater'][body]}-hd/lose_` : `win-seq${body}_${['', 'suit', 'hasuda', 'yellow', 'sweater'][body]}-hd/win_`;
    const b = document.createElement('img'), h = document.createElement('img'), hd = document.createElement('div');
    const W = lose ? 385 : 271; [b, h].forEach((im) => { im.className = 'sp'; im.style.cssText = `left:${x - W / 2}px;top:${278 - 230}px;width:${W}px;height:460px`; });
    hd.className = 'head'; hd.style.cssText = `left:${x - 74}px;top:${175 - 74 - 40}px;width:148px;height:148px;background-image:url(${head})`;
    el.append(b, hd, h); return { b, h, hd, pre }; };
  const xL = 150, xR = 405; // il perdente a sinistra (sopra la botola sinistra), come nell'app
  const lb = meLose ? (prof.g === 'f' ? 3 : 1) : D.o.body, wb = meLose ? D.o.body : (prof.g === 'f' ? 3 : 1);
  const Lf = fig($('#fig1'), xL, true, meLose ? myPic() : D.o.img, lb), Wf = fig($('#fig2'), xR, false, meLose ? D.o.img : myPic(), wb);
  const anim = async (f, a, b, n, ms) => { for (let k = 0; k < n; k++) { a(k); await sleep(ms / n); } };
  const p4 = (k) => String(k).padStart(4, '0');
  Lf.b.src = `img/${Lf.pre}body${lb}.1.webp`; Lf.h.src = `img/${Lf.pre}hands${lb === 3 ? 2 : lb}_0001.webp`;
  Wf.b.src = `img/${Wf.pre}body${wb}_0001.webp`; Wf.h.src = `img/${Wf.pre}hands${wb}_0001.webp`;
  $('#mach').style.top = '960px'; $('#machAmt').src = 'img/screen4_sprite_hd/number_circle_prize_' + D.o.val + '.webp';
  await sleep(700); snd('yes1');
  const hw = (lb === 3 ? 2 : lb);
  await Promise.all([anim(0, (k) => { Wf.b.src = `img/${Wf.pre}body${wb}_${p4(k + 1)}.webp`; Wf.h.src = `img/${Wf.pre}hands${wb}_${p4(k + 1)}.webp`; }, 0, 17, 850),
    anim(0, (k) => { Lf.h.src = `img/${Lf.pre}hands${hw}_${p4(5 + k)}.webp`; if (k < 3) Lf.b.src = `img/${Lf.pre}body${lb}.${k + 1}.webp`; }, 0, 11, 1500)]);
  snd('Correct_7');
  const el = $('#fig1'); el.style.transition = 'top .9s cubic-bezier(.6,0,1,.6)'; el.style.top = '700px'; await sleep(1000);
  if (!meLose) { snd('open_coin'); $('#mach').style.left = (xL - 98) + 'px'; $('#mach').style.top = '300px'; await sleep(1400); snd('money_total'); }
  await sleep(1300);
}
function finePartita(all) {
  scr('sEnd'); const n = G.opp.filter((o) => o.out).length; const g = n >= 10 ? '10' : n >= 8 ? '8-9' : n >= 6 ? '6-7' : n >= 3 ? '3-5' : '1-2';
  place($('#eG'), 'screen5_sprite_hd/' + g + '_graphic'); $('#eH').style.backgroundImage = `url(${myPic()})`;
  const premio = all ? G.bank : 0; if (premio > stats.r) stats.r = premio; sv('stats', stats);
  $('#eT').innerHTML = (all ? T.fellAll + '<br>' + T.win + ': ' + eur(premio) : T.lost + '<br>' + n + ' / 10 · ' + eur(G.bank)); snd(all ? 'money_total' : 'error');
}
$('#eR').onclick = () => nuovaPartita();
try { if (window.__logoQue && window.__logoQue(LANG) === 'ac') { $('#acLogo').style.display = 'block'; $('#acLogoI').src = window.__LOGO_AC; document.title = '¡Ahora Caigo! · Clásico'; } } catch (e) {}
menu();
})();
