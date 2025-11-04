const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname);
const MODULE_PATTERN = /(?:require\(|from |import )['"]((?![.\\/])[a-zA-Z0-9_@\-/]+)['"]/g;
const EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs"]);

const modules = new Set();

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXTS.has(path.extname(entry.name))) {
      const content = fs.readFileSync(fullPath, "utf8");
      let match;
      while ((match = MODULE_PATTERN.exec(content)) !== null) {
        modules.add(match[1]);
      }
    }
  }
}

for (const sub of ["backend", "frontend"]) {
  const base = path.join(ROOT, sub);
  if (fs.existsSync(base)) {
    walk(base);
  }
}

const sorted = Array.from(modules).sort();
for (const name of sorted) {
  console.log(name);
}
