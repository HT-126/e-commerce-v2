import fs from 'node:fs/promises';
import path from 'node:path';

// Pinned commit from .claude/knowledge/dataset.md. The source repo changes every week.
const COMMIT = '0ce98ce4412b0c7b6b76d8fe809c1e78c7e16b5f';
const URL = `https://raw.githubusercontent.com/arturayupov/womens-fashion-catalog-open-data/${COMMIT}/data/products.json`;
const target = path.join(import.meta.dirname, '../db/data/products.json');

const exists = await fs
  .access(target)
  .then(() => true)
  .catch(() => false);

if (exists) {
  console.log('products.json already exists, skipping download.');
  process.exit(0);
}

console.log('Downloading products.json (about 30 MB)...');
const response = await fetch(URL);
if (!response.ok) {
  console.error(`Download failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
console.log(`Saved to ${path.relative(process.cwd(), target)}`);
