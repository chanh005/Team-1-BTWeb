/**
 * Sanitize HTML ở server
 * Chỉ cho phép các thẻ: H1, H2, p, strong, b, em, i, ul, ol, li, blockquote, a, img, br
 * Triệt tiêu hoàn toàn <script>, <iframe>, <object>, <embed>, event handler (onerror, onload, onclick...), javascript: URIs.
 */

const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'p',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'br',
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
};

export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';

  let html = dirty;

  // 1. Loại bỏ triệt để các thẻ nguy hiểm và nội dung bên trong chúng
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  html = html.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Phân tích các thẻ HTML
  // Regex tìm thẻ bắt đầu, thẻ kết thúc và thẻ tự đóng
  return html.replace(/<\/?([a-z0-9_-]+)([^>]*)>/gi, (match, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();

    // Nếu thẻ không nằm trong whitelist -> loại bỏ
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    // Nếu là thẻ đóng
    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    // Nếu là thẻ mở: lọc thuộc tính
    const isSelfClosing = match.endsWith('/>') || tag === 'br' || tag === 'img';
    const allowedForTag = ALLOWED_ATTRS[tag] || new Set();

    let cleanAttrs = '';
    if (rawAttrs) {
      // Regex trích xuất thuộc tính: name="value" hoặc name='value' hoặc name=value
      const attrRegex = /([a-z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        let attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

        // Bỏ qua event handlers: on* (onclick, onerror, onload...)
        if (attrName.startsWith('on')) continue;

        // Chỉ giữ thuộc tính hợp lệ cho thẻ đó
        if (!allowedForTag.has(attrName)) continue;

        // Kiểm tra an toàn cho URL (href, src): không chứa javascript: hay data: (trừ ảnh data:image)
        if (attrName === 'href' || attrName === 'src') {
          const lowerVal = attrValue.trim().toLowerCase();
          if (lowerVal.startsWith('javascript:') || lowerVal.startsWith('vbscript:')) {
            continue;
          }
          if (lowerVal.startsWith('data:') && !lowerVal.startsWith('data:image/')) {
            continue;
          }
        }

        // Tự động thêm rel="noopener noreferrer" cho thẻ a nếu có target="_blank"
        if (tag === 'a' && attrName === 'target' && attrValue === '_blank') {
          cleanAttrs += ` target="_blank" rel="noopener noreferrer"`;
          continue;
        }

        // Escape thuộc tính
        const escapedVal = attrValue.replace(/"/g, '&quot;');
        cleanAttrs += ` ${attrName}="${escapedVal}"`;
      }
    }

    return isSelfClosing ? `<${tag}${cleanAttrs} />` : `<${tag}${cleanAttrs}>`;
  });
}

/** Trích xuất tóm tắt ngắn từ HTML thuần văn bản */
export function extractExcerpt(html, maxLength = 180) {
  if (!html) return '';
  const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + '...';
}

export const sanitizeHtmlContent = sanitizeHtml;
export default sanitizeHtml;
