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
var pairsAll = [
{ pair: 'TSLAx-USDC', name: 'Tesla xStock', price: '$353.59', cap: 'Borrow 4.77% · Liquidity $24.0K', icon: '@IMG:a9a1db51309a512ccf9302f8acc244d2@', kind: 'xStocks', star: true },
{ pair: 'GOOGLx-USDC', name: 'Alphabet xStock', price: '$339.93', cap: 'Borrow 1.25% · Liquidity $61.2K', icon: '@IMG:cad380b03cb4c689f02e014100f56452@', kind: 'xStocks', star: false },
{ pair: 'AAPLx-USDC', name: 'Apple xStock', price: '$332.37', cap: 'Borrow 0.36% · Liquidity $45.2K', icon: '@IMG:74e439ecf30e3316195f26ae04a1689e@', kind: 'xStocks', star: false },
{ pair: 'ANTHROPIC-USDC', name: 'Anthropic PreStock', price: '$1,042.77', cap: 'Borrow 0.40% · Liquidity $127.3K', icon: '@IMG:c0af4af206fcfbcf3cce92e51a5837cf@', kind: 'PreStocks', star: false },
{ pair: 'OPENAI-USDC', name: 'OpenAI PreStock', price: '$2,117.09', cap: 'Borrow 0.59% · Liquidity $254.3K', icon: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@', kind: 'PreStocks', star: true }
];
var f = this.state.f || 'All';
var filters = chipList(['All','xStocks','PreStocks','Watchlist'], f, 'f');
var pairs = pairsAll.filter(function (p) { return f === 'All' || (f === 'Watchlist' ? p.star : p.kind === f); });
return { t: t, filters: filters, pairs: pairs };
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
__v.toggleSw = function () { self.setState({ __sw: !__sw }); };
return __v;
}
}