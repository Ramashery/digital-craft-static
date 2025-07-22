const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
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
  const server = createServer((req, res) => handler(req, res, { public: __dirname, cleanUrls: false, directoryListing: false }));
  await promisify(server.listen.bind(server))(PORT);
  console.log(`Local server running at http://localhost:${PORT}`);

  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    console.log('Browser launched successfully.');

    const page = await browser.newPage();
    if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR);

    for (const p of paths) {
      const url = `http://localhost:${PORT}${p.startsWith('/') ? '' : '/'}${p === '/' ? 'index.html' : p}`;
      console.log(`Generating: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
        await page.waitForFunction('window.prerenderReady === true', { timeout: 30000 });
        const content = await page.content();
        
        const finalPath = p.endsWith('/') ? `${p}index.html` : `${p}/index.html`;
        const filePath = path.join(BUILD_DIR, finalPath);
        const dirPath = path.dirname(filePath);
        
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, content);
        console.log(`Saved: ${filePath}`);
      } catch (e) {
        console.error(`Failed to generate ${url}: ${e.message}`);
      }
    }
  } catch (error) {
    console.error('An error occurred during the build process:', error);
    process.exit(1);
  } finally {
    if (browser !== null) await browser.close();
    server.close();
  }

  console.log('Static site generation complete!');
}

main();