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
var side = this.state.side || 'Long', lev = this.state.lev || 3, amt = this.state.amt === undefined ? 500 : this.state.amt;
var px = 353.59, isL = side === 'Long', sideC = isL ? '#703AE6' : '#B33C3E';
var sides = ['Long','Short'].map(function (l) { var on = l === side; return { label: l, upD: l === 'Long' ? 'flex' : 'none', dnD: l === 'Short' ? 'flex' : 'none', on: on ? 'true' : 'false', bg: on ? (l === 'Long' ? '#703AE6' : '#B33C3E') : 'transparent', fg: on ? '#FFFFFF' : t.text2, pick: function () { self.setState({ side: l }); } }; });
var levs = [1,2,3,4,5].map(function (v) { var on = v === lev; return { label: v + 'x', on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.tvI : t.text, bd: on ? t.tv : t.bd, pick: function () { self.setState({ lev: v }); } }; });
var Q = [['25%', 1080.09], ['50%', 2160.19], ['75%', 3240.28], ['Max', 4320.37]];
var quick = Q.map(function (q) { var on = Math.abs(q[1] - amt) < 0.01; return { label: q[0], on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.tvI : t.text, bd: on ? t.tv : t.bd, pick: function () { self.setState({ amt: q[1] }); } }; });
var size = amt * lev, units = size / px;
var liq = isL ? px * (1 - 0.8 / lev) : px * (1 + 0.7273 / lev);
var hf = Math.max(1.12, 1.69 - (size - amt) / 20000);
var sum = [
{ k: 'Position size', v: money(size) + ' · ' + units.toFixed(4) + ' TSLAx', c: t.text },
{ k: 'Entry price', v: money(px), c: t.text },
{ k: 'Liquidation price', v: money(liq), c: t.text },
{ k: 'Borrow cost', v: (isL ? '0.65% USDC' : '4.77% TSLAx') + ' APY', c: t.text },
{ k: 'Fees', v: money(size * 0.0003), c: t.text }
];
var avail = 4320.37, over = amt > avail, risky = !over && hf < 1.3;
return { t: t, sides: sides, levs: levs, quick: quick, sum: sum, amt: amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), amtC: over ? t.neg : t.text,
err: false, dis: over ? 'true' : 'false', ctaFg: over ? t.offFg : '#FFFFFF',
go: function () { if (!over) self.setState({ __tx: 'sign', __st: 1, __why: '' }); },
hfC: risky ? t.neg : t.text2, hfNote: risky ? 'Account health would drop to ' + hf.toFixed(2) + ', close to liquidation at 1.10. Lower the leverage or the amount.' : 'After this trade your account health is ' + hf.toFixed(2) + '. Liquidation happens at 1.10.', levLabel: lev + 'x · ' + money(size) + ' position', hfAfter: hf.toFixed(2), ctaBg: over ? t.off : sideC, doneTitle: 'Your ' + side.toLowerCase() + ' is open', cta: over ? 'Not enough margin available' : 'Open ' + side.toLowerCase() + ' · approve in wallet', doneText: units.toFixed(4) + ' TSLAx ' + side.toLowerCase() + ' at ' + money(px) + ' · ' + lev + 'x · liq. ' + money(liq) };
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
var __tx = this.state.__tx === undefined ? 'rejected' : this.state.__tx;
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