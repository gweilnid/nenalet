"""Sestaví distribuční soubory pro danou adresu serveru:
- backend/nenalet/static/nenalet-chrome.zip  (rozšíření s nastavenou adresou)
- backend/nenalet/static/Nenalet.shortcut    (podepsaná zkratka pro iPhone)

Použití:  python3 build_dist.py https://b2bsaas.cz/nenalet
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "backend" / "nenalet" / "static"


def build_extension(api_base: str) -> Path:
    src = ROOT / "extension"
    out = STATIC / "nenalet-chrome.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob("*")):
            if f.is_dir() or f.name.startswith("."):
                continue
            arc = Path("nenalet-chrome") / f.relative_to(src)
            if f.name == "config.js":
                code = re.sub(r'DEFAULT_API_BASE = "[^"]*"', f'DEFAULT_API_BASE = "{api_base}"', f.read_text(encoding="utf-8"))
                z.writestr(str(arc), code)
            else:
                z.write(f, str(arc))
    return out


def build_shortcut(api_base: str) -> Path:
    subprocess.run([sys.executable, str(ROOT / "shortcut" / "build_shortcut.py"), api_base], check=True)
    out = STATIC / "Nenalet.shortcut"
    shutil.copy(ROOT / "shortcut" / "Nenalet.shortcut", out)
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    base = sys.argv[1].rstrip("/")
    print(build_extension(base))
    print(build_shortcut(base))
