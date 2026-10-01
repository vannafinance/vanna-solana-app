class Component extends DCLogic {
constructor(props) {
super(props);
this.state = { __why: 'fee' };
}
renderVals() {
var L = {page:'#F7F7F7',card:'#FFFFFF',text:'#1F1F1F',text2:'#595959',line:'#F4F4F4',bd:'#E5E7EB',hero:'#111111',nav:'#111111',pos:'#1C7C83',neg:'#B33C3E',link:'#703AE6',warn:'#8C0043',shadow:'0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.05)',tv:'#F1EBFD',tvI:'#5029A3',tt:'#EBFCFD',ttI:'#155F64',tr:'#FFE6F2',trI:'#8C0043',chipOn:'#111111',chipOnFg:'#FFFFFF',seg:'#F4F4F4',segOn:'#FFFFFF',segShadow:'0 1px 2px rgba(17,17,17,0.08)',off:'#DFDFDF',offFg:'#595959',scrim:'rgba(17,17,17,0.32)'};
var D = {page:'#111111',card:'#1E1E1E',text:'#FFFFFF',text2:'#BFBFBF',line:'#2C2C2C',bd:'#2C2C2C',hero:'#1E1E1E',nav:'#2C2C2C',pos:'#32EEE2',neg:'#FC5457',link:'#BDA4F4',warn:'#FFB0D6',shadow:'none',tv:'#2F1B61',tvI:'#D3C2F7',tt:'#155F64',ttI:'#BFF6FA',tr:'#6B0033',trI:'#FFB0D6',chipOn:'#FFFFFF',chipOnFg:'#111111',seg:'#111111',segOn:'#2C2C2C',segShadow:'none',off:'#2C2C2C',offFg:'#949494',scrim:'rgba(0,0,0,0.56)'};
var t = this.props.dark ? D : L;
var self = this;
var hArc = function (hf) { var f = Math.max(0.02, Math.min(1, (hf - 1) / 1.5)); var a = Math.PI * (1 - f); return 'M2 9 A7 7 0 0 1 ' + (9 + 7 * Math.cos(a)).toFixed(2) + ' ' + (9 - 7 * Math.sin(a)).toFixed(2); };
var money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var __v = (function () {
var s = this.state;
var ag = s.ag === undefined ? false : s.ag;
var chk = !!s.chk, open = s.open === undefined ? 0 : s.open, made = !!s.made;
var sec = function (n) { var o = n === open; return { open: o, aria: o ? 'true' : 'false', rot: o ? 'rotate(180deg)' : 'none', pick: function () { self.setState({ open: o ? -1 : n }); } }; };
var txNow = s.__tx === undefined ? 'failed' : s.__tx;
return { t: t, sec0: sec(0), sec1: sec(1), sec2: sec(2), sec3: sec(3), sec4: sec(4),
noAccount: !s.__ok && txNow !== 'done', hasAccount: !!s.__ok || txNow === 'done',
agreeOpen: ag, openAgree: function () { self.setState({ ag: true }); }, closeAgree: function () { self.setState({ ag: false }); },
chkAria: chk ? 'true' : 'false', chkBd: chk ? '#703AE6' : t.bd, chkBg: chk ? t.tv : 'transparent', boxBd: chk ? '#703AE6' : t.text2, boxBg: chk ? '#703AE6' : 'transparent', toggleChk: function () { self.setState({ chk: !chk }); },
signDis: chk ? 'false' : 'true', signBg: chk ? '#703AE6' : t.off, signFg: chk ? '#FFFFFF' : t.offFg,
sign: function () { if (chk) self.setState({ ag: false, __tx: 'sign', __st: 1, __why: '' }); } };
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
var __tx = this.state.__tx === undefined ? 'failed' : this.state.__tx;
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