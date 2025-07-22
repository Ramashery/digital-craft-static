// файл: generate.js (новая, исправленная версия)

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { promisify } = require('util');
const { handler } = require('serve-handler');
const { execSync } = require('child_process'); // <-- Добавлена эта строка

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

  // --- НАЧАЛО ИЗМЕНЕНИЙ ---
  // Находим путь к предустановленному браузеру в Netlify
  const executablePath = execSync('which chromium-browser || which chromium || which google-chrome').toString().trim();
  console.log(`Found Chromium at: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath, // <-- Вот это ключевое добавление
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  const page = await browser.newPage();
  
  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR);

  for (const p of paths) {
    const url = `http://localhost:${PORT}${p}`;
    console.log(`Generating: ${url}`);
    
    try {
      // Увеличиваем общий таймаут для страницы на всякий случай
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); 
      await page.waitForFunction('window.prerenderReady === true', { timeout: 30000 });
      const content = await page.content();
      const filePath = path.join(BUILD_DIR, p, 'index.html');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(filePath, content);
      console.log(`Saved: ${filePath}`);
    } catch (e) {
      console.error(`Failed to generate ${url}: ${e.message}`);
      // В случае ошибки на одной странице, продолжаем генерировать остальные
    }
  }

  await browser.close();
  server.close();
  console.log('Static site generation complete!');
}

main().catch(error => {
    console.error('An unhandled error occurred:', error);
    process.exit(1); // Завершаем процесс с ошибкой, чтобы Netlify точно пометил сборку как failed
});