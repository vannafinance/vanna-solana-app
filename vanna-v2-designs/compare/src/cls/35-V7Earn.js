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
var vaultsAll = [
{ sym: 'TSLAx', name: 'Tesla xStock', apy: '1.82%', cap: 'Supplied $38.9K · Borrowed $14.9K', icon: '@IMG:a9a1db51309a512ccf9302f8acc244d2@', kind: 'xStocks', mine: '' },
{ sym: 'GOOGLx', name: 'Alphabet xStock', apy: '0.13%', cap: 'Supplied $68.0K · Borrowed $6.8K', icon: '@IMG:cad380b03cb4c689f02e014100f56452@', kind: 'xStocks', mine: '' },
{ sym: 'SOL', name: 'Solana', apy: '0.11%', cap: 'Supplied $36.8K · Borrowed $3.4K', icon: '@IMG:6fe33337309fb2af41d7bb3a0961ebff@', kind: 'Crypto', mine: 'You 1.50' },
{ sym: 'USDC', name: 'USD Coin', apy: '0.03%', cap: 'Supplied $55.0K · Borrowed $2.8K', icon: '@IMG:022fc945e265208f7997f02a7fbdd97f@', kind: 'Stablecoins', mine: 'You 2,500' },
{ sym: 'OPENAI', name: 'OpenAI PreStock', apy: '0.03%', cap: 'Supplied $267.0K · Borrowed $12.7K', icon: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@', kind: 'PreStocks', mine: '' },
{ sym: 'ANTHROPIC', name: 'Anthropic PreStock', apy: '0.01%', cap: 'Supplied $131.4K · Borrowed $4.2K', icon: '@IMG:c0af4af206fcfbcf3cce92e51a5837cf@', kind: 'PreStocks', mine: '' },
{ sym: 'AAPLx', name: 'Apple xStock', apy: '0.01%', cap: 'Supplied $46.5K · Borrowed $1.3K', icon: '@IMG:74e439ecf30e3316195f26ae04a1689e@', kind: 'xStocks', mine: '' }
];
var CP = {"dep1W": ["M0.0 36.5 L54.3 8.0 L108.6 8.0 L162.9 8.0 L217.1 88.0 L271.4 88.0 L325.7 88.0 L380.0 88.0", "M0.0 36.5 L54.3 8.0 L108.6 8.0 L162.9 8.0 L217.1 88.0 L271.4 88.0 L325.7 88.0 L380.0 88.0 L380 96 L0 96 Z"], "dep1M": ["M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 12.5 L241.8 8.0 L276.4 8.0 L310.9 20.6 L345.5 20.6 L380.0 20.6", "M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 12.5 L241.8 8.0 L276.4 8.0 L310.9 20.6 L345.5 20.6 L380.0 20.6 L380 96 L0 96 Z"], "dep3M": ["M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 12.5 L347.0 8.0 L363.5 20.6 L380.0 20.6", "M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 12.5 L347.0 8.0 L363.5 20.6 L380.0 20.6 L380 96 L0 96 Z"], "depAll": ["M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 12.5 L355.5 8.0 L367.7 20.6 L380.0 20.6", "M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 12.5 L355.5 8.0 L367.7 20.6 L380.0 20.6 L380 96 L0 96 Z"], "earn1W": ["M0.0 88.0 L54.3 77.0 L108.6 65.9 L162.9 54.0 L217.1 42.9 L271.4 31.0 L325.7 19.0 L380.0 8.0", "M0.0 88.0 L54.3 77.0 L108.6 65.9 L162.9 54.0 L217.1 42.9 L271.4 31.0 L325.7 19.0 L380.0 8.0 L380 96 L0 96 Z"], "earn1M": ["M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 85.1 L241.8 70.5 L276.4 53.0 L310.9 35.4 L345.5 20.8 L380.0 8.0", "M0.0 88.0 L34.5 88.0 L69.1 88.0 L103.6 88.0 L138.2 88.0 L172.7 88.0 L207.3 85.1 L241.8 70.5 L276.4 53.0 L310.9 35.4 L345.5 20.8 L380.0 8.0 L380 96 L0 96 Z"], "earn3M": ["M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 85.1 L347.0 53.0 L363.5 23.8 L380.0 8.0", "M0.0 88.0 L16.5 88.0 L33.0 88.0 L49.6 88.0 L66.1 88.0 L82.6 88.0 L99.1 88.0 L115.7 88.0 L132.2 88.0 L148.7 88.0 L165.2 88.0 L181.7 88.0 L198.3 88.0 L214.8 88.0 L231.3 88.0 L247.8 88.0 L264.3 88.0 L280.9 88.0 L297.4 88.0 L313.9 88.0 L330.4 85.1 L347.0 53.0 L363.5 23.8 L380.0 8.0 L380 96 L0 96 Z"], "earnAll": ["M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 85.1 L355.5 53.0 L367.7 23.8 L380.0 8.0", "M0.0 88.0 L12.3 88.0 L24.5 88.0 L36.8 88.0 L49.0 88.0 L61.3 88.0 L73.5 88.0 L85.8 88.0 L98.1 88.0 L110.3 88.0 L122.6 88.0 L134.8 88.0 L147.1 88.0 L159.4 88.0 L171.6 88.0 L183.9 88.0 L196.1 88.0 L208.4 88.0 L220.6 88.0 L232.9 88.0 L245.2 88.0 L257.4 88.0 L269.7 88.0 L281.9 88.0 L294.2 88.0 L306.5 88.0 L318.7 88.0 L331.0 88.0 L343.2 85.1 L355.5 53.0 L367.7 23.8 L380.0 8.0 L380 96 L0 96 Z"]};
var cm = this.state.cm || (this.props.earnings ? 'earn' : 'dep'), rg = this.state.rg || '3M';
var modes = [['dep', 'Overall deposit'], ['earn', 'Net earnings']].map(function (m) { var on = m[0] === cm; return { label: m[1], on: on ? 'true' : 'false', bg: on ? '#FFFFFF' : 'transparent', fg: on ? '#FFFFFF' : 'rgba(255,255,255,0.72)', pick: function () { self.setState({ cm: m[0] }); } }; });
var ranges = [['1W', '1 Week'], ['1M', '1 Month'], ['3M', '3 Months'], ['All', 'All Time']].map(function (r) { var on = r[0] === rg; return { label: r[1], on: on ? 'true' : 'false', bg: on ? 'rgba(255,255,255,0.22)' : 'transparent', fg: on ? '#FFFFFF' : 'rgba(255,255,255,0.72)', pick: function () { self.setState({ rg: r[0] }); } }; });
var cp = CP[cm + rg];
var pool = this.state.pool || 'All pools';
var dd = !!this.state.dd;
var kinds = ['All pools','xStocks','PreStocks','Crypto','Stablecoins'];
var opts = kinds.map(function (k) { var on = k === pool; var n = vaultsAll.filter(function (v) { return k === 'All pools' || v.kind === k; }).length; return { label: k, n: String(n), sel: on ? 'true' : 'false', bg: on ? t.page : 'transparent', pick: function () { self.setState({ pool: k, dd: false }); } }; });
var vaults = vaultsAll.filter(function (v) { return pool === 'All pools' || v.kind === pool; }).map(function (v) { var c = {}; for (var k in v) c[k] = v[k]; c.mine = v.mine ? v.mine : false; return c; });
return { t: t, modes: modes, ranges: ranges, cmKey: cm, rgKey: rg, chartLine: cp[0], chartArea: cp[1], chartVal: cm === 'dep' ? '$2,677.87' : '+$1.37', valC: '#FFFFFF', chartLabel: (cm === 'dep' ? 'Overall deposit' : 'Net earnings') + ' over ' + rg, pool: pool, dd: dd, ddAria: dd ? 'true' : 'false', ddRot: dd ? 'rotate(180deg)' : 'none', opts: opts, vaults: vaults, toggleDd: function () { self.setState({ dd: !dd }); } };
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