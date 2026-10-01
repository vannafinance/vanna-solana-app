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
var segList = function (labels, cur, key, counts) { return labels.map(function (l, i) { var on = l === cur; var st = {}; st[key] = l; return { label: l, count: counts ? counts[i] : '', on: on ? 'true' : 'false', bg: on ? t.link : 'transparent', sh: 'none', fg: on ? t.text : t.text2, pick: function () { self.setState(st); } }; }); };
var chipList = function (labels, cur, key) { return labels.map(function (l) { var on = l === cur; var st = {}; st[key] = l; return { label: l, on: on ? 'true' : 'false', bg: on ? t.tv : 'transparent', fg: on ? t.tvI : t.text, bd: on ? t.tv : t.bd, ck: on ? 'inline-flex' : 'none', pick: function () { self.setState(st); } }; }); };
var HD = false;
var perpsAll = [
{ pair: 'TSLAx-USDC', icon: '@IMG:a9a1db51309a512ccf9302f8acc244d2@', side: 'Long', sideBg: '#703AE6', lev: '3x', opened: 'Since Sep 22', pnl: '+$152.52', roe: '+10.89%', size: '$4,352.69', sizeU: '12.31 TSLAx', coll: '$1,400.00', collU: 'USDC', liq: '$250.20', liqU: '29.2% away', entry: '$341.20', mark: '$353.59' },
{ pair: 'OPENAI-USDC', icon: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@', side: 'Short', sideBg: '#B33C3E', lev: '2x', opened: 'Since Sep 25', pnl: '+$57.71', roe: '+5.77%', size: '$1,942.22', sizeU: '0.9174 OPENAI', coll: '$1,000.00', collU: 'USDC', liq: '$2,972.80', liqU: '40.4% away', entry: '$2,180.00', mark: '$2,117.09' }
];
var histAll = [
{ pair: 'AAPLx-USDC', icon: '@IMG:74e439ecf30e3316195f26ae04a1689e@', kind: 'Perp', tag: 'Long 2x', tagC: t.link, when: 'Sep 24 · 3 days', pnl: '+$38.43', pct: '+3.84%', up: true, rows: [['Entry → exit', '$318.10 → $324.20'], ['Size', '6.30 AAPLx'], ['Collateral', '$1,000.00'], ['Fees paid', '$1.26']] },
{ pair: 'ANTHROPIC farm', icon: '@IMG:c0af4af206fcfbcf3cce92e51a5837cf@', kind: 'Farm', tag: 'Farm 3x', tagC: t.text2, when: 'Sep 19 · 9 days', pnl: '+$6.12', pct: '+0.61%', up: true, rows: [['Deposited', '0.96 ANTHROPIC'], ['Borrowed', '2,002.12 USDC'], ['Deployed to', 'Kamino USDC'], ['Net APR', '8.76%']] },
{ pair: 'GOOGLx-USDC', icon: '@IMG:cad380b03cb4c689f02e014100f56452@', kind: 'Perp', tag: 'Short 3x', tagC: t.neg, when: 'Sep 18 · 2 days', pnl: '-$21.04', pct: '-3.01%', up: false, rows: [['Entry → exit', '$334.10 → $339.11'], ['Size', '4.20 GOOGLx'], ['Collateral', '$700.00'], ['Fees paid', '$0.84']] },
{ pair: 'OPENAI-USDC', icon: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@', kind: 'Perp', tag: 'Long 2x', tagC: t.link, when: 'Sep 8 · 5 days', pnl: '+$12.80', pct: '+2.56%', up: true, rows: [['Entry → exit', '$2,090.00 → $2,118.00'], ['Size', '0.4571 OPENAI'], ['Collateral', '$500.00'], ['Fees paid', '$0.38']] }
];
var sh = this.state.sh || '', lk = this.state.lk || sh || 'close', pi = this.state.pi || 0, cp = this.state.cp || 100, aa = this.state.aa || 500;
var PN = [{ pnl: 152.52, coll: 1400, size: 4352.69, units: 12.31, dp: 2, sym: 'TSLAx', liq0: 250.20, liq: { 100: 241.28, 250: 227.88, 500: 205.54 } },
{ pnl: 57.71, coll: 1000, size: 1942.22, units: 0.9174, dp: 4, sym: 'OPENAI', liq0: 2972.80, liq: { 100: 3071.90, 250: 3220.50, 500: 3468.20 } }];
var N = PN[pi], P0 = perpsAll[pi], f = cp / 100, fee = N.size * 0.0006 * f, back = (N.coll + N.pnl) * f - fee;
var perps = perpsAll.map(function (p, i) { return Object.assign({}, p, { close: function () { self.setState({ sh: 'close', pi: i, cp: 100 }); }, add: function () { self.setState({ sh: 'add', pi: i, aa: 500 }); } }); });
var isAdd = sh === 'add';
var picks = isAdd ? [100, 250, 500, 1000].map(function (v) { var on = v === aa; return { label: '$' + v.toLocaleString('en-US'), on: on ? 'true' : 'false', bg: on ? '#703AE6' : t.page, fg: on ? '#FFFFFF' : t.text, pick: function () { self.setState({ aa: v }); } }; })
: [25, 50, 75, 100].map(function (v) { var on = v === cp; return { label: v + '%', on: on ? 'true' : 'false', bg: on ? t.tv : t.page, fg: on ? t.tvI : t.text, pick: function () { self.setState({ cp: v }); } }; });
var liqA = N.liq[aa] || N.liq[500];
var srows = isAdd ? [{ k: 'Position collateral', v: money(N.coll) + ' → ' + money(N.coll + aa), c: t.text }, { k: 'Liquidation price', v: money(N.liq0) + ' → ' + money(liqA), c: t.pos }, { k: 'Margin available', v: '$4,320.37 → ' + money(4320.37 - aa), c: t.text }]
: [{ k: 'Closing', v: (N.units * f).toFixed(N.dp) + ' ' + N.sym + ' · ' + money(N.size * f), c: t.text }, { k: 'Realized PnL', v: '+' + money(N.pnl * f), c: t.pos }, { k: 'Trading fee', v: '-' + money(fee), c: t.text }, { k: 'Back to margin account', v: money(back), c: t.text }].concat(cp < 100 ? [{ k: 'Liquidation price', v: 'Unchanged · ' + P0.liq, c: t.text }] : []);
var sp = { icon: P0.icon, title: isAdd ? 'Add collateral' : 'Close position', sub: P0.pair + ' · ' + P0.side + ' ' + P0.lev, pickLabel: isAdd ? 'AMOUNT' : 'CLOSE AMOUNT', cta: isAdd ? 'Add ' + money(aa) + ' · approve in wallet' : 'Close ' + (cp === 100 ? 'all' : cp + '%') + ' · approve in wallet', ctaBg: isAdd ? 'linear-gradient(90deg, #8B4DF7, #5A26C9)' : 'linear-gradient(90deg, #FC5457, #703AE6)' };
var txTitle = lk === 'add' ? 'Collateral added' : (cp === 100 ? 'Position closed' : 'Closed ' + cp + '%');
var txBody = lk === 'add' ? P0.pair + ' now liquidates at ' + money(liqA) + ', further from the mark.' : '+' + money(N.pnl * f) + ' realized · ' + money(back) + ' is back in your margin account.';
var sheetVals = { sheetOn: !!sh, isAdd: isAdd, addAmt: aa.toLocaleString('en-US'), picks: picks, srows: srows, sp: sp, txTitle: txTitle, txBody: txBody, closeSheet: function () { self.setState({ sh: '' }); }, goSheet: function () { self.setState({ sh: '', lk: sh, __tx: 'sign', __st: 1, __why: '' }); } };
var tab = this.state.tab || (this.props.history || HD ? 'History' : 'Current');
var kf = this.state.kf || 'All'; var kinds = chipList(['All','Perps','Farm'], kf, 'kf'); var kindFilter = kf === 'Perps' ? 'Perp' : kf; var showPerps = kf !== 'Farm'; var showFarm = kf !== 'Perps';
var openIdx = this.state.open === undefined ? 0 : this.state.open;
var histSrc = histAll.filter(function (h) { return kindFilter === 'All' || h.kind === kindFilter; });
var hist = histSrc.map(function (h, i) { var o = i === openIdx; return { pair: h.pair, icon: h.icon, tag: h.tag, tagC: h.tagC, when: h.when, pnl: h.pnl, pct: h.pct, c: h.up ? t.pos : t.neg, rows: h.rows.map(function (r) { return { k: r[0], v: r[1] }; }), open: o, exp: o ? 'true' : 'false', rot: o ? 'rotate(180deg)' : 'none', toggle: function () { self.setState({ open: o ? -1 : i }); } }; });
var nums = { 'AAPLx-USDC': 38.43, 'ANTHROPIC farm': 6.12, 'GOOGLx-USDC': -21.04, 'OPENAI-USDC': 12.80 };
var sum = 0, wins = 0; histSrc.forEach(function (h) { sum += nums[h.pair]; if (h.up) wins++; });

var nOpen = (kindFilter === 'Farm' ? '1' : (kindFilter === 'Perps' ? '2' : '3'));
var tabs = segList(['Current','History'], tab, 'tab', [nOpen, String(histSrc.length)]);
var isH = tab === 'History';
var heroNum = isH ? (sum >= 0 ? '+' : '-') + money(Math.abs(sum)) : (showFarm && !showPerps ? '+$1.47' : '+$210.23');
var heroCap = isH ? 'Realized over ' + histSrc.length + ' closed positions' : (showFarm && showPerps ? 'Unrealized on 2 perps · farm earned +$1.47' : (showFarm ? 'Farm earnings · 1 open' : 'Unrealized PnL · 2 open positions'));
return Object.assign({}, sheetVals, { t: t, tabs: tabs, kinds: kinds, perps: perps, hist: hist, isCurrent: !isH, isHistory: isH, showPerps: showPerps, showFarm: showFarm, heroNum: heroNum, heroCap: heroCap, realized: (sum >= 0 ? '+' : '-') + money(Math.abs(sum)), closedN: String(histSrc.length), winRate: Math.round(wins / Math.max(histSrc.length, 1) * 100) + '%' });
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