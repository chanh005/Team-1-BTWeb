import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generateSitemap() {
  const pool = getPool();
  const domain = 'https://goready.vn';

  // Lấy tất cả bài viết published
  const { rows: posts } = await pool.query(
    `SELECT slug, updated_at, published_at FROM community_posts WHERE status = 'published' ORDER BY published_at DESC`
  );

  const urls = [
    { loc: `${domain}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${domain}/#/explore`, priority: '0.9', changefreq: 'daily' },
    { loc: `${domain}/#/cong-dong`, priority: '0.9', changefreq: 'hourly' },
    ...posts.map((p) => ({
      loc: `${domain}/#/cong-dong/${encodeURIComponent(p.slug)}`,
      lastmod: (p.updated_at || p.published_at || new Date().toISOString()).slice(0, 10),
      priority: '0.8',
      changefreq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  const targetPath = resolve(__dirname, '../../public/sitemap.xml');
  writeFileSync(targetPath, xml, 'utf-8');
  console.log(`[sitemap] Generated sitemap with ${urls.length} URLs at ${targetPath}`);
  return targetPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
