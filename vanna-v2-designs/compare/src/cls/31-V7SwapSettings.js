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
var TK = [
{ sym: 'USDC', name: 'USD Coin', px: 0.9999, bal: 3120.40, icon: '@IMG:022fc945e265208f7997f02a7fbdd97f@' },
{ sym: 'TSLAx', name: 'Tesla xStock', px: 353.59, bal: 1.25, icon: '@IMG:a9a1db51309a512ccf9302f8acc244d2@' },
{ sym: 'SOL', name: 'Solana', px: 118.58, bal: 2.10, icon: '@IMG:6fe33337309fb2af41d7bb3a0961ebff@' },
{ sym: 'GOOGLx', name: 'Alphabet xStock', px: 339.93, bal: 0, icon: '@IMG:cad380b03cb4c689f02e014100f56452@' },
{ sym: 'AAPLx', name: 'Apple xStock', px: 332.37, bal: 0, icon: '@IMG:74e439ecf30e3316195f26ae04a1689e@' },
{ sym: 'ANTHROPIC', name: 'Anthropic PreStock', px: 1042.77, bal: 0.96, icon: '@IMG:c0af4af206fcfbcf3cce92e51a5837cf@' },
{ sym: 'OPENAI', name: 'OpenAI PreStock', px: 2117.09, bal: 0, icon: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@' }
];
var s = this.state;
var inS = s.inS || 'USDC', outS = s.outS || 'TSLAx';
var amt = s.amt === undefined ? 250 : s.amt;
var dd = s.dd === undefined ? '' : s.dd;
var setO = s.setO === undefined ? true : s.setO;
var mode = s.mode || 'Custom', slip = s.slip || '1.0';
var find = function (sym) { return TK.filter(function (k) { return k.sym === sym; })[0]; };
var A = find(inS), B = find(outS);
var f2 = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var fu = function (n, sym) { if (sym === 'USDC' || n >= 100) return f2(n); var x = n.toFixed(4).replace(/0+$/, ''); return x.split('.')[1] && x.split('.')[1].length >= 2 ? x : n.toFixed(2); };
var rec = amt * A.px / B.px;
var over = amt > A.bal;
var eff = mode === 'Auto' ? '0.5' : slip;
var effN = parseFloat(eff);
var opts = function (which, cur, other) { return TK.map(function (k) { var on = k.sym === cur; return { sym: k.sym, name: k.name, icon: k.icon, bal: k.bal > 0 ? fu(k.bal, k.sym) : '0', balC: k.bal > 0 ? t.text : t.text2, sel: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', pick: function () { var st = { dd: '' }; var mine = k.sym, theirs = k.sym === other ? cur : other; if (which === 'In') { st.inS = mine; st.outS = theirs; } else { st.outS = mine; st.inS = theirs; } self.setState(st); } }; }); };
var quick = [['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(function (q) { return { label: q[0], pick: function () { self.setState({ amt: Math.floor(A.bal * q[1] * 100) / 100 }); } }; });
var modes = ['Auto', 'Custom'].map(function (m) { var on = m === mode; return { label: m, on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text2, pick: function () { self.setState({ mode: m }); } }; });
var presets = ['0.1', '0.5', '1.0'].map(function (p) { var on = mode === 'Custom' && p === slip; return { label: p + '%', on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.link : t.text, bd: on ? t.tv : t.bd, pick: function () { self.setState({ slip: p, mode: 'Custom' }); } }; });
var warn = mode === 'Custom' && effN >= 1 ? (effN >= 5 ? 'Very high slippage. You could lose a large part of this trade.' : 'High slippage can give you a worse price.') : false;
var dex = s.dex === undefined ? false : s.dex;
var rows0 = [
{ k: 'Price impact', v: '< 0.01%', c: t.pos },
{ k: 'Minimum received', v: fu(rec * (1 - effN / 100), outS) + ' ' + outS, c: t.text },
{ k: 'Slippage', v: (mode === 'Auto' ? 'Auto · ' : '') + eff + '%', c: t.text }
];
var rows = rows0.map(function (r, i) { r.bt = i === 0 ? 'transparent' : t.line; return r; });
var ok = !over && amt > 0;
return { t: t, tokIn: A, tokOut: B, pay: f2(amt), payC: over ? t.neg : t.text, payUsd: money(amt * A.px), rec: fu(rec, outS), recUsd: money(rec * B.px),
balIn: 'Balance ' + (A.bal > 0 ? fu(A.bal, A.sym) : '0'), balOut: 'Balance ' + (B.bal > 0 ? fu(B.bal, B.sym) : '0'), zIn: dd === 'In' ? '6' : '3', zOut: dd === 'Out' ? '6' : '1', zDex: dex ? '6' : '4',
dexOpen: dex, dexAria: dex ? 'true' : 'false', dexRot: dex ? 'rotate(180deg)' : 'none', dexBd: dex ? '#703AE6' : t.bd, toggleDex: function () { self.setState({ dex: !dex, dd: '' }); },
anyOpen: dex || dd !== '', closeAll: function () { self.setState({ dex: false, dd: '' }); }, err: false,
quick: quick, rate: '1 ' + B.sym + ' = ' + fu(B.px / A.px, A.sym) + ' ' + A.sym, rows: rows,
ddIn: dd === 'In', ddOut: dd === 'Out', ddInAria: dd === 'In' ? 'true' : 'false', ddOutAria: dd === 'Out' ? 'true' : 'false', rotIn: dd === 'In' ? 'rotate(180deg)' : 'none', rotOut: dd === 'Out' ? 'rotate(180deg)' : 'none',
chipInBd: dd === 'In' ? '#703AE6' : t.page, chipOutBd: dd === 'Out' ? '#703AE6' : t.page,
toggleIn: function () { self.setState({ dd: dd === 'In' ? '' : 'In', dex: false }); }, toggleOut: function () { self.setState({ dd: dd === 'Out' ? '' : 'Out', dex: false }); },
optsIn: opts('In', inS, outS), optsOut: opts('Out', outS, inS),
rot: s.rot || 0, flip: function () { self.setState({ inS: outS, outS: inS, amt: Math.min(Math.round(rec * 100) / 100 || 1, B.bal), rot: (s.rot || 0) + 180, dd: '' }); },
setOpen: setO, toggleSet: function () { self.setState({ setO: !setO, dex: false, dd: '' }); }, modes: modes, presets: presets, slipVal: eff, fieldOp: mode === 'Auto' ? '0.5' : '1', fieldBd: mode === 'Custom' ? '#703AE6' : t.bd,
slipWarn: warn, warnC: effN >= 5 ? t.neg : t.warn, slipShort: (mode === 'Auto' ? 'Auto ' : '') + eff + '%', slipLong: (mode === 'Auto' ? 'Auto · ' : 'Custom · ') + eff + '%',
dis: ok ? 'false' : 'true', ctaBg: ok ? '#703AE6' : t.off, ctaFg: ok ? '#FFFFFF' : t.offFg, ctaLabel: ok ? 'Swap · approve in wallet' : (over ? 'Not enough ' + A.sym : 'Enter an amount'),
cta: function () { if (ok) self.setState({ __tx: 'sign', __st: 1, __why: '', dd: '' }); },
doneText: f2(amt) + ' ' + inS + ' → ' + fu(rec, outS) + ' ' + outS };
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
var __tx = this.state.__tx === undefined ? '' : this.state.__tx;
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