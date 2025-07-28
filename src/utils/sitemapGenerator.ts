import fs from 'fs';
import path from 'path';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class SitemapGenerator {
  private baseUrl: string;
  private urls: SitemapUrl[];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.urls = [];
  }

  addUrl(url: SitemapUrl): void {
    this.urls.push({
      ...url,
      loc: `${this.baseUrl}${url.loc}`
    });
  }

  addUrls(urls: SitemapUrl[]): void {
    urls.forEach(url => this.addUrl(url));
  }

  generateXML(): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${this.urls.map(url => this.generateUrlXML(url)).join('\n')}
</urlset>`;
    return xml;
  }

  private generateUrlXML(url: SitemapUrl): string {
    let xml = '  <url>\n';
    xml += `    <loc>${this.escapeXML(url.loc)}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    
    xml += '  </url>';
    return xml;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  writeToFile(filePath: string): void {
    const xml = this.generateXML();
    fs.writeFileSync(filePath, xml, 'utf-8');
  }

  // 動的にサイトマップを生成する関数
  static generateDynamicSitemap(baseUrl: string): string {
    const generator = new SitemapGenerator(baseUrl);
    const currentDate = new Date().toISOString().split('T')[0];

    // 静的ページ
    const staticPages: SitemapUrl[] = [
      { loc: '/', lastmod: currentDate, changefreq: 'weekly', priority: 1.0 },
      { loc: '/diagnosis', lastmod: currentDate, changefreq: 'monthly', priority: 0.9 },
      { loc: '/results', lastmod: currentDate, changefreq: 'monthly', priority: 0.8 },
      { loc: '/login', lastmod: currentDate, changefreq: 'monthly', priority: 0.5 },
      { loc: '/terms', lastmod: currentDate, changefreq: 'yearly', priority: 0.3 },
      { loc: '/privacy', lastmod: currentDate, changefreq: 'yearly', priority: 0.3 },
      { loc: '/about', lastmod: currentDate, changefreq: 'yearly', priority: 0.4 },
      { loc: '/contact', lastmod: currentDate, changefreq: 'monthly', priority: 0.5 },
      { loc: '/faq', lastmod: currentDate, changefreq: 'monthly', priority: 0.6 },
      { loc: '/services', lastmod: currentDate, changefreq: 'monthly', priority: 0.7 }
    ];

    generator.addUrls(staticPages);

    // 動的コンテンツがある場合はここで追加
    // 例: ブログ記事、製品ページなど
    // const dynamicPages = await fetchDynamicPages();
    // generator.addUrls(dynamicPages);

    return generator.generateXML();
  }

  // サイトマップインデックスを生成
  static generateSitemapIndex(baseUrl: string, sitemaps: string[]): string {
    const currentDate = new Date().toISOString();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    sitemaps.forEach(sitemap => {
      xml += `
  <sitemap>
    <loc>${baseUrl}/${sitemap}</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`;
    });

    xml += '\n</sitemapindex>';
    return xml;
  }
}

// CLIから実行できるようにエクスポート
if (require.main === module) {
  const baseUrl = 'https://moneyticket.com';
  const sitemap = SitemapGenerator.generateDynamicSitemap(baseUrl);
  const outputPath = path.join(__dirname, '../../public/sitemap.xml');
  
  fs.writeFileSync(outputPath, sitemap, 'utf-8');
}