# Transaction sheet motion: porting notes

These notes cover the prototype in this folder (concept-a/b/c.html). It changes only the progress, done and fail views of `TxFlow` in `src/ui/tx.tsx`, plus the matching views in `src/ui/first-time-flow.tsx`. The review phase, the sheet host (`overlay.tsx`), the copy rules and the information shown all stay as they are.

## What every concept keeps

- **Mascot in every state**, drawn by the app's own generator: `chameleon.js` is a line-for-line port of `src/mascot/chameleon.ts`. Each pose is a set of options on `face()` / `markA()`, and none of them is new artwork:
  - waiting: the default ring eyes, with idle blinks and glances (`useIdle`)
  - still waiting: `lidNear/lidFar` at 0.42 to 0.55 (heavy lids)
  - success: `lid: "happy"` plus `tongue` (the existing `MascotDone` strike)
  - failure: `eyes: "sad"` with `mouth: "line"` or `"frown"`, and in B also `pale: 0.42`
  - partial failure: `eyeNear: "sad"` with `mouth: "wavy"`
- **The loader**: the `tail-loader.tsx` coil, with the same path, gradient (`#FC5457 > #B6479E > #703AE6`), 14% track, and the 1.8 s cycle. The cycle draws over 0 to 50%, holds to 62%, then retracts to 100%, on `cubic-bezier(.45,0,.25,1)`, with a linear spin. A and C use it unchanged. B runs the same draw keyframes on the body's own tail but drops the spin (see B).
- **Information**: title, one-line help, the 4 px bar (8 / 33 / 66 / 100%), Sent / Processed / Confirmed, Done / Try again / Close, and the explorer icon. The step card stays for multi-step failures.
- **Proposed copy additions** (optional, all short):
  - a caption under "Sent to Solana": "Signed. Waiting for the network" / "Processed. Confirming now"
  - the waiting caption becomes "Approve in Phantom. If it shows a warning, tap Confirm (unsafe)."

## Copy and controls removed (user decision, all concepts)

Opening the wallet by hand does not make the signing request appear: Mobile Wallet Adapter delivers it on its own schedule. So these items misled the user and are gone from every concept:

- the "Open Phantom" text button (it was under the header while waiting; `openWallet()` in `wallet-wait.tsx` would no longer be called from the tx sheet)
- the long-wait hint box: "No answer for over a minute. Phantom may be locked or behind this app. Open it, unlock and approve. Nothing is sent until you do."
- the "Still waiting for Phantom" title
- the old caption "Open Phantom and approve. Tap Confirm (unsafe) if it shows a warning" (today's `waitingLine()`), replaced by "Approve in Phantom. If it shows a warning, tap Confirm (unsafe)."
- in C, the timer's warning colour after 60 s

The "still waiting" state (after 60 s) stays, but it is visual only. It keeps the same title "Waiting for your wallet" and the same caption. The only signs that time is passing are:
- the mascot's heavier lids and slower breathing (A: 4.2 s, lids at 0.42; B: 3.6 s, lids at 0.55)
- the loader slowing to 2.7 s (A)
- the slower pulse of the waiting step and the bar stub

There is no extra text box and no button.

## Extra poses a designer would need to draw

None are required. Everything above already exists in `chameleon.ts`, although the app uses only part of it today: `sad`, `frown`, `wavy` and `pale` are not used in the tx sheet yet. Two optional poses would make it nicer:

1. A "looking at phone" head tilt for the waiting state. Today a glance plus breathing stands in for it.
2. A proper concerned eyebrow. The sad eye with a half lid reads as concerned at 56 px, but at the 26 px badge in C it is subtle.

## Shared implementation (all concepts)

- **Eyes and lids**: keep the app's approach. `useIdle` steps the state on timers and re-renders the SVG XML, a few hundred bytes per frame and at most about 20 renders a second while a glance runs. If profiling shows it costs too much on the emulator, move the pupils into `Animated.createAnimatedComponent(Circle)` with `useAnimatedProps({cx, cy})` and keep the rest static.
- **Tongue strike**: unchanged from `MascotDone`, timers at 220 + i·40 ms out and +160 + i·45 ms back.
- **Sheet height** between states: `Animated.View` with `layout={LinearTransition.duration(280).easing(Easing.bezier(.2,0,0,1))}` on the sheet body. The prototype animates `height` the same way.
- **Progress fill**: as today, `withTiming(width%, {duration: 500, easing: bezier(.2,0,0,1)})`.
- **Shake** (failure): `translateX = withSequence(withTiming(-6,{duration:76}), withTiming(6,76), withTiming(-4,76), withTiming(3,76), withTiming(0,76))`, about 380 ms on the header row.
- **Rise** (Done buttons, step card, receipt): `entering={FadeInDown.duration(280).withInitialValues({transform:[{translateY:8}]})}`.
- **Reduce motion**: the hook that `mascot.tsx` already has (`AccessibilityInfo.isReduceMotionEnabled`), or Reanimated `useReducedMotion()`. Under it:
  - no loops, shakes, ripples or idle eye motion
  - the loader shows a static coil drawn to 72%. Today's `TailLoader` ignores reduce motion, so this is new.
  - the success face shows happy eyes without the strike
  - the progress width jumps straight to its value
- **Haptics**: unchanged (`haptic.success()` / `haptic.error()`), fired together with the success ripple or the failure shake.

## Journey timeline (how the prototype plays)

Pacing follows `design/margin-account-open-flow.html`:
- text swaps out over 170 ms (fade, -6 px) and swaps in over 320 ms (from +7 px)
- the sheet height transition runs 280 to 450 ms on `bezier(.2,0,0,1)`
- entering elements rise over 280 to 500 ms
- the sheet closes and rises again between runs

A `requestAnimationFrame` clock with a speed multiplier (0.5x, 1x or 2x) walks the loop below. Each step's duration is at 1x.

| Path | Steps |
|---|---|
| Success | waiting (3.2 s), still waiting (3.6 s), sent (2.2 s), processed (2.4 s), confirmed (4.4 s), sheet closes (0.9 s) |
| Failure | waiting (2.4 s), still waiting (3.2 s), failed (4.2 s), sheet closes |
| Partial | waiting (2.0 s), sent (1.8 s), processed (2.0 s), partial failure (4.6 s), sheet closes |

After the partial path it loops back to the start.

Animations that keep playing inside each state:
- loader draw and spin
- mascot blinks, glances and breathing (or B's tail curl and bob)
- the 8% stub breathes (opacity 1 → 0.35 → 1, 1.6 s) while waiting for the wallet
- a highlight travels along the fill (1.6 s) while sent or processed
- the dot of the step being waited for breathes (1.4 s)

Success and failure play their one-shot entrance:
- success: settle `scale 1 → 1.06 → 1` (600 ms), check or ripple, tongue strike
- failure: shake plus the concerned pose

In the app, the real transaction status drives the same transitions (`onStatus` / `onSigned`). The timeline exists only to demo them. The "frame counter" and the playhead on the journey bar are debug aids that show the clock advancing; they are not part of the design.

## Concept A · Calm (recommended)

Layout: the 56 px `MascotDone` face takes the left slot in every state. A 30 px badge, a surface-coloured disc, overlaps its bottom-right corner by 5 px. The badge holds one of three things:
- the 22 px TailLoader while waiting
- a purple check on success
- a pink X on failure

| Element | Property | Values | Duration / easing | RN |
|---|---|---|---|---|
| Face wrapper (waiting) | scale | 1 → 1.035, alternate | 2800 ms (4200 ms after 60 s), ease-in-out, infinite | `withRepeat(withTiming(1.035,{duration:2800,easing:Easing.inOut(Easing.quad)}),-1,true)` |
| Eyes (waiting) | idle | blink 120 ms / 4 to 7 s, glance 300 ms | as `useIdle` | existing |
| Eyes (still waiting) | lids | 0.42, glances 500 ms every 3 to 5 s | | `useIdle` with a base lid |
| Loader badge (still waiting) | opacity, cycle | 0.7, 1.8 → 2.7 s | 300 ms | pass `duration` to TailLoader |
| Glint on fill (sent, processed) | translateX | -100% → 260% of a 40%-wide band | 1600 ms loop, `bezier(.2,0,0,1)` with a 30% rest | a `LinearGradient` child of the fill, `overflow:hidden` |
| Step dot when lit | pulse ring scale, opacity | 1 → 2.6, 0.5 → 0 | 600 ms once | absolute `View` behind the dot |
| Badge loader → check | opacity, scale | 1 → 0, 1 → 0.6 / 0 → 1, 0.6 → 1 | 160 ms linear / 260 ms spring (`damping 14, stiffness 220`) | two absolute views |
| Check | strokeDashoffset | 24 → 0 | 260 ms, 120 ms delay | `AnimatedPath` + `useAnimatedProps` |
| Ripple (success) | scale, opacity | 1 → 1.55, 0.45 → 0 | 700 ms once | 56 px bordered `View` |
| Badge X (failure) | backgroundColor | `#703AE6` → pinkTint | 300 ms | `interpolateColor` |
| Header (failure) | translateX shake | see shared | 380 ms | shared |

Cost: one transform loop on the face while waiting, the loader's two loops, and one glint loop. All of them stop on done and on fail.

## Concept B · Playful

Layout: the full `MascotBody` (88 x 57 px, `pal: "ds"`) takes the left slot. Its own tail is drawn as a separate layer so the eye re-renders never restart it, and that tail runs the TailLoader draw keyframes. The coil is the same `sp(26,62,21,7,80,330,60)` that the loader was cut from, so it is recognisably the same loader in context. The spin is dropped so the tail stays attached to the body. If you need the literal spinning loader, use A's badge treatment instead.

| Element | Property | Values | Duration / easing | RN |
|---|---|---|---|---|
| Tail (waiting / sent / processed) | strokeDashoffset | len → 0 → hold → len | 1800 ms (3000 ms after 60 s), `bezier(.45,0,.25,1)` | `AnimatedPath`, same code as TailLoader minus the rotate |
| Tail (done) | strokeDashoffset | stays at 0 (curled) | | stop the repeat, `withTiming(0)` |
| Body | translateY breathe | 0 → -1.5 px | 2400 ms (3600 ms when long), alternate | `withRepeat` |
| Hop on a new step | translateY, scaleY | 0, -4, 0 / 1, 1.02, 0.97, 1 | 360 ms | `withSequence`, transform origin bottom: wrap in a View and offset |
| Happy hop (done) | translateY, scaleY | 1, -8, 0 / 0.94, 1.04, 0.96, 1 | 520 ms | `withSequence` |
| Ground shadow (done) | scaleX, opacity | 1 → 0.7 → 1 | 520 ms | ellipse `View` |
| Bar head dot | scale on step | 1.6 → 1 | 320 ms spring | absolute 10 px `View` at the fill's end (`left: width% - 5`) |
| Step dot pop | scale | 0 → 1 (overshoot to about 1.25) | 380 ms spring | |
| Droop (failure) | rotate, translateY | -6 deg, +2 px (partial: -3 deg) | 420 ms, `bezier(.2,0,0,1)` | rotate around the tail base: wrap the body and use a translate offset |
| Pale skin (failure) | re-render with `pale:0.42`, opacity 0.35 → 1 | | 300 ms | new XML plus opacity |

Cost: highest of the three, but still tiny. While waiting it runs one SVG stroke animation, one transform loop and the timer-driven eye renders. The full body is about 1.5 KB of SVG.

## Concept C · Data-led

Layout: today's 48 px TailLoader, untouched, in the left slot. A 26 px mascot face sits on it as a badge with a 2.5 px surface ring, overlapping its corner by 7 px. On done the loader crossfades to the 56 px `MascotDone`, which is exactly today's swap. On failure it crossfades to the 52 px pink X ring, and the badge stays.

| Element | Property | Values | Duration / easing | RN |
|---|---|---|---|---|
| Loader | unchanged | | | existing `TailLoader` |
| Badge eyes | glance toward the title, blink once per step | | 300 ms | `useIdle` at 26 px |
| Timer chip | text every second; colour to warning after 60 s | | 200 ms colour | JS `setInterval(1000)` updating a `Text`; or `ReText` from a shared value |
| Track ticks | static 2 px surface-coloured gaps at 33.3% / 66.6% | | | two absolute views |
| Step time | opacity, translateY | 0 → 1, 8 → 0 px | 280 ms | `FadeInDown` |
| Loader → done face | opacity, scale | 1 → 0, 1 → 0.8 / 0 → 1, 0.8 → 1 | 240 ms `bezier(.2,0,0,1)` | two absolute views |
| Badge (done) | scale, opacity | 1 → 0 | 240 ms | |
| Receipt chips (done) | rise | | 280 ms | `FadeInDown` |
| Fill (failure) | backgroundColor | `#703AE6` → negative | 300 ms | `interpolateColor` |

Data shown: elapsed time, the time at which each step landed, "Confirmed in X s", the fee and a short signature. `tx.tsx` already has all of it (`onStatus` timestamps and `hash`). The fee comes from the existing `FEE` row.

## Performance notes (slow emulator, mid-range phones)

- Every loop is a transform, an opacity change or a `strokeDashoffset`. There are no blurs, shadows animated per frame, filters, Lottie files, videos or images.
- At most 3 loops run at the same time (loader draw, loader spin, plus one breathing or glint loop). All stop on done or fail, so nothing runs behind a finished sheet.
- Keep eye re-renders timer-driven, as the app does now. Don't run them per frame. If the emulator struggles, turn glances off while the progress bar is moving (pass `glanceOn=false`, as `MascotDone` already does).
- Don't put `SvgXml` re-renders and Reanimated loops in the same component. Keep the loader and the face as siblings, so a face re-render never re-mounts the loader and restarts its animation. The prototype stacks separate layers for the same reason.
- The sheet height transition uses `LinearTransition` on one view only. Don't animate the whole sheet.
- Gate everything behind reduce motion. That also makes a cheap "lite" mode for the emulator if needed.
