const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const out = path.join(root, 'build');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copy(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
}

async function run() {
  try {
    const files = ['index.html', 'form.html', 'app.js', 'style.css'];
    await ensureDir(out);
    for (const f of files) {
      const src = path.join(root, f);
      const dest = path.join(out, f);
      if (fs.existsSync(src)) {
        await copy(src, dest);
        console.log(`Copied ${f}`);
      } else {
        console.warn(`Skipping missing file ${f}`);
      }
    }
    console.log('Build complete.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
