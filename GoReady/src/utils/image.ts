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
