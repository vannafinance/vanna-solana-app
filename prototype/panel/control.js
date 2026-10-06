// Control panel of the prototype page (inlined by build.mjs after window.__VN_APP / window.__VN_BUNDLE).
// Drives the app in the phone iframe through window.__vnProto (shims/wallet-stand-in.js) and
// window.__vnAppearance (shims/appearance.js); scenario / theme choices live in the page's localStorage
// (vnScenario, vnTheme), which the srcdoc iframe shares.
(function(){
var iframe=document.getElementById('app'),APP=window.__VN_APP;
// ?bare (or #bare): the phone alone, fitted to the window, for side-by-side comparison pages.
var BARE=/(^|[?#&])bare\b/.test(location.search+location.hash);if(BARE)document.body.classList.add('bare');
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}},del:function(k){try{localStorage.removeItem(k)}catch(e){}}};
var AUTH='vanna-wallet-authorization-mainnet';
function win(){return iframe.contentWindow}
var bootedConnected=false;
function load(after){bootedConnected=connected();iframe.onload=function(){setTimeout(function(){applyTheme();if(after)after()},300)};iframe.srcdoc=APP}
function fit(){var pad=BARE?20:40,s=Math.min(1,(innerHeight-pad)/935,(innerWidth-pad)/432),st=document.getElementById('stage'),ph=document.getElementById('phone');ph.style.transform='scale('+s+')';st.style.width=(412*s)+'px';st.style.height=(915*s)+'px'}
addEventListener('resize',fit);fit();
function clearApp(){var keep={vnTheme:1,vnScenario:1};try{Object.keys(localStorage).forEach(function(k){if(!keep[k])localStorage.removeItem(k)})}catch(e){}}
function connected(){return !!store.get(AUTH,null)}
function connect(){var w=win();if(!w||!w.__vnProto)return;var b=w.__vnProto.walletPublicKey().toBytes(),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);var a={addressBase64:btoa(s),label:'Solflare'};store.set(AUTH,JSON.stringify({authToken:'prototype-auth-token',accounts:[a],selectedAccount:a}))}
function go(path){if(connected()){win().__vnProto.go(path);return}connect();load(function(){setTimeout(function(){win().__vnProto.go(path)},900)})}
document.getElementById('restart').onclick=function(){clearApp();load()};
document.getElementById('skip').onclick=function(){if(!connected())connect();load()};
function paintScenario(){var s=store.get('vnScenario','trader');[].forEach.call(document.querySelectorAll('#scenarios .b'),function(b){b.classList.toggle('on',b.dataset.s===s)})}
[].forEach.call(document.querySelectorAll('#scenarios .b'),function(b){b.onclick=function(){store.set('vnScenario',b.dataset.s);store.del('vnMarginOpened');store.del('vnFaucet');paintScenario();load()}});
paintScenario();
function applyTheme(){var t=store.get('vnTheme','light');var w=win();if(w&&w.__vnAppearance)w.__vnAppearance.setDevice(t);[].forEach.call(document.querySelectorAll('#themes .b'),function(b){b.classList.toggle('on',b.dataset.t===t)})}
[].forEach.call(document.querySelectorAll('#themes .b'),function(b){b.onclick=function(){store.set('vnTheme',b.dataset.t);applyTheme()}});
[].forEach.call(document.querySelectorAll('#next input'),function(r){r.onchange=function(){var w=win();if(w&&w.__vnProto)w.__vnProto.setNext(r.value)}});
document.getElementById('offline').onchange=function(e){var w=win();if(w&&w.__vnProto)w.__vnProto.setNext(e.target.checked?'offline':'approve')};
document.getElementById('auto').onchange=function(e){var w=win();if(w&&w.__vnProto)w.__vnProto.setAuto(e.target.checked)};
[].forEach.call(document.querySelectorAll('.screens [data-go]'),function(b){b.onclick=function(){go(b.dataset.go)}});
// keep the panel in step with the one-shot answer, and the status bar ink readable on whatever the app draws under it
setInterval(function(){var w=win();if(!w||!w.__vnProto)return;var n=w.__vnProto.peek();[].forEach.call(document.querySelectorAll('#next input'),function(r){r.checked=r.value===(n==='offline'?'approve':n)});document.getElementById('offline').checked=n==='offline';
 var d=w.document;function ink(y){var list=d.elementsFromPoint(24,y);for(var i=0;i<list.length;i++){var cs=w.getComputedStyle(list[i]),bg=cs.backgroundImage&&cs.backgroundImage!=='none'?cs.backgroundImage:cs.backgroundColor;var m=/rgba?\(([^)]+)\)/.exec(bg);if(m){var p=m[1].split(',').map(parseFloat);if(p.length<4||p[3]>0.5){return (0.2126*p[0]+0.7152*p[1]+0.0722*p[2])/255>0.6}}}return false}
 document.getElementById('sb').classList.toggle('dark',ink(14));document.getElementById('gest').classList.toggle('dark',ink(905))},400);
// For a page that embeds this one (same origin): drive the phone from outside.
// open(path) also works in a phone that started before the wallet was connected in another frame of the same page.
function after(path){return function(){setTimeout(function(){win().__vnProto.go(path)},900)}}
window.vnPanel={go:go,ready:function(){var w=win();return !!(w&&w.__vnProto)},
 open:function(path){if(!connected())connect();if(bootedConnected)win().__vnProto.go(path);else load(after(path))},
 theme:function(t){store.set('vnTheme',t);applyTheme()},
 scenario:function(s,path){store.set('vnScenario',s);store.del('vnMarginOpened');store.del('vnFaucet');paintScenario();load(path?after(path):null)},
 restart:function(){clearApp();load()}};
load();
})();

