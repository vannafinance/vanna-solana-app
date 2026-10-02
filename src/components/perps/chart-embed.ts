// Hosts a chart may load from and navigate to. Anything else a chart tries to open is blocked.
const ALLOWED_HOSTS = ["tradingview.com", "tradingview-widget.com", "dexscreener.com", "vanna.finance"];

export function isAllowedChartUrl(url: string): boolean {
  if (url === "about:blank") return true;
  const match = /^https:\/\/([^/:?#]+)/i.exec(url);
  if (!match) return false;
  const host = match[1].toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function dexScreenerUrl(pairAddress: string, dark: boolean): string {
  return `https://dexscreener.com/solana/${pairAddress}?embed=1&theme=${dark ? "dark" : "light"}&trades=0&info=0`;
}

// The TradingView Advanced Chart widget, configured the way the web app configures it.
export function tradingViewHtml(symbol: string, dark: boolean, background: string): string {
  const config = JSON.stringify({
    autosize: true,
    symbol,
    interval: "D",
    timezone: "Etc/UTC",
    theme: dark ? "dark" : "light",
    style: "1",
    locale: "en",
    backgroundColor: background,
    allow_symbol_change: false,
    save_image: false,
    calendar: false,
    support_host: "https://www.tradingview.com",
  });
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>html,body{margin:0;height:100%;background:${background}}.tradingview-widget-container,.tradingview-widget-container__widget{height:100%;width:100%}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>${config}</script></div></body></html>`;
}

// DexScreener's embed is built to run inside an iframe on the host page, as on the web app, so it is loaded the same
// way: a page served from Vanna's own origin that frames the embed.
export const DEXSCREENER_HOST_ORIGIN = "https://devnet.solana.vanna.finance";

export function dexScreenerHtml(pairAddress: string, dark: boolean, background: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>html,body{margin:0;height:100%;background:${background}}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${dexScreenerUrl(pairAddress, dark)}" title="DexScreener chart"></iframe></body></html>`;
}

// A plain mobile Chrome identity: the default WebView one is marked as an embedded view and some providers treat it differently.
export const CHART_USER_AGENT = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
