# Connect a wallet: wallet picker (final)

This is an interactive design prototype. Nothing in the app imports it. It covers the sheet that opens when someone taps **Connect wallet** on the intro screen or **Add wallet** in Account > Wallets.

**The design is the grid.** The List layout is kept behind the prototype switch only for comparison.

**The wallet list shows only the wallets actually found on the phone.** Wallet A to H are test placeholders for layout checks. On a real phone, every name and icon is the installed wallet app's own label and icon, as Android reports it. Nothing is hardcoded and no brand appears in the design.

## Open it

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "design/wallet-picker/start-server.ps1"
```

The script starts `server.js` hidden on localhost only, at http://localhost:4180/ (it falls back to 4181 or 4182 if that port is busy). It writes the port in use to `.port`, which git ignores.

URL options: `?w=360|412&layout=grid|list&state=<id>` (the layout defaults to grid).

How to use it:
- To run the flow live, tap **Connect wallet** on the phone, or **Add wallet** when Opened from is set to Account.
- The **The wallet app** side panel plays the wallet app: Approve, Decline, Don't answer, Fails.
- **Jump to state** freezes one state so you can inspect it.
- **Scenario** sets what Android finds, how many wallets are already connected (Account), which wallet was used before, where the sheet opened from, and how fast detection is.
- The phone's Back button and Esc both work. **Reduce motion** shows final frames without animation.

The top bar, the note above the phone, the state chips and the side panel are not part of the design.

Files:
- `index.html`
- `picker.css`
- `picker.js`
- `vanna-mark.js`: the Vanna mark path, copied verbatim from `src/generated/brand.ts` (`VANNA_SHAPE`, used by `VannaMark` in `src/components/brand.tsx`)
- `server.js`
- `start-server.ps1`

## Decisions

| # | Decision | Status |
|---|---|---|
| 1 | Detected wallets are shown as a **grid**: 3 columns at 360 and 412 px | Decided |
| 2 | Grid tile has no box: the app's icon (48 px, rounded square, with a low-contrast 1 px ring so dark icons don't vanish into the sheet) and the name below (12.5 px, centred, up to 2 lines, then an ellipsis). The touch target is the full tile width, at least 108 px tall. Pressed: a subtle highlight behind the icon and name, and a slight press scale | Decided |
| 3 | **Last used** is a small badge above the icon (first connect only) | Decided |
| 4 | Detecting skeleton matches the grid: rounded-square skeleton icons plus two short text bars, no boxes. It shows only if detection takes more than about 150 ms, then stays at least 400 ms | Decided |
| 5 | **Can't see your wallet?** is a full-width row under the grid, opening Android's own chooser. It is not shown in the no-wallet state | Decided |
| 6 | No visible scrollbar anywhere. The sheet is capped at the app's large sheet height; extra content scrolls inside it with a soft fade at the bottom edge | Decided |
| 7 | Only wallets actually found on the phone are listed, with their Android name and icon. Generic wallet tile if there is no icon | Decided |
| 8 | One wallet app = one connected wallet. From Account, wallet apps already connected are not shown at all. If all are connected: "All your wallet apps are already connected." with Close | Decided |
| 9 | At most 2 wallets. With 2 kept, Add wallet asks first: "You can keep 2 wallets. Which one should this replace?" (rows with name, short address, **In use**; Cancel) | Decided |
| 10 | After a replace, the **new wallet becomes the one in use**. The old one is removed only after the new one connects successfully; if connecting fails, is declined, times out or is cancelled, nothing is removed. Toast: "Wallet B connected. Wallet A removed." | Decided |
| 11 | One wallet found: it connects immediately with no list; **Use a different wallet** is the way out | Decided |
| 12 | Back or X while waiting cancels and returns to the list (or closes, when only one wallet was found). A tap outside shows a short toast instead | Decided |
| 13 | Waiting state with **Open X again** and **Cancel**. Open X again is there in case the wallet did not come up or the person came back without answering; it starts a fresh connection request in that wallet and drops the old one | Decided |
| 14 | No-wallet message keeps "Mobile Wallet Adapter", with one link to https://solanamobile.com/wallets. No named wallets, no store buttons | Decided |
| 15 | Dark only, including Account > Add wallet | Decided |
| 16 | **Connected** plays a short link animation once (below), then the sheet closes with the toast | Decided |

### Connected animation (about 1.2 s, plays once, as the result of the wallet's approval)
| Time | What happens |
|---|---|
| 0 to 0.4 s | The Vanna mark (left, the real mark from `brand.tsx` on a 48 px dark tile with the hairline ring) and the wallet's own icon (right) scale in; a dotted line lies between them |
| 0.2 to 0.7 s | A soft lilac pulse travels from Vanna to the wallet |
| 0.42 to 0.84 s | A solid line draws over the dotted one: they are linked; both icons give a small 6 % nudge |
| 0.82 s | A purple check pops (spring) in the middle of the line |
| 0.88 to 1.2 s | The title **Connected** and the line *X · short address* rise in |
| about 1.6 s | The sheet closes and the toast says **X connected** (or **X connected. Y removed.**) |

- With **Reduce motion** on, the final frame shows at once, with no pulse.
- It is not a loop and not a video. Only transform, opacity and SVG stroke offset are animated.
- In React Native: Reanimated `withDelay` and `withTiming` on the same values, `useReducedMotion` for the final frame, and react-native-svg for the line (as in `first-time-flow.tsx`).

### The hand-over to the wallet app
1. The person taps a wallet. For a moment the sheet says **Opening X…** while Android brings the wallet app up.
2. Android switches to the wallet app. Vanna's sheet moves on to **Waiting for X**, behind it. This is also what the person sees if they come back without answering.
3. Approve: the wallet returns to Vanna, the Connected animation plays, then the sheet closes with the toast.
4. Decline: they come back to **Connection declined**.
5. No answer within the app's wallet wait limit: **X didn't answer**.

### What moves on by itself
| From | To | When |
|---|---|---|
| Detecting | grid / one wallet / no wallet / all connected | As soon as detection returns |
| One wallet found | Opening X… | Immediately |
| Opening X… | Waiting for X | When Android has switched to the wallet |
| Waiting for X | Connected / Declined / Couldn't connect | When the wallet answers and the person is back in Vanna |
| Waiting for X | X didn't answer | After the app's wallet wait limit |
| Connected | sheet closes and the toast shows | After the animation (about 1.6 s in all) |
| No wallet found | looks again | Each time the person comes back to Vanna |

## Final states and copy (`X` = the wallet's name from Android)
| Chip | State | Heading | Line | Actions |
|---|---|---|---|---|
| 1 | Detecting | (title only) | Looking for wallet apps on this phone… | skeleton tiles |
| 2 | Several found | (title only) | Pick your wallet. You'll approve in that app. | one tile per wallet; **Can't see your wallet?** / *Open your phone's wallet list* |
| 2b | Many wallets (8) | as 2 | as 2 | scrolls inside the sheet, no bar |
| 3 | One found | Opening X… | X will ask you to connect to Vanna. | **Cancel**, **Use a different wallet** |
| 4 | No wallet | No wallet app found | Install any Solana wallet app that supports Mobile Wallet Adapter, then come back here. | **See wallets that work with Vanna** (link), **Check again** |
| 5a | Opening | Opening X… | X will ask you to connect to Vanna. | **Cancel** |
| 5b | Waiting | Waiting for X | Approve the connection in X. You'll come back here after. | **Open X again**, **Cancel** |
| 6 | Declined | Connection declined | You declined it in X. Nothing was shared. | **Try again**, **Choose another wallet** |
| 6b | No answer | X didn't answer | Nothing was shared. Open X, check it's unlocked, then tap Try again. | same |
| 6c | Other failure | Couldn't connect | X didn't share an account. Check it's set to Mainnet, then try again. | same |
| 7 | Android's chooser | (Android's own "Open with" screen) | | |
| 7b | Waiting after the chooser | Waiting for your wallet | Approve the connection in your wallet. You'll come back here after. | **Open your wallet again**, **Cancel** |
| Connected | Connected | Connected (after the link animation) | X · short address | none; the sheet closes, then the toast |
| A1 | Add wallet: grid | as 2 | as 2 | wallet apps already connected are not shown |
| A2 | All already connected | Nothing new to add | All your wallet apps are already connected. | **Close** |
| A3 | 2 kept: which to replace (title **Add a wallet**) | | You can keep 2 wallets. Which one should this replace? | 2 rows (name, short address, **In use**), **Cancel** |
| A4 | Replacing A: grid | as 2 | as 2 | the replaced wallet's app is listed; the other connected one is not |

Toasts:
- **X connected**
- **X connected. Y removed.**
- *Waiting for X. Open it again, or tap Cancel.* (tap outside while waiting)

## Implementation note for the developer

### What Android must give the app
One native call each time the sheet opens, plus again on return to the app while the no-wallet state shows. It asks Android for every app that handles `solana-wallet:/v1/associate/local` (ACTION_VIEW, `PackageManager.queryIntentActivities`):

| Field | From Android | Used for |
|---|---|---|
| `label` | `ResolveInfo.loadLabel(pm)` | the tile name, every `X` in copy and toasts |
| `icon` | `ResolveInfo.loadIcon(pm)` drawn to a bitmap, PNG data URI (about 96 px, shown at 48), or `null` | the tile icon, and the right-hand icon in the Opening / Waiting / Failed / Connected states |
| `packageName` | `activityInfo.packageName` | opening that wallet directly (`transact(..., { packageName })`), Last used, hiding wallet apps that are already connected, de-duplication |

- The manifest needs a `<queries>` entry: ACTION_VIEW with `android:scheme="solana-wallet"`.
- De-duplicate by package name. No wallet list is hardcoded for display.
- Stored by the app:
  - `lastWalletPackage`;
  - up to 2 connected wallets `{packageName, address}`;
  - which wallet is in use (after a replace, the new one).

### Data each state needs
| State | Data |
|---|---|
| Detecting | nothing (the query is in flight) |
| Grid | found wallets minus the connected packages that stay (Account), `lastWalletPackage` (first connect only) |
| Opening / Waiting | the picked wallet, `single`, `generic` (after Android's chooser) |
| Failed | the picked wallet, `fail: declined \| timeout \| error` (from the existing error mapping in `external.ts`) |
| No wallet | the static link; an AppState listener that runs detection again |
| All connected | every found package is in the connected set |
| Replace step | the 2 connected wallets and which is in use |
| Replacing | `replacing: packageName`; remove it only after `addExternalWallet` succeeds, then make the new wallet the one in use |
| Connected | the label, the icon, the short address; the Vanna mark (`VannaMark`) |

### Mapping to today's code
- `src/ui/pick-wallet.tsx` becomes the full sheet, open across the whole connection.
- `connectAndAddWallet` takes an optional `replacing`. Its error toast becomes the failed state; the success toast stays.
- The sheet's scroll view uses `showsVerticalScrollIndicator={false}`.
- The grid uses a 3-column wrap with full-width `Pressable` tiles and `minHeight: 108`.

## Checks run
- I drove the prototype in headless Chrome with scrollbars left visible, so a bar would be measured.
- Both layouts, at 360 and 412 px, every state:
  - nothing above the top of the sheet body;
  - no overflowing text;
  - no visible scrollbar;
  - every button at least 48 px, every grid tile at least 96 x 96 px;
  - grid names never over 2 lines;
  - no brand or removed copy;
  - no console errors.
- 8 wallets: the fade shows at the top of the scroll and goes away at the end, and the fallback row can be reached.
- Live flows:
  - replace A with B: decline and close keep both wallets; approve gives the toast "Wallet B connected. Wallet A removed." and B in use;
  - from Account, connected wallet apps are hidden;
  - only connected apps on the phone gives the all-connected state.
- Connected animation: title and check are hidden at 0.45 s and shown at the end. With Reduce motion they show at once.

## Not verified
- What Android actually returns for label and icon on real phones (including a Seeker), and whether every wallet answers the query on every Android version.
- How each wallet returns to Vanna after approving or declining.
- Large system font sizes (not simulated). Grid names wrap to 2 lines and then cut, so very large text will cut long names sooner.
