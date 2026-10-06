# Screenshots of the phone for a list of routes: python3 prototype/tools/shoot.py <prototype url> <out dir> "/home,/earn" light|dark
# Serve the built file over http first (e.g. python3 -m http.server -d prototype/dist 8200).

import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv)>1 else "http://localhost:8124/Vanna-current-app-prototype.html"
OUT = sys.argv[2] if len(sys.argv)>2 else "shots"
routes = sys.argv[3].split(",") if len(sys.argv)>3 else ["/home","/home/lender","/home/trader","/earn","/earn/positions","/trade","/trade/swap","/trade/positions","/farm","/farm/positions"]
theme = sys.argv[4] if len(sys.argv)>4 else "light"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={"width":900,"height":1000})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("t=>{try{localStorage.setItem('vnTheme',t)}catch(e){}}", theme)
    pg.click("#skip"); pg.wait_for_timeout(4000)
    pg.evaluate("t=>document.querySelector('[data-t=\"'+t+'\"]').click()", theme)
    # unscale the phone for crisp 412x915 shots
    pg.evaluate("()=>{const ph=document.getElementById('phone');ph.style.transform='none';document.getElementById('stage').style.width='';document.getElementById('stage').style.height=''}")
    for r in routes:
        pg.evaluate("r=>window.document.getElementById('app').contentWindow.__vnProto.go(r)", r)
        pg.wait_for_timeout(2200)
        pg.evaluate("()=>{const ph=document.getElementById('phone');ph.style.transform='none'}")
        name=r.strip('/').replace('/','_').replace('?','_') or 'root'
        pg.locator("#phone").screenshot(path=f"{OUT}/{name}_{theme}.png")
        print("shot", r)
    print("errors", errs[:5])
