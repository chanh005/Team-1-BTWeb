// Prepares a photo picked in the admin console for upload: downsize + re-encode as JPEG in the browser, so a 6 MB
// phone photo becomes a few hundred KB (fast to upload, fast to load on the tour page).

const MAX_SIDE = 1600; // px, longest edge — plenty for the tour page
const START_QUALITY = 0.82;
const TARGET_BYTES = 1.5 * 1024 * 1024; // the server accepts up to 2.5 MB; stay well under
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // refuse to even decode files bigger than this

export const isImageFile = (file: File) => /^image\/(jpeg|png|webp|gif)$/.test(file.type);

const loadBitmap = async (file: File): Promise<ImageBitmap> => {
  try {
    return await createImageBitmap(file); // honours the photo's EXIF rotation
  } catch {
    throw new Error(`Không đọc được ảnh "${file.name}"`);
  }
};

const draw = (bitmap: ImageBitmap, maxSide: number, quality: number): string => {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
  // JPEG has no transparency: put transparent PNG/WebP pixels on white instead of black
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

/** Approximate decoded size of a base64 data URL. */
const dataUrlBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

/** File → JPEG data URL of at most ~1.5 MB (longest edge ≤ 1600 px). Throws an Error with a Vietnamese message. */
export async function compressImage(file: File): Promise<string> {
  if (!isImageFile(file)) throw new Error(`"${file.name}" không phải ảnh JPG, PNG, WebP hoặc GIF`);
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`"${file.name}" quá lớn (tối đa 25 MB)`);

  const bitmap = await loadBitmap(file);
  try {
    // Step the quality/size down until it fits (almost always the first try succeeds)
    for (const [side, quality] of [[MAX_SIDE, START_QUALITY], [MAX_SIDE, 0.65], [1200, 0.6], [900, 0.55]] as const) {
      const dataUrl = draw(bitmap, side, quality);
      if (dataUrlBytes(dataUrl) <= TARGET_BYTES) return dataUrl;
    }
    throw new Error(`Không nén nhỏ được ảnh "${file.name}"`);
  } finally {
    bitmap.close();
  }
}
