class Component extends DCLogic {
constructor(props) {
super(props);
this.state = {};
}
renderVals() {
var L = {page:'#F7F7F7',card:'#FFFFFF',text:'#1F1F1F',text2:'#595959',line:'#F4F4F4',bd:'#E5E7EB',hero:'#111111',nav:'#111111',pos:'#1C7C83',neg:'#B33C3E',link:'#703AE6',warn:'#8C0043',shadow:'0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.05)',tv:'#F1EBFD',tvI:'#5029A3',tt:'#EBFCFD',ttI:'#155F64',tr:'#FFE6F2',trI:'#8C0043',chipOn:'#111111',chipOnFg:'#FFFFFF',seg:'#F4F4F4',segOn:'#FFFFFF',segShadow:'0 1px 2px rgba(17,17,17,0.08)',off:'#DFDFDF',offFg:'#595959',scrim:'rgba(17,17,17,0.32)'};
var D = {page:'#111111',card:'#1E1E1E',text:'#FFFFFF',text2:'#BFBFBF',line:'#2C2C2C',bd:'#2C2C2C',hero:'#1E1E1E',nav:'#2C2C2C',pos:'#32EEE2',neg:'#FC5457',link:'#BDA4F4',warn:'#FFB0D6',shadow:'none',tv:'#2F1B61',tvI:'#D3C2F7',tt:'#155F64',ttI:'#BFF6FA',tr:'#6B0033',trI:'#FFB0D6',chipOn:'#FFFFFF',chipOnFg:'#111111',seg:'#111111',segOn:'#2C2C2C',segShadow:'none',off:'#2C2C2C',offFg:'#949494',scrim:'rgba(0,0,0,0.56)'};
var t = this.props.dark ? D : L;
var self = this;
var hArc = function (hf) { var f = Math.max(0.02, Math.min(1, (hf - 1) / 1.5)); var a = Math.PI * (1 - f); return 'M2 9 A7 7 0 0 1 ' + (9 + 7 * Math.cos(a)).toFixed(2) + ' ' + (9 - 7 * Math.sin(a)).toFixed(2); };
var money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var __v = (function () {
var FT = [{"sym": "TSLAx", "px": 353.59, "bal": 1.25, "icon": "@IMG:a9a1db51309a512ccf9302f8acc244d2@"}, {"sym": "GOOGLx", "px": 339.93, "bal": 0, "icon": "@IMG:cad380b03cb4c689f02e014100f56452@"}, {"sym": "AAPLx", "px": 332.37, "bal": 0, "icon": "@IMG:74e439ecf30e3316195f26ae04a1689e@"}, {"sym": "ANTHROPIC", "px": 1042.77, "bal": 0.96, "icon": "@IMG:c0af4af206fcfbcf3cce92e51a5837cf@"}, {"sym": "OPENAI", "px": 2117.09, "bal": 0, "icon": "@IMG:68c99bf0397471dc2d806cfaa2e15d53@"}];
var FP = [{"sym": "USDC", "apy": "5.03%", "k": 0.0503, "b": 0.0065, "px": 1, "avail": "Supply APY", "avail2": "5,996,822 USDC available", "total": "121,554,426 USDC", "util": "95.06%", "icon": "@IMG:022fc945e265208f7997f02a7fbdd97f@"}, {"sym": "SOL", "apy": "4.36%", "k": 0.0436, "b": 0.0116, "px": 118.58, "avail": "Supply APY", "avail2": "255,061 SOL available", "total": "2,480,112 SOL", "util": "89.70%", "icon": "@IMG:6fe33337309fb2af41d7bb3a0961ebff@"}];
var s = this.state;
var ts = s.ts || 'TSLAx', ps = s.ps || 'USDC', lev = s.lev || 2, open = s.open || '';
var tok = FT.filter(function (x) { return x.sym === ts; })[0], pool = FP.filter(function (x) { return x.sym === ps; })[0];
var amt = s.amt === undefined ? tok.bal : s.amt;
var coll = amt * tok.px, debt = (lev - 1) * coll, net = debt * (pool.k - pool.b), hf = lev > 1 ? lev / (lev - 1) : 0;
var f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var borrowAmt = ps === 'USDC' ? f2(debt) + ' USDC' : (debt / pool.px).toFixed(3) + ' SOL';
var held = FT.filter(function (x) { return x.bal > 0; }); if (!held.length) held = FT; var hi = held.map(function (x) { return x.sym; }).indexOf(ts); var stepTok = function (d) { var j = ((hi < 0 ? 0 : hi + d) % held.length + held.length) % held.length; self.setState({ ts: held[j].sym, amt: undefined, open: '' }); };
var over = amt > tok.bal, none = tok.bal <= 0;
var ok = !over && amt > 0 && lev > 1;
var marks = [1, 2, 3, 4, 5].map(function (v) { var on = v === lev; return { label: v + 'X', x: ((v - 1) * 25) + '%', dot: v <= lev ? '#703AE6' : t.bd, fg: on ? t.link : t.text2, pick: function () { self.setState({ lev: v }); } }; });
var sum = [
{ k: 'Deposit', v: f2(amt) + ' ' + ts, c: t.text },
{ k: 'Borrow', v: borrowAmt + (ps === 'USDC' ? ' (≈' + money(debt) + ')' : ''), c: t.text },
{ k: ps + ' borrow APY (Vanna)', v: (pool.b * 100).toFixed(2) + '%', c: t.neg },
{ k: 'Supplied to Kamino', v: money(debt), c: t.pos },
{ k: 'Kamino supply APY', v: pool.apy, c: t.pos },
{ k: ps + ' pool total supplied', v: pool.total, c: t.text },
{ k: ps + ' pool utilization', v: pool.util, c: t.text }
];
var hfC = hf >= 1.5 ? t.pos : (hf > 1.1 ? '#FF8AC2' : t.neg);
return { t: t, tok: tok, pool: pool, bal: f2(tok.bal), amtTxt: f2(amt), amtC: over ? t.neg : t.text, usd: money(coll), err: none ? 'No ' + ts + ' in your wallet. Pick another asset.' : (over ? 'That is more than your wallet balance.' : false),
setMax: function () { self.setState({ amt: tok.bal }); },
poolOpen: open === 'pool', poolAria: open === 'pool' ? 'true' : 'false', poolRot: open === 'pool' ? 'rotate(180deg)' : 'none', poolBd: open === 'pool' ? '#703AE6' : t.line, togglePool: function () { self.setState({ open: open === 'pool' ? '' : 'pool' }); },
poolOpts: FP.map(function (p) { var on = p.sym === ps; return { sym: p.sym, apy: p.apy, avail2: p.avail2, icon: p.icon, sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', pick: function () { self.setState({ ps: p.sym, open: '' }); } }; }),
tokOpen: open === 'tok', tokAria: open === 'tok' ? 'true' : 'false', tokRot: open === 'tok' ? 'rotate(180deg)' : 'none', tokBd: open === 'tok' ? '#703AE6' : t.line, toggleTok: function () { self.setState({ open: open === 'tok' ? '' : 'tok' }); },
tokOpts: FT.map(function (x) { var on = x.sym === ts; return { sym: x.sym, icon: x.icon, bal: x.bal > 0 ? f2(x.bal) : '0', sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text, pick: function () { self.setState({ ts: x.sym, amt: undefined, open: '' }); } }; }),
zPool: open === 'pool' ? '6' : '2', zTok: open === 'tok' ? '6' : '1', anyOpen: open !== '', closeAll: function () { self.setState({ open: '' }); },
nextTok: function () { stepTok(1); }, prevTok: function () { stepTok(-1); }, dotsD: held.length > 1 ? 'flex' : 'none', tokDots: held.map(function (x) { return { bg: x.sym === ts ? '#703AE6' : t.bd }; }),
apyTxt: lev > 1 ? ((lev - 1) * (pool.k - pool.b) * 100).toFixed(2) + '%' : '0.00%', yrTxt: !(amt > 0) ? 'Enter an amount to see it in dollars' : (lev > 1 ? '≈ ' + money(net) + ' a year, paid in ' + ps : 'Pick 2x or more to start earning'), heroHfC: !(amt > 0) ? 'rgba(255,255,255,0.5)' : (lev <= 1 || hf >= 1.5 ? '#32EEE2' : (hf > 1.1 ? '#FF8AC2' : '#FFB4B5')), hfShow: amt > 0 && lev > 1 ? hf.toFixed(2) + ' · ' + (hf >= 1.5 ? 'Safe' : (hf > 1.1 ? 'Moderate' : 'At risk')) : (amt > 0 ? 'No debt' : '—'), liqTxt: !(amt > 0) ? '—' : (lev > 1 ? ts + ' below ' + money(tok.px * 0.1 * (lev - 1)) : 'None at 1x'), levSub: lev > 1 ? 'Borrows ' + borrowAmt + ' from Vanna at ' + (pool.b * 100).toFixed(2) + '%' : 'At 1x nothing is borrowed, so nothing is farmed.', poolTotal: pool.total, poolUtil: pool.util,
borrowSub: 'Borrow ' + ps + ' from Vanna, backed by your ' + ts, marks: marks, fillW: ((lev - 1) * 25) + '%', levTxt: lev.toFixed(1) + 'x', levUp: lev + 'X',
sum: sum, profit: '≈' + money(net).replace('.00', '') + '/yr', perMo: money(net / 12) + '/mo', hfTxt: lev > 1 ? hf.toFixed(2) : '∞', hfD: hArc(lev > 1 ? hf : 2.5), hfC: lev > 1 ? hfC : t.pos, borrowTxt: borrowAmt,
dis: ok ? 'false' : 'true', ctaBg: ok ? 'linear-gradient(90deg, #FC5457, #703AE6)' : t.off, ctaFg: ok ? '#FFFFFF' : t.offFg, ctaLabel: ok ? 'Deploy strategy · approve in wallet' : (none ? 'No ' + ts + ' to deposit' : (over ? 'Not enough ' + ts : (lev <= 1 ? 'Pick leverage above 1x' : 'Enter an amount'))),
deploy: function () { if (ok) self.setState({ __tx: 'sign', __st: 1, __why: '', open: '' }); }, doneText: f2(amt) + ' ' + ts + ' deposited · ' + borrowAmt + ' earning ' + pool.apy + ' on Kamino' };
}).call(this);
var __sw = this.state.__sw === undefined ? !!this.props.switcherOpen : this.state.__sw;
__v.swOpen = __sw;
__v.logoBg = this.props.dark ? '#111111' : '#FFFFFF';
__v.farmIc = this.props.dark ? '#FFFFFF' : '#FF007A';
__v.icoFg = this.props.dark ? '#FFFFFF' : '#703AE6';
__v.icoBg = this.props.dark ? 'rgba(255,255,255,0.18)' : '#FFFFFF';
__v.icoBd = this.props.dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0)';
__v.logoBd = this.props.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0)';
__v.swAria = __sw ? 'true' : 'false';
var __tx = this.state.__tx === undefined ? 'done' : this.state.__tx;
var __st = this.state.__st || 1, __n = 1, __why = this.state.__why || 'network';
__v.txOpen = __tx !== ''; __v.txSign = __tx === 'sign'; __v.txConfirm = __tx === 'confirm'; __v.txDone = __tx === 'done'; __v.txFailed = __tx === 'failed'; __v.txRejected = __tx === 'rejected';
__v.txStepLabel = 'Step ' + __st + ' of ' + __n; __v.txStepShow = __n > 1 ? 'inline-flex' : 'none';
var __F = { network: ['Network error', 'Solana did not confirm this in time. Nothing left your wallet. Check your connection and try again.'],
slippage: ['Price moved too much', 'The price moved past your slippage limit, so nothing was swapped. Try again at the new price.'],
fee: ['Not enough SOL for fees', 'Every Solana transaction needs a tiny SOL fee, about 0.00001 SOL. Add a little SOL to your wallet, then try again.'],
expired: ['Request expired', 'Your wallet didn\'t answer in time, so the request expired. Nothing was sent.'] };
var __partial = __n > 1 && __st > 1 && __why !== 'fee';
var __f = __partial ? ['Step ' + __st + ' of ' + __n + ' did not go through', __v.partialBody || 'The earlier steps are done and saved on-chain. Try again to finish, nothing is lost.'] : (__F[__why] || __F.network);
__v.txFailTitle = __f[0]; __v.txFailBody = __f[1];
__v.failNet = !__partial && (__why === 'network' || __why === 'expired'); __v.failSlip = !__partial && __why === 'slippage'; __v.failFee = !__partial && __why === 'fee'; __v.failStep = __partial;
__v.txRetryLabel = __partial ? 'Try step ' + __st + ' again' : 'Try again';
var __out = function () { try { return (typeof window !== 'undefined' && window.__vnOutcome) || 'ok'; } catch (e) { return 'ok'; } };
var __next = function () { if (self.state.__tx !== 'confirm') return; var w = self.state.__why; if (w && w !== 'ok') { self.setState({ __tx: 'failed' }); return; } if ((self.state.__st || 1) < __n) self.setState({ __tx: 'sign', __st: (self.state.__st || 1) + 1 }); else self.setState({ __tx: 'done', __ok: true }); };
__v.startTx = function () { self.setState({ __tx: 'sign', __st: 1, __why: '' }); };
__v.approveTx = function () { var o = __out(); if (o === 'reject') { self.setState({ __tx: 'rejected' }); return; } var fail = o !== 'ok' && (o !== 'step2' || (self.state.__st || 1) > 1); self.setState({ __tx: 'confirm', __why: fail ? (o === 'step2' ? 'network' : o) : '' }); setTimeout(__next, 2400); };
__v.finishTx = function () { __next(); };
__v.retryTx = function () { self.setState({ __tx: 'sign', __st: self.state.__st || 1, __why: '' }); };
__v.closeTx = function () { self.setState({ __tx: '', __st: 1, __why: '' }); };
__v.toggleSw = function () { self.setState({ __sw: !__sw }); };
return __v;
}
}