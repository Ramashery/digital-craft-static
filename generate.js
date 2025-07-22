const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { promisify } = require('util');
const { handler } = require('serve-handler');

const PORT = 3000;
const BUILD_DIR = path.join(__dirname, 'out');

const paths = [
  '/',
  '/en/services/custom-web-development-tbilisi',
  '/ka/services/veb-gverdebis-damzadeba-tbilisi',
  '/en/services/seo-optimization-tbilisi',
  '/ka/services/seo-optimizacia-tbilisi',
  '/en/portfolio/case-study-restaurant-website',
  '/en/blog/why-your-tbilisi-business-needs-a-website',
  '/en/contact/contact-us'
];

async function main() {
  const server = createServer((req, res) => handler(req, res, { public: __dirname, cleanUrls: false }));
  await promisify(server.listen.bind(server))(PORT);
  console.log(`Local server running at http://localhost:${PORT}`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    // Эта опция нужна для запуска в окружении Netlify
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR);

  for (const p of paths) {
    const url = `http://localhost:${PORT}${p}`;
    console.log(`Generating: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 35000 });
      await page.waitForFunction('window.prerenderReady === true', { timeout: 30000 });
      const content = await page.content();
      const filePath = path.join(BUILD_DIR, p, 'index.html');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(filePath, content);
      console.log(`Saved: ${filePath}`);
    } catch (e) {
      console.error(`Failed to generate ${url}: ${e.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log('Static site generation complete!');
}

main().catch(console.error);