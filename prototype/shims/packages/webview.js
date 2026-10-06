// Replaces `react-native-webview` (native only) for the perps price chart (src/components/perps/embedded-chart.tsx).
//
// On the phone the chart is the TradingView / DexScreener page in a WebView. The prototype is offline, so the WebView
// becomes an iframe showing a sample candlestick chart drawn from a seeded random walk (stable per market). Theme,
// background colour and symbol are read from the HTML the app passes in (`source.html`).

import React from "react";
import { View } from "react-native";

function sampleChartHtml(source) {
  const html = (source && source.html) || "";
  const dark = /"theme"\s*:\s*"dark"|theme=dark|dark/i.test(html.slice(0, 4000)) && !/"theme"\s*:\s*"light"/i.test(html);
  const background = (html.match(/background(?:Color)?["']?\s*[:=]\s*["']?(#[0-9A-Fa-f]{6})/) || [])[1] || (dark ? "#111111" : "#FFFFFF");
  const symbol = (html.match(/"symbol"\s*:\s*"([^"]+)"/) || [])[1] || "";
  const seed = (7919 * symbol.length) % 1000 || 17;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;height:100%;background:${background};font:500 11px system-ui,sans-serif;color:${dark ? "#9A9AA5" : "#6B6B76"};overflow:hidden}
.top{position:absolute;left:10px;top:8px;display:flex;gap:8px;align-items:center}.top b{color:${dark ? "#F2F2F3" : "#1F1F1F"};font-size:12px}
.tag{padding:2px 6px;border-radius:6px;background:${dark ? "#26262C" : "#F0F0F4"}}
svg{position:absolute;inset:0}</style></head><body><div class="top"><b>${symbol ? symbol.split(":").pop() : "Price"}</b><span class="tag">1D</span><span>Sample chart</span></div>
<svg id="c" width="100%" height="100%"></svg><script>
var svg=document.getElementById('c'),W=innerWidth,H=innerHeight,N=70,seed=${seed};
function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
function add(tag,attrs,text){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(text!=null)e.textContent=text;svg.appendChild(e)}
var p=100,c=[];for(var i=0;i<N;i++){var o=p,ch=(rnd()-0.47)*4,cl=o+ch,h=Math.max(o,cl)+rnd()*2,l=Math.min(o,cl)-rnd()*2;c.push([o,h,l,cl,20+rnd()*80]);p=cl}
var hi=Math.max.apply(0,c.map(function(x){return x[1]})),lo=Math.min.apply(0,c.map(function(x){return x[2]}));
var T0=34,bot=H-58,R=48,cw=(W-R-12)/N,y=function(v){return T0+(hi-v)/(hi-lo)*(bot-T0)};
var grid='${dark ? "#26262C" : "#EFEFF3"}';
for(var g=0;g<5;g++){var v=lo+(hi-lo)*g/4,yy=y(v);add('line',{x1:8,x2:W-R,y1:yy,y2:yy,stroke:grid});add('text',{x:W-R+6,y:yy+4},v.toFixed(2))}
c.forEach(function(k,i){var x=8+i*cw+cw/2,up=k[3]>=k[0],col=up?'#1C9C8C':'#E5484D';add('line',{x1:x,x2:x,y1:y(k[1]),y2:y(k[2]),stroke:col});
var y1=y(Math.max(k[0],k[3])),y2=y(Math.min(k[0],k[3]));add('rect',{x:x-cw*0.35,y:y1,width:cw*0.7,height:Math.max(1,y2-y1),fill:col});
var vh=k[4]/100*36;add('rect',{x:x-cw*0.35,y:H-14-vh,width:cw*0.7,height:vh,fill:col,opacity:'.35'})});
var last=c[N-1][3],ly=y(last);add('line',{x1:8,x2:W-R,y1:ly,y2:ly,stroke:'#1C9C8C','stroke-dasharray':'3 3'});add('rect',{x:W-R+2,y:ly-9,width:44,height:18,rx:4,fill:'#1C9C8C'});add('text',{x:W-R+6,y:ly+4,fill:'#fff'},last.toFixed(2));
<\/script></body></html>`;
}

export function WebView({ source, style, onLoadEnd }) {
  return React.createElement(
    View,
    { style: [{ overflow: "hidden" }, style] },
    React.createElement("iframe", {
      srcDoc: sampleChartHtml(source),
      onLoad: onLoadEnd,
      title: "Chart",
      style: { border: 0, width: "100%", height: "100%", background: "transparent" },
    }),
  );
}

export default WebView;
