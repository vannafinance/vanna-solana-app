# Flows

Every screen of the v2 app designs, in the order a user meets them. Each flow also has a one-image overview in the `flows` folder. Board names (for example `V7PerpsOrder`) match the Claude Design canvas and the prototype's screen list.

## 1. Start and connect

Start: the opening plays once, then Connect wallet walks through Backpack step by step.

Overview: [flows/01-start-and-connect.jpg](flows/01-start-and-connect.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Welcome · opening motion | `V7Welcome` | [view](screens/01-start-and-connect/01-welcome-opening-motion.png) |
| 2 | Connect · pick Backpack | `V7Connect` | [view](screens/01-start-and-connect/02-connect-pick-backpack.png) |
| 3 | Connect · approve in Backpack | `V7ConnectApprove` | [view](screens/01-start-and-connect/03-connect-approve-in-backpack.png) |
| 4 | Connect · add Vanna RPC | `V7ConnectRpc` | [view](screens/01-start-and-connect/04-connect-add-vanna-rpc.png) |
| 5 | Connect · connected | `V7ConnectDone` | [view](screens/01-start-and-connect/05-connect-connected.png) |

## 2. Home

Home: wallet and margin at a glance, products as tiles, positions as a list.

Overview: [flows/02-home.jpg](flows/02-home.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Home · Overview | `V7Home` | [view](screens/02-home/01-home-overview.png) |
| 2 | Home · notifications | `V7HomeNotif` | [view](screens/02-home/02-home-notifications.png) |
| 3 | Notifications | `V7Notifications` | [view](screens/02-home/03-notifications.png) |
| 4 | Home · Lender | `V7Lender` | [view](screens/02-home/04-home-lender.png) |
| 5 | Home · Trader | `V7Trader` | [view](screens/02-home/05-home-trader.png) |
| 6 | Trader · history | `V7TraderHistory` | [view](screens/02-home/06-trader-history.png) |
| 7 | Profile | `V7Profile` | [view](screens/02-home/07-profile.png) |

## 3. Perps

Perps: market → order → approve → confirmed, then manage the position (close or add collateral).

Overview: [flows/03-perps.jpg](flows/03-perps.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Perps · Markets | `V7Perps` | [view](screens/03-perps/01-perps-markets.png) |
| 2 | Perps · asset | `V7PerpsMarket` | [view](screens/03-perps/02-perps-asset.png) |
| 3 | Order | `V7PerpsOrder` | [view](screens/03-perps/03-order.png) |
| 4 | Order · approve | `V7PerpsOrderSign` | [view](screens/03-perps/04-order-approve.png) |
| 5 | Order · confirming | `V7PerpsOrderConfirm` | [view](screens/03-perps/05-order-confirming.png) |
| 6 | Order · confirmed | `V7PerpsOrderDone` | [view](screens/03-perps/06-order-confirmed.png) |
| 7 | Perps · Positions | `V7PerpsPositions` | [view](screens/03-perps/07-perps-positions.png) |
| 8 | Close · all | `V7PerpsClose` | [view](screens/03-perps/08-close-all.png) |
| 9 | Close · 50% | `V7PerpsClose50` | [view](screens/03-perps/09-close-50.png) |
| 10 | Close · done | `V7PerpsCloseDone` | [view](screens/03-perps/10-close-done.png) |
| 11 | Add collateral | `V7PerpsAdd` | [view](screens/03-perps/11-add-collateral.png) |
| 12 | Add collateral · approve | `V7PerpsAddSign` | [view](screens/03-perps/12-add-collateral-approve.png) |
| 13 | Add collateral · done | `V7PerpsAddDone` | [view](screens/03-perps/13-add-collateral-done.png) |
| 14 | Perps · History | `V7PerpsHistory` | [view](screens/03-perps/14-perps-history.png) |

## 4. Margin account

Margin account: created once, before the first Perps or Farm trade.

Overview: [flows/04-margin-account.jpg](flows/04-margin-account.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Create margin account | `V7MarginCreate` | [view](screens/04-margin-account/01-create-margin-account.png) |
| 2 | Borrow agreement | `V7MarginAgree` | [view](screens/04-margin-account/02-borrow-agreement.png) |
| 3 | Approve in Backpack | `V7MarginSign` | [view](screens/04-margin-account/03-approve-in-backpack.png) |
| 4 | Margin account active | `V7MarginDone` | [view](screens/04-margin-account/04-margin-account-active.png) |

## 5. Swap

Swap from your wallet via Jupiter: pick, approve, confirming, swapped.

Overview: [flows/05-swap.jpg](flows/05-swap.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Swap | `V7Swap` | [view](screens/05-swap/01-swap.png) |
| 2 | Token dropdown | `V7SwapTokens` | [view](screens/05-swap/02-token-dropdown.png) |
| 3 | Via picker | `V7SwapRoute` | [view](screens/05-swap/03-via-picker.png) |
| 4 | Settings | `V7SwapSettings` | [view](screens/05-swap/04-settings.png) |
| 5 | Approve | `V7SwapSign` | [view](screens/05-swap/05-approve.png) |
| 6 | Confirming | `V7SwapConfirm` | [view](screens/05-swap/06-confirming.png) |
| 7 | Swapped | `V7SwapDone` | [view](screens/05-swap/07-swapped.png) |
| 8 | Swap · History | `V7SwapHistory` | [view](screens/05-swap/08-swap-history.png) |

## 6. Earn

Earn: overall deposit and net earnings graphs, pool tabs as on the web, supply and withdraw flows.

Overview: [flows/06-earn.jpg](flows/06-earn.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Earn · overall deposit | `V7Earn` | [view](screens/06-earn/01-earn-overall-deposit.png) |
| 2 | Earn · net earnings | `V7EarnEarnings` | [view](screens/06-earn/02-earn-net-earnings.png) |
| 3 | Pool · Positions | `V7EarnVault` | [view](screens/06-earn/03-pool-positions.png) |
| 4 | Pool · Details | `V7EarnVaultDetails` | [view](screens/06-earn/04-pool-details.png) |
| 5 | Pool · Activity | `V7EarnVaultActivity` | [view](screens/06-earn/05-pool-activity.png) |
| 6 | Pool · Collateral | `V7EarnVaultCollateral` | [view](screens/06-earn/06-pool-collateral.png) |
| 7 | Pool · Analytics | `V7EarnVaultAnalytics` | [view](screens/06-earn/07-pool-analytics.png) |
| 8 | Pool · Managers | `V7EarnVaultManagers` | [view](screens/06-earn/08-pool-managers.png) |
| 9 | Supply | `V7EarnSupply` | [view](screens/06-earn/09-supply.png) |
| 10 | Supply · approve | `V7EarnSupplySign` | [view](screens/06-earn/10-supply-approve.png) |
| 11 | Supply · done | `V7EarnSupplyDone` | [view](screens/06-earn/11-supply-done.png) |
| 12 | Withdraw | `V7EarnWithdraw` | [view](screens/06-earn/12-withdraw.png) |
| 13 | Withdraw · done | `V7EarnWithdrawDone` | [view](screens/06-earn/13-withdraw-done.png) |
| 14 | Earn · Positions | `V7EarnPositions` | [view](screens/06-earn/14-earn-positions.png) |
| 15 | Earn · History | `V7EarnHistory` | [view](screens/06-earn/15-earn-history.png) |

## 7. Farm

Farm: USDC or SOL Kamino pool, any stock as collateral, leverage, deploy; then Position, close in two approvals, and Position History.

Overview: [flows/07-farm.jpg](flows/07-farm.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Deploy | `V7Farm` | [view](screens/07-farm/01-deploy.png) |
| 2 | Pool dropdown | `V7FarmPools` | [view](screens/07-farm/02-pool-dropdown.png) |
| 3 | Collateral dropdown | `V7FarmTokens` | [view](screens/07-farm/03-collateral-dropdown.png) |
| 4 | Leverage 4x | `V7FarmLev4` | [view](screens/07-farm/04-leverage-4x.png) |
| 5 | Deploy · approve | `V7FarmSign` | [view](screens/07-farm/05-deploy-approve.png) |
| 6 | Deploy · done | `V7FarmDone` | [view](screens/07-farm/06-deploy-done.png) |
| 7 | Position · after deploy | `V7FarmPositionsNew` | [view](screens/07-farm/07-position-after-deploy.png) |
| 8 | Position | `V7FarmPositions` | [view](screens/07-farm/08-position.png) |
| 9 | Position detail | `V7FarmPosition` | [view](screens/07-farm/09-position-detail.png) |
| 10 | Close · all | `V7FarmClose` | [view](screens/07-farm/10-close-all.png) |
| 11 | Close · 50% | `V7FarmClose50` | [view](screens/07-farm/11-close-50.png) |
| 12 | Close · approve 1 of 2 | `V7FarmCloseSign` | [view](screens/07-farm/12-close-approve-1-of-2.png) |
| 13 | Close · approve 2 of 2 | `V7FarmCloseStep2` | [view](screens/07-farm/13-close-approve-2-of-2.png) |
| 14 | Close · done | `V7FarmCloseDone` | [view](screens/07-farm/14-close-done.png) |
| 15 | Position History | `V7FarmHistory` | [view](screens/07-farm/15-position-history.png) |

## 8. Sad paths

When things go wrong: every action has a sad path. Not enough balance blocks the button with a clear reason; failed transactions say why (network, price moved, no SOL for fees, a step that did not finish) and offer a retry.

Overview: [flows/08-sad-paths.jpg](flows/08-sad-paths.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Home · offline | `V7HomeOffline` | [view](screens/08-sad-paths/01-home-offline.png) |
| 2 | Connect · RPC not set | `V7ConnectRpcFail` | [view](screens/08-sad-paths/02-connect-rpc-not-set.png) |
| 3 | Connect · declined | `V7ConnectDeclined` | [view](screens/08-sad-paths/03-connect-declined.png) |
| 4 | Connect · no Backpack | `V7ConnectInstall` | [view](screens/08-sad-paths/04-connect-no-backpack.png) |
| 5 | Margin · no SOL for fees | `V7MarginFee` | [view](screens/08-sad-paths/05-margin-no-sol-for-fees.png) |
| 6 | Margin · cancelled | `V7MarginRejected` | [view](screens/08-sad-paths/06-margin-cancelled.png) |
| 7 | Order · not enough margin | `V7PerpsOrderNoFunds` | [view](screens/08-sad-paths/07-order-not-enough-margin.png) |
| 8 | Order · health too low | `V7PerpsOrderRisky` | [view](screens/08-sad-paths/08-order-health-too-low.png) |
| 9 | Order · network error | `V7PerpsOrderFailed` | [view](screens/08-sad-paths/09-order-network-error.png) |
| 10 | Order · cancelled | `V7PerpsOrderRejected` | [view](screens/08-sad-paths/10-order-cancelled.png) |
| 11 | Close · network error | `V7PerpsCloseFailed` | [view](screens/08-sad-paths/11-close-network-error.png) |
| 12 | Add collateral · no SOL | `V7PerpsAddFee` | [view](screens/08-sad-paths/12-add-collateral-no-sol.png) |
| 13 | Swap · not enough USDC | `V7SwapNoFunds` | [view](screens/08-sad-paths/13-swap-not-enough-usdc.png) |
| 14 | Swap · network error | `V7SwapFailed` | [view](screens/08-sad-paths/14-swap-network-error.png) |
| 15 | Swap · price moved | `V7SwapSlippage` | [view](screens/08-sad-paths/15-swap-price-moved.png) |
| 16 | Swap · no SOL for fees | `V7SwapFee` | [view](screens/08-sad-paths/16-swap-no-sol-for-fees.png) |
| 17 | Swap · cancelled | `V7SwapRejected` | [view](screens/08-sad-paths/17-swap-cancelled.png) |
| 18 | Supply · not enough USDC | `V7EarnSupplyNoFunds` | [view](screens/08-sad-paths/18-supply-not-enough-usdc.png) |
| 19 | Supply · no SOL for fees | `V7EarnSupplyFee` | [view](screens/08-sad-paths/19-supply-no-sol-for-fees.png) |
| 20 | Withdraw · more than supplied | `V7EarnWithdrawOver` | [view](screens/08-sad-paths/20-withdraw-more-than-supplied.png) |
| 21 | Withdraw · network error | `V7EarnWithdrawFailed` | [view](screens/08-sad-paths/21-withdraw-network-error.png) |
| 22 | Farm · no GOOGLx | `V7FarmNoFunds` | [view](screens/08-sad-paths/22-farm-no-googlx.png) |
| 23 | Deploy · network error | `V7FarmFailed` | [view](screens/08-sad-paths/23-deploy-network-error.png) |
| 24 | Deploy · cancelled | `V7FarmRejected` | [view](screens/08-sad-paths/24-deploy-cancelled.png) |
| 25 | Close · step 1 failed | `V7FarmCloseFailed` | [view](screens/08-sad-paths/25-close-step-1-failed.png) |
| 26 | Close · step 2 failed | `V7FarmCloseStep2Failed` | [view](screens/08-sad-paths/26-close-step-2-failed.png) |

## 9. Dark mode

Dark mode.

Overview: [flows/09-dark-mode.jpg](flows/09-dark-mode.jpg)

| # | Screen | Board | Image |
|---|---|---|---|
| 1 | Home · dark | `V7HomeDark` | [view](screens/09-dark-mode/01-home-dark.png) |
| 2 | Perps · dark | `V7PerpsDark` | [view](screens/09-dark-mode/02-perps-dark.png) |
| 3 | PerpsMarket · dark | `V7PerpsMarketDark` | [view](screens/09-dark-mode/03-perpsmarket-dark.png) |
| 4 | PerpsPositions · dark | `V7PerpsPositionsDark` | [view](screens/09-dark-mode/04-perpspositions-dark.png) |
| 5 | Swap · dark | `V7SwapDark` | [view](screens/09-dark-mode/05-swap-dark.png) |
| 6 | Earn · dark | `V7EarnDark` | [view](screens/09-dark-mode/06-earn-dark.png) |
| 7 | EarnVault · dark | `V7EarnVaultDark` | [view](screens/09-dark-mode/07-earnvault-dark.png) |
| 8 | Farm · dark | `V7FarmDark` | [view](screens/09-dark-mode/08-farm-dark.png) |
| 9 | FarmPosition · dark | `V7FarmPositionDark` | [view](screens/09-dark-mode/09-farmposition-dark.png) |
| 10 | Trader · dark | `V7TraderDark` | [view](screens/09-dark-mode/10-trader-dark.png) |
| 11 | Lender · dark | `V7LenderDark` | [view](screens/09-dark-mode/11-lender-dark.png) |
| 12 | Notifications · dark | `V7NotificationsDark` | [view](screens/09-dark-mode/12-notifications-dark.png) |
| 13 | Profile · dark | `V7ProfileDark` | [view](screens/09-dark-mode/13-profile-dark.png) |
| 14 | Connect · dark | `V7ConnectDark` | [view](screens/09-dark-mode/14-connect-dark.png) |

## Reproducing a sad path in the prototype

Open `prototype/vanna-v7-prototype.html`, pick an outcome under **Next approval in Backpack** (Network error, Price moved, No SOL for fees, Rejected in Backpack, Step 2 fails), then run any action. The not-enough-balance and health-too-low states are in the Sad paths list of the side panel. Tick **Simulate being offline** for the offline banner.
