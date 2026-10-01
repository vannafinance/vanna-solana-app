# Current vs New (Android)

`index.html` shows the design as it is on `feature/vanna-v2-designs` (left) next to the working copy (right), inside Android phone, foldable and tablet frames.

## Share it as one file

`vanna-compare.html` is the whole comparison in a single file (both prototypes, images and change log inside). Double-click it or send it to anyone: no server needed. Rebuild it after changes with `node compare/tools/build.js` then `python compare/tools/bundle.py`.

## For teammates: run it in 1 minute

Nothing to install to look at it: `current.html` and `new.html` are already built and committed.

1. Clone and switch to the branch, then go to the design folder:
   ```bash
   git clone https://github.com/vannafinance/vanna-solana-app.git
   cd vanna-solana-app
   git checkout feature/vanna-v2-android-redesign
   cd vanna-v2-designs
   ```
2. Serve the `compare` folder (Python 3 is enough; `npx serve compare -l 8790` also works) and open http://localhost:8790:
   ```bash
   python -m http.server 8790 --directory compare
   ```
   Or double-click `compare/index.html` (works in Chrome without a server).
3. Previews of ideas and research (open with the same server):
   - http://localhost:8790/previews/ideas.html (Explore and Farm ideas)
   - http://localhost:8790/previews/charts.html (live charts)
   - http://localhost:8790/previews/motion.html (connect-wallet designs and transaction motion; regenerate with `python compare/tools/preview_motion.py --video`)
   - http://localhost:8790/previews/research.html (app research board)
   - http://localhost:8790/previews/space-colors.html, top-tabs.html, explore.html

To change the New side you need Node 18+ (no npm packages): `node compare/tools/build.js --watch`. The Python helpers in `tools/` (spaces.py, farm_panel.py, …) need only Python 3; `shots.py` and the preview renderers also need Playwright (`pip install playwright` then `python -m playwright install chromium`). `checkpoints/` and `renders/` are local and not in git. Decisions and history: `SESSION-HANDOFF.md`, `src/changes.json`, `AUDIT-DUPLICATES.md`.

## Open it

Serve the folder and open http://localhost:8790:

```bash
python -m http.server 8790 --directory compare
```

Opening `index.html` straight from disk also works in Chrome.

## Controls

- **Device:** Android phones (360 × 800, Pixel 8 412 × 915 design size, 448 × 998, 360 × 640, tall 412 × 1004, fold cover 344 × 882), foldables open in portrait and landscape, and tablets in portrait and landscape, in dp. Both sides always use the same frame, with a status bar, punch-hole camera and gesture handle. The designs are drawn at 412 × 915, so other sizes stretch that layout. That shows where a compact or tablet layout is needed.
- **Back:** drag in from either edge (gesture navigation), the ◁ key (3-button), or Esc. Works on both sides.
- **Gestures / 3-button:** Android's two system navigation modes, for both sides. 3-button adds the back, home and recents bar and takes 48dp from the app, like a real phone; its back and home keys work.
- **Light / Dark / System:** sets both apps and the page. The in-app setting (Profile → Appearance) then changes only its own side.
- **Welcome | App** above each phone: Welcome restarts that side from the opening screen; App jumps to Home. Each side runs on its own.
- **Changes** lists what New changes. Tapping a screen name there opens it on both sides.

## Making changes (right side only)

```bash
node compare/tools/build.js --watch
```

Edit files in `compare/src/`. Each save rebuilds `new.html`, and the page reloads the New side on the same screen.

- `src/tpl/NN-<Screen>.html` holds the markup, with `{{ holes }}`, `<sc-if>` and `<sc-for>`.
- `src/cls/NN-<Screen>.js` holds the logic, including the light (`L`) and dark (`D`) tokens.
- `src/screens.json`, `titles.json` and `rows.json` hold the screen list and picker groups.
- `src/changes.json` is the change log: `[{ "title", "detail", "date", "screens": ["V7Home"] }]`.

- `src/styles.css` holds New-only CSS (keyframes and similar).
- `tools/welcome.py` generates the Welcome and Connect backdrops from the vector mark (`assets/vanna-mark-2026.svg`, traced from the 2026 logo; `tools/mark.json` holds its outline and the three centrelines used to draw it).
- `python compare/tools/androidify.py` converts iOS-style components to Material 3 (safe to re-run).
- `python compare/tools/shots.py V7Home V7Swap [--dark] [--nav3] [--new-only]` screenshots Current | New pairs into `compare/renders/`.
- `node compare/tools/checkpoint.js save "name" | list | restore N` saves and restores the whole New side.
- `python compare/tools/material_icons.py` converts Phosphor icons to Material Symbols (cached in `tools/material-cache/`).
- `python compare/tools/render_motion.py [Screen] [seconds]` renders a screen's motion frame by frame to `compare/renders/` (New alone, and Current vs New side by side).

`current.html` is always built from `baseline/vanna-v7-prototype.html`, a read-only copy of the branch prototype, and is never edited. `node compare/tools/unpack.js --force` resets New to Current and discards its edits.
