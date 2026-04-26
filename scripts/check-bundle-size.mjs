import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const rawLimits = {
  html: 1500,
  css: 8_000,
  js: 180_000,
};
const gzipLimits = {
  html: 700,
  css: 3_000,
  js: 60_000,
};

function ensureWithinBudget(label, rawSize, gzipSize, rawLimit, gzipLimit) {
  if (rawSize > rawLimit) {
    throw new Error(`${label} raw size ${rawSize} exceeds budget ${rawLimit}`);
  }

  if (gzipSize > gzipLimit) {
    throw new Error(`${label} gzip size ${gzipSize} exceeds budget ${gzipLimit}`);
  }
}

async function readAsset(extension) {
  const entries = await readdir(assetsDir);
  const match = entries.find((entry) => entry.endsWith(extension));
  if (!match) {
    throw new Error(`No ${extension} asset found in dist/assets.`);
  }

  const contents = await readFile(path.join(assetsDir, match));
  return { fileName: match, contents };
}

const html = await readFile(path.join(distDir, 'index.html'));
const css = await readAsset('.css');
const js = await readAsset('.js');

const htmlGzip = gzipSync(html).byteLength;
const cssGzip = gzipSync(css.contents).byteLength;
const jsGzip = gzipSync(js.contents).byteLength;

ensureWithinBudget('index.html', html.byteLength, htmlGzip, rawLimits.html, gzipLimits.html);
ensureWithinBudget(css.fileName, css.contents.byteLength, cssGzip, rawLimits.css, gzipLimits.css);
ensureWithinBudget(js.fileName, js.contents.byteLength, jsGzip, rawLimits.js, gzipLimits.js);

console.log('Bundle budget check passed', {
  html: { raw: html.byteLength, gzip: htmlGzip },
  css: { file: css.fileName, raw: css.contents.byteLength, gzip: cssGzip },
  js: { file: js.fileName, raw: js.contents.byteLength, gzip: jsGzip },
});
