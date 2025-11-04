import os
import re

ROOT = r"c:\\SWP\\Smart-Attendance-System"
MODULE_PATTERN = re.compile(r"(?:require\(|from |import )['\"]((?![.\\/])[a-zA-Z0-9_@\-/]+)['\"]")
EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs"}

modules = set()
for sub in ["backend", "frontend"]:
    base = os.path.join(ROOT, sub)
    for dirpath, dirnames, filenames in os.walk(base):
        if "node_modules" in dirnames:
            dirnames.remove("node_modules")
        if ".git" in dirnames:
            dirnames.remove(".git")
        for filename in filenames:
            if os.path.splitext(filename)[1] in EXTS:
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, encoding="utf-8") as f:
                        content = f.read()
                except Exception:
                    continue
                for match in MODULE_PATTERN.findall(content):
                    modules.add(match)

for name in sorted(modules):
    print(name)
