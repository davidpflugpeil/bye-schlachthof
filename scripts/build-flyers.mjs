/**
 * Renders every flyer in flyer/*.html to an A4 PDF and a PNG preview.
 * Usage: node scripts/build-flyers.mjs
 *
 * Playwright is deliberately not a dependency of the app. Install it once with
 *   npm install --no-save playwright && npx playwright install chromium
 */
import { mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FLYER_DIR = path.join(ROOT, "flyer");
const PDF_DIR = path.join(FLYER_DIR, "pdf");
const PREVIEW_DIR = path.join(FLYER_DIR, "preview");

// CommonJS resolution, so a globally installed Playwright (NODE_PATH) works too.
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Playwright is missing: npm install --no-save playwright && npx playwright install chromium",
  );
  process.exit(1);
}

// A4 at 96 dpi; the preview renders at twice that.
const A4 = { width: 794, height: 1123 };

const files = (await readdir(FLYER_DIR)).filter((name) => name.endsWith(".html")).sort();
await mkdir(PDF_DIR, { recursive: true });
await mkdir(PREVIEW_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: A4, deviceScaleFactor: 2 });
await page.emulateMedia({ media: "print" });

for (const file of files) {
  const name = path.basename(file, ".html");
  await page.goto(pathToFileURL(path.join(FLYER_DIR, file)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  await page.pdf({
    path: path.join(PDF_DIR, `${name}.pdf`),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.locator(".page").screenshot({ path: path.join(PREVIEW_DIR, `${name}.png`) });
  console.log(`flyer/pdf/${name}.pdf  flyer/preview/${name}.png`);
}

await browser.close();
