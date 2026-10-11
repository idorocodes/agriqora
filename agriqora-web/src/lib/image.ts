const MAX_INPUT_BYTES = 10 * 1024 * 1024;
// The API accepts JSON bodies up to 1 MB, so keep each photo well under that.
const MAX_OUTPUT_CHARS = 280_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image. Try a JPG or PNG photo.'));
    };
    img.src = url;
  });
}

/**
 * Shrinks a photo in the browser and returns it as a JPEG data URL.
 * Farmers often have limited data, so photos are compressed before upload.
 */
export async function compressImage(file: File, maxSide = 800): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too large. Choose one under 10 MB.');

  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Photo upload is not supported in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of [0.72, 0.6, 0.5, 0.4]) {
    const out = canvas.toDataURL('image/jpeg', quality);
    if (out.length <= MAX_OUTPUT_CHARS) return out;
  }
  throw new Error('That photo is still too large after compression. Try a smaller one.');
}
