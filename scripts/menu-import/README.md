# Menu import (one-off)

How `src/data/menu/products/*.ts` was produced from the public menu on
https://www.sushiriga.lv/menu. Kept for traceability; **not** a runtime dependency and not part of
the build. When the backend owns the menu, this folder can be deleted.

```bash
mkdir -p /tmp/sr && curl -sSL -o /tmp/sr/menu.html https://www.sushiriga.lv/menu
python3 -I scripts/menu-import/extract.py /tmp/sr/menu.html /tmp/sr/menu.json
python3 -I scripts/menu-import/generate.py /tmp/sr/menu.json src/data/menu/products
npx prettier --write src/data/menu/products
```

`generate.py` contains the few hand-made decisions (labels, "Copy of" artefacts, set contents).
See `docs/MENU_DATA.md` for what was kept, normalised or left empty.
