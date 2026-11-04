// On-device OCR using a vendored copy of Tesseract.js. Nothing leaves the device.

let workerPromise = null;
let idleTimer = null;
let progressCb = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the text reader.'));
    document.head.appendChild(s);
  });
}

async function getWorker() {
  clearTimeout(idleTimer);
  if (!workerPromise) {
    workerPromise = (async () => {
      const base = new URL('./vendor/tesseract/', document.baseURI).href;
      await loadScript(`${base}tesseract.min.js`);
      const worker = await window.Tesseract.createWorker('eng', 1, {
        workerPath: `${base}worker.min.js`,
        corePath: `${base}core`,
        langPath: `${base}lang`,
        gzip: true,
        logger: (m) => {
          if (!progressCb) return;
          if (m.status === 'recognizing text') progressCb({ stage: 'read', progress: m.progress });
          else progressCb({ stage: 'load', progress: m.progress || 0, status: m.status });
        },
      });
      await worker.setParameters({ preserve_interword_spaces: '1' });
      return worker;
    })().catch((err) => { workerPromise = null; throw err; });
  }
  return workerPromise;
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (!workerPromise) return;
    const w = await workerPromise.catch(() => null);
    workerPromise = null;
    if (w) w.terminate();
  }, 90_000);
}

// Prepare a screenshot for OCR: upscale small images, grayscale, invert dark
// mode screenshots so text is dark on light.
export async function preprocess(file) {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < 1400 ? Math.min(2.2, 1800 / bitmap.width) : bitmap.width > 2600 ? 2600 / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    sum += g;
  }
  // Dark-mode screenshots: flip to dark text on a light background.
  const invert = sum / gray.length < 120;
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const g = invert ? 255 - gray[p] : gray[p];
    // Tone curve: light bubble backgrounds go to white, faint gray text
    // (timestamps like "Yesterday 7:42 PM") goes dark, black text stays black.
    const t = Math.min(1, Math.max(0, (g - 77) / 127));
    d[i] = d[i + 1] = d[i + 2] = 255 * t * t;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Read the text from an image file. onProgress({stage, progress}) */
export async function readImage(file, onProgress) {
  progressCb = onProgress || null;
  try {
    const worker = await getWorker();
    const canvas = await preprocess(file);
    const { data } = await worker.recognize(canvas);
    return data.text || '';
  } finally {
    progressCb = null;
    scheduleIdle();
  }
}

export function warmUp() {
  getWorker().then(scheduleIdle).catch(() => {});
}
