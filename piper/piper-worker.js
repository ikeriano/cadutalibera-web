// Piper (es_ES-davefx-medium) sin conexión dentro de la app: sherpa-onnx WebAssembly en un Worker.
let tts = null;
self.Module = { locateFile: (p, dir = '') => dir + p, setStatus: (s) => self.postMessage({ type: 'progreso', s }),
  onRuntimeInitialized: () => { try { tts = createOfflineTts(self.Module); self.postMessage({ type: 'listo', sampleRate: tts.sampleRate }); } catch (e) { self.postMessage({ type: 'error', msg: String(e && e.message || e) }); } } };
importScripts('sherpa-onnx-wasm-main-tts.js'); importScripts('sherpa-onnx-tts.js');
self.onmessage = (e) => { const { id, texto, velocidad } = e.data; if (!tts) return self.postMessage({ type: 'error', id, msg: 'no listo' });
  try { const a = tts.generate({ text: texto, sid: 0, speed: velocidad || 1.0 }); self.postMessage({ type: 'audio', id, samples: a.samples, sampleRate: tts.sampleRate }, [a.samples.buffer]); } catch (x) { self.postMessage({ type: 'error', id, msg: String(x) }); } };
