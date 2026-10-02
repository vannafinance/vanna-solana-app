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
var theme = this.state.theme || this.props.appearance || 'System';
var dk = theme === 'Dark' ? true : (theme === 'Light' ? false : !!this.props.dark);
t = dk ? D : L;
var themes = segList(['System','Light','Dark'], theme, 'theme').map(function (x) { var p0 = x.pick; x.pick = function () { p0(); try { if (typeof window !== 'undefined' && window.__vnSetTheme) window.__vnSetTheme(x.label); } catch (e) {} }; var on = x.on === 'true'; x.ring = on ? t.link : t.text2; x.dot = on ? t.link : 'transparent'; x.name = x.label === 'System' ? 'System default' : x.label; return x; });
return { t: t, themes: themes, gaugeSafe: t.pos, gaugeLabelC: t.pos };
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
/* faucet (tools/faucet_tabs.py): one call per token, as the existing faucet component does */
var __fo = this.state.__fo === undefined ? !!this.props.faucetOpen : this.state.__fo;
var __fs = this.state.__fs || {};
var __FT = [['USDC', '@IMG:022fc945e265208f7997f02a7fbdd97f@'], ['TSLAx', '@IMG:a9a1db51309a512ccf9302f8acc244d2@'], ['GOOGLx', '@IMG:cad380b03cb4c689f02e014100f56452@'], ['AAPLx', '@IMG:74e439ecf30e3316195f26ae04a1689e@'], ['ANTHROPIC', '@IMG:c0af4af206fcfbcf3cce92e51a5837cf@'], ['OPENAI', '@IMG:68c99bf0397471dc2d806cfaa2e15d53@']];
var __fset = function (sym, st) { var o = {}; o[sym] = st; self.setState({ __fs: Object.assign({}, self.state.__fs, o) }); };
__v.fOpen = __fo;
__v.fShow = function () { self.setState({ __fo: true }); };
__v.fHide = function () { self.setState({ __fo: false }); };
__v.faucet = __FT.map(function (x) {
  var st = __fs[x[0]] || '';
  return { sym: x[0], icon: x[1], label: st === 'busy' ? 'Getting…' : (st === 'done' ? 'Sent' : 'Get'), aria: 'Get test ' + x[0],
    cls: 'vn-ft' + (st ? ' vn-ft-' + st : ''),
    pick: function () { if ((self.state.__fs || {})[x[0]] === 'busy') return; __fset(x[0], 'busy');
      setTimeout(function () { __fset(x[0], 'done'); setTimeout(function () { if ((self.state.__fs || {})[x[0]] === 'done') __fset(x[0], ''); }, 2400); }, 1200); } };
});
/* end faucet */
return __v;
}
}