class Component extends DCLogic {
constructor(props) {
super(props);
this.state = { tab: 'Analytics' };
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
var tab = this.state.tab || 'Positions', pt = this.state.pt || 'Current';
var TL = ['Positions','Details','Activity','Collateral','Analytics'], ti = TL.indexOf(tab);
var tabs = TL.map(function (l, i) { var on = l === tab; return { label: l, ml: i === 0 && ti >= 4 ? -48 : 0, on: on ? 'true' : 'false', bg: on ? t.link : 'transparent', fg: on ? t.text : t.text2, pick: function () { self.setState({ tab: l }); } }; });
var ptabs = segList(['Current','History'], pt, 'pt');
return { t: t, tabs: tabs, ptabs: ptabs, isPos: tab === 'Positions', posCur: pt === 'Current', posHist: pt === 'History', isDet: tab === 'Details', isAct: tab === 'Activity', isCol: tab === 'Collateral', isAna: tab === 'Analytics', isMan: tab === 'Managers' };
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