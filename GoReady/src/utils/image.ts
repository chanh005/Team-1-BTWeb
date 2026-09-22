import type React from 'react';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Brand-colored SVG placeholder (data URI) used when a tour image is missing or fails to load. */
export const placeholderImage = (label = 'GoReady'): string => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#548dd7"/><stop offset="1" stop-color="#87EDFF"/></linearGradient></defs>` +
    `<rect width="1200" height="800" fill="url(#g)"/>` +
    `<text x="600" y="420" text-anchor="middle" font-family="sans-serif" font-size="72" font-weight="700" fill="#fff">${escapeXml(label)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** `onError` handler for <img>: swaps in the placeholder once (avoids an error loop). */
export const onImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = placeholderImage();
};

/** Reads an image file, downscales it to fit within `maxSize` and re-encodes as a JPEG data URL. */
export function fileToResizedDataUrl(file: File, maxSize = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('invalid_image'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas_unsupported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
