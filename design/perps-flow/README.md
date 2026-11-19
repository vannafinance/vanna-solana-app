# Phoenix perps flow prototype

Static HTML, CSS and JS with no build step. It is an **interactive** design prototype: tap Open long on the phone and answer in the mock Phantom panel (Approve, Reject or Time out). Nothing in the app imports it. See NOTES.md, How to use it.

## Open

- Landing: http://localhost:4174/
- First time: http://localhost:4174/first-time.html
- Returning: http://localhost:4174/returning.html

The server falls back to 4175 or 4176 if 4174 is busy, and writes the port in use to `.port`.

Query options: `?theme=light|dark&device=k50i|ultra&rm=1&state=<id>`. A `state` opens on that state in manual mode. Ids:
- states (both pages; the returning page uses the Situation toggle): review, wait, wait60, setup, add, order (first time) or run (returning), done, rejected, timeout, setupFail, addFail, orderFail, noFill, retryWait, retryRun, retryDone, retWait, retRun, retDone

## Start or restart the server (hidden, no console window)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "design/perps-flow/start-server.ps1"
```

## Files

- `perps.js`: the engine, including the Phoenix stage, the journeys and the panel
- `perps.css`: stage and flow styles
- `tx.css`, `chameleon.js`: copied from `design/tx-motion` (tokens, device frames, sheet, the mascot generator)
- `NOTES.md`: storyline and timings, copy and data per state, what to reuse, new props, open questions
