# Tx sheet motion prototype

Static HTML, CSS and JS with no build step and no dependencies apart from the Plus Jakarta Sans font from Google Fonts. It is a design prototype only: nothing in the app imports it.

## Open

- Landing: http://localhost:4173/
- Concept A (calm, recommended): http://localhost:4173/concept-a.html
- Concept B (playful): http://localhost:4173/concept-b.html
- Concept C (data-led): http://localhost:4173/concept-c.html

If port 4173 was busy, the server uses 4174 instead. The port in use is written to `.port`.

Query options:
- `?theme=light|dark`
- `&device=k50i|ultra`
- `&rm=1` turns on reduce motion
- `&state=wallet|long|sent|processed|done|fail|partial` opens on that state without autoplay

The switches in the top bar set the same options and remember them.

Each concept page autoplays the full journey as soon as it opens and keeps looping through three paths: success, then failure, then partial failure.

Controls on the right:
- Play / Pause (Space also works)
- Speed: 0.5x, 1x or 2x
- The journey bar: click a segment to jump there
- Success / Failure / Partial path buttons
- A frame counter that you can also overlay on the phone
- Manual state chips and a slider (arrow keys also work). Choosing a state by hand stops the journey, but that state keeps animating.

The top bar has a Size control:
- a 40% to 150% slider
- quick buttons for 50 / 75 / 100 / 125
- Fit to window

Your last choice is remembered.

## Start or restart the server (hidden, no console window)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "design/tx-motion/start-server.ps1"
```

The script stops any older copy of the server, starts `node server.js` hidden (CreateNoWindow) and prints the URL.

To stop it:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -like '*tx-motion*server.js*' } | % { Stop-Process -Id $_.ProcessId }
```

## Files

- `index.html`: landing page with the three concepts, plus the theme, device and reduce-motion switches
- `concept-a.html`, `concept-b.html`, `concept-c.html`: one page per concept, each with every state, the state chips, a slider (arrow keys also work), Play success / failure / partial and Replay sheet
- `tx.js`: the engine (Android frame, the Perps screen behind the sheet, the sheet itself, the state machine and the three concepts)
- `chameleon.js`: a port of `src/mascot/chameleon.ts`, so it is the real mascot artwork
- `tx.css`, `concepts.css`: tokens from `src/theme/tokens.ts`, sheet metrics from `overlay.tsx` and `tx.tsx`, and the motion for each concept
- `NOTES.md`: animated properties, durations, easings and the Reanimated plan for each concept
