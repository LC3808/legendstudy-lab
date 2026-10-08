# LAB brand icon source

`legendstudy_app_icon_master.png` is the Owner-confirmed canonical artwork. It is the only
authority for the LAB mark: orange gradient rounded-square, white notebook outline, **white
pencil body**.

| | |
|---|---|
| Origin repo | `legendstudy-app` |
| Origin branch | `claude/final-store-release-2026-10-08` |
| Origin commit | `a3cc3b3` (fix(brand): canonical App Icon from Owner master — restore WHITE pencil body) |
| Origin path | `assets/brand/source/legendstudy_app_icon_master.png` |
| SHA-256 | `e37afa18ceaf9e27ab275c1cb460b512697baa3d745689ed741c871ce079abfe` |
| Size | 1254 x 1254 RGBA |

The same file is kept here so building the LAB icons never depends on another checkout.
`scripts/build-brand-assets.py` refuses to run if this file's SHA-256 is not the canonical
one, so a replaced or edited master cannot ship quietly.

Regenerate every derived asset with:

```bash
python3 scripts/build-brand-assets.py
```

That writes `public/brand/legendstudy-app-icon.png` (header, 256), `src/app/icon.png` (512),
`src/app/apple-icon.png` (180) and `src/app/favicon.ico` (16/32/48/64). The pipeline only
makes the area outside the rounded silhouette transparent and resamples — the artwork
itself is never redrawn, recoloured or re-scaled.

Rules for this mark (Owner directives, 2026-10-08):

- Never redraw, recolour or re-proportion the symbol. The pencil body stays white.
- The favicon must keep the rounded silhouette in a browser tab; do not rely on an
  iOS-style automatic mask.
- The header mark is sized by `--brand-mark` in `src/app/globals.css`.