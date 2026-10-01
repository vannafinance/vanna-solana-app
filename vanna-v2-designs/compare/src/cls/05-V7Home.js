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
var P = { warn: 'M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm371-120q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Z', up: 'M103.93-249.98q-13.67-13.43-13.29-32.2.38-18.78 13.06-31.69L312.54-525q26.35-26.35 64.66-26.35 38.3 0 64.65 26.35l95.35 96.11 196.04-194.52h-55.87q-19.15 0-32.33-13.18-13.17-13.17-13.17-32.32 0-19.16 13.17-32.33 13.18-13.17 32.33-13.17h165.26q19.15 0 32.33 13.17 13.17 13.17 13.17 32.33v165.02q0 19.15-13.17 32.32-13.18 13.18-32.33 13.18t-32.33-13.18q-13.17-13.17-13.17-32.32v-55.87L601.85-364.48q-26.35 26.35-64.65 26.35-38.31 0-64.66-26.35l-95.34-95.11-209.61 209.61q-12.68 12.68-31.83 12.68t-31.83-12.68Z', coin: 'M600-160q-134 0-227-93t-93-227q0-134 93-227t227-93q134 0 227 93t93 227q0 134-93 227t-227 93Zm-375-30q-84-39-134.5-117T40-480q0-95 50.5-173T225-770q21-10 38 1.5t17 37.5q0 10-6.5 19.5T257-697q-63 29-100 87.5T120-480q0 71 37 129.5T257-263q10 5 16.5 14t6.5 20q0 25-17 37t-38 2Z', plus: 'M434.5-434.5H237.37q-19.15 0-32.33-13.17-13.17-13.18-13.17-32.33t13.17-32.33q13.18-13.17 32.33-13.17H434.5v-197.13q0-19.15 13.17-32.33 13.18-13.17 32.33-13.17t32.33 13.17q13.17 13.18 13.17 32.33v197.13h197.13q19.15 0 32.33 13.17 13.17 13.18 13.17 32.33t-13.17 32.33q-13.18 13.17-32.33 13.17H525.5v197.13q0 19.15-13.17 32.33-13.18 13.17-32.33 13.17t-32.33-13.17q-13.17-13.18-13.17-32.33V-434.5Z', down: 'M434.5-326.15v-436.48q0-19.15 13.17-32.33 13.18-13.17 32.33-13.17t32.33 13.17q13.17 13.18 13.17 32.33v436.48l186.67-186.68q13.68-13.67 32.07-13.29 18.39.38 32.06 14.05 12.68 13.68 13.06 32.07.38 18.39-13.29 32.07l-264 264q-6.72 6.71-14.92 9.81-8.19 3.1-17.15 3.1-8.96 0-17.15-3.1-8.2-3.1-14.92-9.81L183.7-448.17q-12.92-12.92-12.92-31.57t12.92-32.33q13.67-13.67 32.44-13.67 18.77 0 32.45 13.67L434.5-326.15Z', check: 'm382-362.13 334.7-334.7q13.67-13.67 32.06-13.67t32.07 13.67q13.67 13.68 13.67 32.45 0 18.77-13.67 32.45L414.07-264.41q-13.68 13.67-32.07 13.67t-32.07-13.67L178.41-435.93q-13.67-13.68-13.29-32.45.38-18.77 14.05-32.45 13.68-13.67 32.45-13.67 18.77 0 32.45 13.67L382-362.13Z', safe: 'm438-452-56-56q-12-12-28-12t-28 12q-12 12-12 28.5t12 28.5l84 85q12 12 28 12t28-12l170-170q12-12 12-28.5T636-593q-12-12-28.5-12T579-593L438-452Zm42 368q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 140-80 261.5T505-88q-6 2-12 3t-13 1Z' };
var notesAll = [
{ g: 'Today', kind: 'Health', title: 'GOOGLx farm health is 1.33', body: 'It liquidates at 1.10, if GOOGLx falls below $101.01. Nothing to do yet.', time: '2h', unread: true, img: '@IMG:cad380b03cb4c689f02e014100f56452@', mark: false, d: P.warn, bb: '#B33C3E', cta: 'View position', href: 'V7FarmPosition.dc.html' },
{ g: 'Today', kind: 'Trades', title: 'TSLAx long is up 10.89%', body: '+$152.52 unrealized on your 3x long.', time: '5h', unread: true, img: '@IMG:a9a1db51309a512ccf9302f8acc244d2@', mark: false, d: P.up, bb: '#1C7C83', cta: 'View position', href: 'V7PerpsPositions.dc.html' },
{ g: 'Today', kind: 'Earn', title: 'You earned $0.12', body: 'Interest from the USDC vault landed.', time: '9h', unread: true, img: '@IMG:022fc945e265208f7997f02a7fbdd97f@', mark: false, d: P.coin, bb: '#703AE6', cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'OPENAI short opened', body: '0.9174 OPENAI at $2,180.00 · 2x · $1,000 collateral.', time: 'Sep 25', unread: false, img: '@IMG:68c99bf0397471dc2d806cfaa2e15d53@', mark: false, d: P.plus, bb: '#703AE6', cta: '', href: '' },
{ g: 'Earlier', kind: 'Earn', title: 'Withdrew 500 USDC', body: 'Sent from the USDC vault to your wallet.', time: 'Sep 25', unread: false, img: '@IMG:022fc945e265208f7997f02a7fbdd97f@', mark: false, d: P.down, bb: '#2440A9', cta: '', href: '' },
{ g: 'Earlier', kind: 'Trades', title: 'AAPLx long closed in profit', body: 'Realized +$38.43 (+3.84%) after 3 days.', time: 'Sep 24', unread: false, img: '@IMG:74e439ecf30e3316195f26ae04a1689e@', mark: false, d: P.check, bb: '#1C7C83', cta: '', href: '' },
{ g: 'Earlier', kind: 'Health', title: 'Account back to Safe', body: 'Margin account health is 1.69 after your deposit.', time: 'Sep 23', unread: false, img: '', mark: true, d: P.safe, bb: '#1C7C83', cta: '', href: '' }
];
var notif = this.state.notif === undefined ? !!this.props.notificationsOpen : this.state.notif;
var info = !!this.state.info, read = !!this.state.read;
var notes = notesAll.slice(0, 3).map(function (n) { var c = {}; for (var k in n) c[k] = n[k]; c.unread = n.unread && !read; c.img = n.img ? n.img : false; return c; });
var offline = this.state.offline === undefined ? !!this.props.offline : this.state.offline;
return { t: t, offline: offline, retryNet: function () { self.setState({ offline: false }); }, notes: notes, notif: notif, notifAria: notif ? 'true' : 'false', bellBg: notif ? 'rgba(255,255,255,0.16)' : 'transparent', toggleNotif: function () { self.setState({ notif: !notif }); },
markAll: function () { self.setState({ read: true }); } };
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