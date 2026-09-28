# Vanna Mobile — screen designs

Design screens for the Vanna Solana mobile app (Android-first, Expo later).

- `design/screens/*.dc.html` — one HTML file per screen (Claude Design format, 390×844 artboards).
- `design/canvas.json` — board order, titles and positions.

Live, clickable version: the "Vanna Mobile" design canvas on claude.ai (images and the runtime are served there).

## Screens
| # | File | Screen |
|---|------|--------|
| 01 | Main | Welcome |
| 02 / 02b | Connect / ConnectMWA | Connect wallet (Backpack · Mobile Wallet Adapter) |
| 03 / 03b | Home / HomeB | Portfolio (03b = current direction) |
| 04 | Settings | Profile, watchlist & settings |
| 05 | Earn | Vaults list |
| 06 | Vault | Vault detail |
| 07 / 07b | Amount / SupplySheet | Deposit / Supply sheets |
| 08 | Farm | Leveraged yield |
| 09 | Perps | Market + chart |
| 10 | Order | Order ticket |
| 11 | Markets | Market picker |
| 12 | Swap | Swap with in-screen review |
| 13 | Review | Perps review & sign |

## Build notes for Expo
- Amount fields are plain text inputs (`keyboardType="decimal-pad"`): tapping the number opens the system numeric keyboard, no custom keypad.
- Tokens: Long `#32EEE2` (dark text), Short `#FC5457`, yield teal, brand gradient only on primary CTAs and the logo.
