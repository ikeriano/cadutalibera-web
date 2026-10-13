// Mi cabecera 3D · estimación de profundidad por IA (Depth Anything V2 small, ONNX q4f16) sin conexión
import * as ort from './ort.bundle.js';
let ses = null;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
async function init(base) {
  ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { wasm: base + 'ort-wasm-simd-threaded.wasm', mjs: base + 'ort-wasm-simd-threaded.mjs.js' };
  const M = base + 'depth-anything-v2-small-q4f16.onnx';
  let r = await fetch(M).catch(() => null), buf;
  if (r && r.ok) buf = await r.arrayBuffer();
  else { // variante comprimida (APK muy justos de tamaño): .onnx.gz descomprimido aquí
    r = await fetch(M + '.gz'); if (!r.ok) throw new Error('No encuentro el modelo de IA (' + r.status + ')');
    buf = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  ses = await ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
}
async function depth(rgba, w, h) {
  const n = w * h, x = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) x[c * n + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  const out = await ses.run({ [ses.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, h, w]) });
  const t = out[ses.outputNames[0]]; const d = t.dims;
  return { data: t.data, w: d[d.length - 1], h: d[d.length - 2] };
}
if (typeof WorkerGlobalScope !== 'undefined') self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.tipo === 'init') { await init(m.base); self.postMessage({ id: m.id, ok: true }); }
    else if (m.tipo === 'depth') { const r = await depth(m.rgba, m.w, m.h); self.postMessage({ id: m.id, ok: true, ...r }, [r.data.buffer]); }
  } catch (err) { self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) }); }
};
export { init, depth };
