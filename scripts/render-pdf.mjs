// Renders report/sample-bug-report.md to report/sample-bug-report.pdf with headless Chromium.
import { chromium } from '@playwright/test';
import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const dir = path.resolve('report');
const md = fs.readFileSync(path.join(dir, 'sample-bug-report.md'), 'utf8');
// inline evidence links become thumbnails under each "Evidence:" line
// embed compressed JPEG copies (macOS sips) so the PDF stays small; the original PNGs are untouched
const cache = path.join(dir, '.pdf-cache'); fs.mkdirSync(cache, { recursive: true });
const small = p => { const out = path.join(cache, path.basename(p).replace(/\.png$/, '.jpg'));
  if (!fs.existsSync(out)) execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '-Z', '1400', path.join(dir, p), '--out', out], { stdio: 'ignore' });
  return '.pdf-cache/' + path.basename(out); };
let html = marked.parse(md).replace(/<code>(evidence\/[^<]+\.png)<\/code>/g, (m, p) => `<code>${p}</code><br><img src="${small(p)}" class="ev">`);
html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:11.5px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#1d2433;margin:0 8mm}
h1{font-size:20px;border-bottom:3px solid #0f3d3e;padding-bottom:6px}h2{font-size:15px;color:#0f3d3e;margin-top:22px;border-bottom:1px solid #d6dde3}
h3{font-size:13px;margin:18px 0 4px;background:#f1f5f7;padding:6px 8px;border-left:4px solid #c0392b}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cfd8dc;padding:4px 6px;vertical-align:top;text-align:left}th{background:#0f3d3e;color:#fff}
code{background:#eef2f4;padding:1px 4px;border-radius:3px;font-size:10.5px}img.ev{display:block;max-width:62%;max-height:260px;border:1px solid #ccd;margin:4px 0 8px}
li{margin:2px 0}h3,table,img{page-break-inside:avoid}</style></head><body>${html}</body></html>`;
fs.writeFileSync(path.join(dir, 'sample-bug-report.html'), html);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + path.join(dir, 'sample-bug-report.html'), { waitUntil: 'load' });
await p.pdf({ path: path.join(dir, 'sample-bug-report.pdf'), format: 'A4', margin: { top: '12mm', bottom: '12mm', left: '6mm', right: '6mm' }, printBackground: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">Sample QA report · Toolshop practice site · page <span class="pageNumber"></span>/<span class="totalPages"></span></div>' });
await b.close(); console.log('pdf ok');
