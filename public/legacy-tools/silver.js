(function(){'use strict';
const TROY=31.1035,BCD=0.05,AIDC=0.01,GST=0.03;
const PF={999:1,925:0.925,900:0.90};
const HKEY='silver_ph_v1',CKEY='silver_cts',CM=5,RTO=1500,CTO=1200,BSM=30,MH=90,FX=75,FI=86;
const S={xagusd:0,usdinr:0,s999:0,s925:0,s900:0,base:0,duty:0,landed999:0,src:'Loading',city:'',updated:null,xagUpdatedAt:'',history:[],charts:{},cd:{999:14,925:14,900:14},n:0,isSeeded:false};
const root=document.getElementById('mg-silver-root');if(!root)return;
const savedTheme=localStorage.getItem('mg_silver_theme')||'light';
root.innerHTML=buildHTML();root.className='mg-app '+(savedTheme==='dark'?'mg-dark':'mg-light');
(async function(){try{await loadDBH();updateUI()}catch(e){loadH();updateUI()}detectCity();fetchR()})();
setupCB();updateHD();setupTT();

function buildHTML(){return`
<div class="mg-theme-bar"><div class="mg-theme-switch" id="sTT"><span>Theme</span><div class="mg-theme-pill"><div class="mg-theme-dot">&#9789;</div></div></div></div>
<div class="mg-hero"><div class="mg-hero-badge">Live Silver Rates</div><h1>Silver <em>Price</em> Tracker</h1><p>Live landed rates in <strong id="sCN">India</strong> with transparent duty breakdown</p>
<div class="mg-sv-hero-pills">
<a href="#sS999" class="mg-sv-hero-pill silver"><span class="mg-sv-hp-label">999 Fine</span><span class="mg-sv-hp-price" id="hp999">...</span><span class="mg-sv-hp-unit">per KG</span></a>
<a href="#sS925" class="mg-sv-hero-pill"><span class="mg-sv-hp-label">925 Sterling</span><span class="mg-sv-hp-price" id="hp925">...</span><span class="mg-sv-hp-unit">per KG</span></a>
<a href="#sS900" class="mg-sv-hero-pill"><span class="mg-sv-hp-label">900 Coin</span><span class="mg-sv-hp-price" id="hp900">...</span><span class="mg-sv-hp-unit">per KG</span></a></div></div>
<div class="mg-container"><div class="mg-sv-header-bar"><div><div class="mg-sv-header-title"><span class="mg-sv-live-dot"></span>Silver Rate Today <span id="sHC"></span></div><div class="mg-sv-header-date" id="sHD"></div></div><div><span class="mg-sv-source-badge" id="sSB"><span class="mg-sv-sdot"></span> Loading</span></div></div></div>
<div class="mg-container">
${bPS('999','999 Fine Silver (99.9%)','p999')}${bPS('925','925 Sterling Silver (92.5%)','p925')}${bPS('900','900 Coin Silver (90%)','p900')}
<div class="mg-section mg-animate-in" style="margin-top:8px"><div class="mg-section-header"><div class="mg-section-icon">&#128161;</div><div><div class="mg-section-title">Insights</div><div class="mg-section-subtitle">Market intelligence at a glance</div></div></div><div class="mg-section-body"><div class="mg-sv-ig" id="sIns"></div></div></div>
<div class="mg-row-2 mg-animate-in"><div class="mg-section"><div class="mg-section-header"><div class="mg-section-icon">&#128209;</div><div><div class="mg-section-title">Price Breakdown</div><div class="mg-section-subtitle">999 Fine per KG calculation</div></div></div><div class="mg-section-body" id="sBD"></div></div>
<div class="mg-section"><div class="mg-section-header"><div class="mg-section-icon">&#127760;</div><div><div class="mg-section-title">Market Data</div><div class="mg-section-subtitle">International rates & premiums</div></div></div><div class="mg-section-body" id="sMD"></div></div></div>
<div class="mg-section mg-animate-in"><div class="mg-section-header"><div class="mg-section-icon">&#128176;</div><div><div class="mg-section-title">Silver Investment Calculator</div><div class="mg-section-subtitle">Calculate total cost including making charges & GST</div></div></div><div class="mg-section-body">
<div class="mg-row-2"><div class="mg-subcard"><label class="mg-input-label">Silver Purity</label><select class="mg-input-text" id="sIP" onchange="window._sPF()"><option value="999">999 Fine Silver (Bullion)</option><option value="925" selected>925 Sterling Silver (Jewellery)</option><option value="900">900 Coin Silver</option></select></div><div class="mg-subcard"><label class="mg-input-label">Current Rate / gram (auto)</label><div class="mg-input-field"><input class="mg-input" id="sIR" readonly style="opacity:.65;cursor:default"></div></div></div>
<div class="mg-row-2"><div class="mg-subcard"><label class="mg-input-label">Weight (grams)</label><div class="mg-input-field"><input type="number" class="mg-input" id="sIW" placeholder="e.g. 100" value="100"></div></div><div class="mg-subcard"><label class="mg-input-label">Making Charges %</label><select class="mg-input-text" id="sIM"><option value="0">0% (Silver Bars / Bullion)</option><option value="5" selected>5% (Silver Coins)</option><option value="10">10% (Plain Jewellery)</option><option value="15">15% (Designer Jewellery)</option><option value="25">25% (Intricate / Filigree Work)</option></select></div></div>
<div style="text-align:center;padding-top:8px"><button class="mg-btn-primary" onclick="window._sCI()">Calculate Total Cost</button></div>
<div class="mg-sv-ir" id="sIRes"><div class="mg-sv-irr"><span class="mg-sv-irl">Silver Value</span><span class="mg-sv-irv" id="irS"></span></div><div class="mg-sv-irr"><span class="mg-sv-irl">Making Charges</span><span class="mg-sv-irv" id="irM"></span></div><div class="mg-sv-irr"><span class="mg-sv-irl">Sub Total</span><span class="mg-sv-irv" id="irSb"></span></div><div class="mg-sv-irr"><span class="mg-sv-irl">GST (3% on Silver + Making)</span><span class="mg-sv-irv" id="irG"></span></div><div class="mg-sv-irt mg-sv-irr"><span class="mg-sv-irl">Grand Total</span><span class="mg-sv-irv" id="irT"></span></div></div></div></div>
</div>
<div class="mg-sv-sb" id="sSBn" style="display:none"></div>
<div class="mg-footer"><strong>Silver Price Tracker</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with &#10084;&#65039; by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India<br><br><div style="max-width:700px;margin:0 auto;line-height:1.7"><strong>Disclaimer:</strong> This calculator is for educational and informational purposes only. It does not constitute financial advice. Silver prices shown are indicative landed rates based on international market data (XAG/USD) converted to INR with import duties (BCD 5% + AIDC 1%) and GST (3%). Actual prices at local dealers may vary due to making charges, wastage, and local market conditions. Past price trends do not guarantee future performance. Please verify rates with your dealer before making any purchase or investment decisions.</div><br>BCD: 5% | AIDC: 1% | GST on Silver: 3% | GST on Making: 5% | All rates subject to govt revision.</div>`}

function bPS(p,label,tc){return`<div class="mg-sv-ks mg-animate-in" id="sS${p}" style="scroll-margin-top:20px"><div class="mg-sv-kh"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="mg-sv-kt ${tc}">${label}</span><span class="mg-sv-kc" id="sC${p}">...</span></div><div class="mg-sv-kp"><span class="mg-sv-kp-cur">&#8377;</span><span id="sL${p}">...</span><span class="mg-sv-kp-unit">/ KG</span></div></div><div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Date</th><th>10 Grams</th><th>100 Grams</th><th>1 KG</th><th>Change (1 KG)</th></tr></thead><tbody id="sT${p}"></tbody></table></div><div class="mg-sv-cw"><div class="mg-sv-ct"><div class="mg-pill-row" data-purity="${p}"><button class="mg-pill active" data-days="14">14D</button><button class="mg-pill" data-days="30">30D</button><button class="mg-pill" data-days="90">90D</button></div><div class="mg-sv-cwm">${p} Silver Price Tracker by MasterGadgets.com</div></div><div class="mg-sv-cc"><canvas id="sChart${p}"></canvas></div></div></div>`}

function setupTT(){const sw=document.getElementById('sTT');if(!sw)return;sw.addEventListener('click',()=>{const dk=root.classList.contains('mg-dark');root.classList.toggle('mg-dark',!dk);root.classList.toggle('mg-light',dk);localStorage.setItem('mg_silver_theme',dk?'light':'dark');const dot=sw.querySelector('.mg-theme-dot');if(dot)dot.innerHTML=dk?'&#9789;':'&#9788;';Object.keys(S.charts).forEach(k=>{if(S.charts[k])rC(k)})});const dot=sw.querySelector('.mg-theme-dot');if(dot)dot.innerHTML=savedTheme==='dark'?'&#9788;':'&#9789;'}
function updateHD(){const el=document.getElementById('sHD');if(!el)return;const now=new Date();el.textContent=now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
async function detectCity(){try{const d=await fJSON('https://ipapi.co/json/',CTO);const c=d&&d.city;if(c){S.city=c;const cn=document.getElementById('sCN');const hc=document.getElementById('sHC');if(cn)cn.textContent=c;if(hc)hc.textContent=c;return}}catch(e){}const hc=document.getElementById('sHC');if(hc)hc.textContent='';const cn=document.getElementById('sCN');if(cn&&!S.city)cn.textContent='India'}

function cLS(base){return +((base*(1+BCD+AIDC)*(1+GST)).toFixed(3))}
function nHE(item){const x=Number(item.xagusd),u=Number(item.usdinr);const ok=iFR(x)&&iFR(u);const base=ok?(x/TROY)*u:0;const s999=ok?cLS(base):Number(item.silver999);if(isNaN(s999))return null;return{date:item.date,silver999:s999,silver925:ok?+(s999*PF[925]).toFixed(3):Number(item.silver925)||+(s999*PF[925]).toFixed(3),silver900:ok?+(s999*PF[900]).toFixed(3):Number(item.silver900)||+(s999*PF[900]).toFixed(3),xagusd:ok?x:FX,usdinr:ok?u:FI}}
function seedH(){S.isSeeded=true}

function shouldF(){try{const t=localStorage.getItem(CKEY);return!t||(Date.now()-parseInt(t,10))/6e4>=CM}catch(e){return true}}
async function fetchR(){S.n++;const fl=S.n===1;const today=gTI();const last=S.history.length?S.history[S.history.length-1]:null;
if(!shouldF()&&!fl&&last&&last.date===today){S.xagusd=last.xagusd;S.usdinr=last.usdinr;S.src='Cached';calc();updateUI();uBn();setTimeout(fetchR,CM*6e4);return}
let gX=false,gI=false;const ic=[],xc=[];
const res=await Promise.allSettled([fj('https://api.exchangerate-api.com/v4/latest/USD'),fj('https://open.er-api.com/v6/latest/USD'),fj('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')]);
for(let i=0;i<3;i++){if(res[i].status!=='fulfilled'||!res[i].value)continue;const d=res[i].value;if(i<2&&iFR(d.rates?.INR))ic.push(Number(d.rates.INR));else if(i===2&&iFR(d.usd?.inr))ic.push(Number(d.usd.inr))}
try{const sa=await fJSON('https://api.gold-api.com/price/XAG',1200);if(sa&&iFR(sa.price)){xc.push(Number(sa.price));S.xagUpdatedAt=sa.updatedAt||''}}catch(e){}
try{const d2=await fJSON('https://api.metals.live/v1/spot/silver',1200);if(d2&&d2.length){const lv=Number(d2[0].price||d2[0].silver||d2[0].xag);if(iFR(lv))xc.push(lv)}}catch(e){}
try{const sd=await fJSON('https://data-asg.goldprice.org/dbXRates/USD',1200);if(sd?.items?.length&&iFR(sd.items[0].xagPrice))xc.push(Number(sd.items[0].xagPrice))}catch(e){}
const px=last?.xagusd||FX,pi=last?.usdinr||FI;
const sx=cSR(xc,px,2.5),si=cSR(ic,pi,0.75);
if(iFR(sx)){S.xagusd=sx;gX=true}
if(iFR(si)){S.usdinr=si;gI=true}
if(!gX){const l=S.history.at(-1);S.xagusd=l?l.xagusd:FX}
if(!gI){const l=S.history.at(-1);S.usdinr=l?l.usdinr:FI}
if(!(S.xagusd>10&&S.xagusd<500)){S.xagusd=FX;S.xagUpdatedAt='';gX=false}
if(S.usdinr<70||S.usdinr>120){S.usdinr=FI;gI=false}
if(gX&&gI)S.src='Live';else if(gX||gI)S.src='Partial';else S.src='Cached';
if(gX){try{localStorage.setItem(CKEY,Date.now()+'')}catch(e){}}
calc();storeH();updateUI();if(S.src==='Live'||S.src==='Partial')mSB();uBn();setTimeout(fetchR,CM*6e4)}

async function fj(u){return fJSON(u,RTO)}
async function fJSON(u,t){const c=new AbortController();const tm=setTimeout(()=>c.abort(),t||RTO);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});clearTimeout(tm);return r.ok?await r.json():null}catch(e){clearTimeout(tm);return null}}
function uBn(){const b=document.getElementById('sSBn');if(!b)return;if(S.src==='Live'||S.src==='Partial'){b.style.display='none';return}b.style.display='block';b.textContent='Latest data, updated a few hours ago.'}

function calc(){S.base=(S.xagusd/TROY)*S.usdinr;S.duty=S.base*(BCD+AIDC);S.landed999=cLS(S.base);S.s999=S.landed999;S.s925=+(S.s999*PF[925]).toFixed(3);S.s900=+(S.s999*PF[900]).toFixed(3);S.updated=new Date();pFP()}
function updateUI(){updateHD();uSB();uH();['999','925','900'].forEach(p=>uP(p));uBD();uMD();uIns();['999','925','900'].forEach(p=>rC(p))}
function uSB(){const b=document.getElementById('sSB');if(!b)return;const live=S.src==='Live'||S.src==='Partial';b.className='mg-sv-source-badge '+(live?'live':'cached');b.innerHTML='<span class="mg-sv-sdot"></span> '+(live?'Live':'Cached')}
function uH(){const e=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};e('hp999','\u20B9'+fI(S.s999*1000));e('hp925','\u20B9'+fI(S.s925*1000));e('hp900','\u20B9'+fI(S.s900*1000))}

function uP(p){const price={999:S.s999,925:S.s925,900:S.s900}[p],key='silver'+p;
const lp=document.getElementById('sL'+p);if(lp)lp.textContent=fI(price*1000);
const hist=S.history.slice().reverse().slice(0,15);const today=gTI();
const tb=document.getElementById('sT'+p);
if(tb){tb.innerHTML=hist.map((e,i)=>{const prev=i<hist.length-1?hist[i+1]:null;const chg=prev?(e[key]-prev[key])*1000:0;const isT=e.date===today;const color=chg>0?'var(--mg-green)':chg<0?'var(--mg-red)':'var(--mu)';const sign=chg>0?'+':chg<0?'-':'';return'<tr class="'+(isT?'mg-sv-tr':'')+'"><td>'+(isT?'Today':fD(e.date))+'</td><td>\u20B9'+fI(e[key]*10)+'</td><td>\u20B9'+fI(e[key]*100)+'</td><td>\u20B9'+fI(e[key]*1000)+'</td><td style="color:'+color+'">'+(chg===0?'-':sign+'\u20B9'+fI(Math.abs(chg)))+'</td></tr>'}).join('')}
const ch=document.getElementById('sC'+p);
if(ch&&S.history.length>=2){const pv=S.history[S.history.length-2][key];const dG=price-pv;const dK=dG*1000;const pc=pv>0?((dG/pv)*100).toFixed(2):'0';const sign=dG>0?'+':dG<0?'-':'';ch.className='mg-sv-kc '+(dG>0?'up':dG<0?'down':'flat');ch.innerHTML=(dG>0?'&#9650; ':dG<0?'&#9660; ':'')+((dG===0)?'No change':sign+'\u20B9'+fI(Math.abs(dK))+'/KG ('+sign+Math.abs(pc)+'%)')}}

function uBD(){const el=document.getElementById('sBD');if(!el)return;const bK=Math.round(S.base*1000);const aK=Math.round((S.base+S.duty)*1000);const lK=Math.round(S.landed999*1000);el.innerHTML=[{l:'Spot price / KG',v:'\u20B9'+fI(bK)},{l:'+ Import duty (BCD 5% + AIDC 1%)',v:'\u20B9'+fI(aK)},{l:'+ GST 3% = Final landed price',v:'\u20B9'+fI(lK),f:true}].map(s=>'<div class="mg-sv-br'+(s.f?' final':'')+'"><span class="mg-sv-bl">'+s.l+'</span><span class="mg-sv-bv">'+s.v+'</span></div>').join('')}
function uMD(){const el=document.getElementById('sMD');if(!el)return;const sK=Math.round(S.base*1000);const lK=Math.round(S.landed999*1000);const df=lK-sK;const pc=sK>0?((df/sK)*100).toFixed(1):'0';const xl=S.xagUpdatedAt?'XAG / USD (live)':'XAG / USD';el.innerHTML=[{l:xl,v:'$'+S.xagusd.toFixed(3)+' / oz'},{l:'USD / INR',v:'\u20B9'+S.usdinr.toFixed(3)},{l:'Spot Price / KG',v:'\u20B9'+fI(sK)},{l:'Duty & Tax Premium / KG',v:'+\u20B9'+fI(df)+' (+'+pc+'%)'}].map(m=>'<div class="mg-sv-mr"><span class="mg-sv-ml">'+m.l+'</span><span class="mg-sv-mv">'+m.v+'</span></div>').join('')}

function uIns(){const el=document.getElementById('sIns');if(!el)return;const h=S.history,ins=[];
if(h.length>=7){const w=h[h.length-7].silver999,p=w>0?(((S.s999-w)/w)*100).toFixed(1):'0';ins.push({i:p>0?'&#128200;':'&#128201;',t:'Silver is '+(p>0?'up':'down')+' '+Math.abs(p)+'% in the last 7 days'})}
if(h.length>=20){const m=h[0].silver999,p=m>0?(((S.s999-m)/m)*100).toFixed(1):'0';ins.push({i:p>0?'&#128640;':'&#128203;',t:Math.abs(p)+'% '+(p>0?'gain':'decline')+' over the last '+h.length+' days'})}
if(h.length>=2){const ps=h.map(x=>x.silver999),mx=Math.max(...ps);ins.push({i:'&#128293;',t:'Highest: \u20B9'+fI(mx*1000)+'/KG on '+fD(h[ps.indexOf(mx)].date)})}
if(h.length>=2){const ps=h.map(x=>x.silver999),mn=Math.min(...ps);ins.push({i:'&#10052;',t:'Lowest: \u20B9'+fI(mn*1000)+'/KG on '+fD(h[ps.indexOf(mn)].date)})}
if(h.length>=5){let tm=0;for(let i=1;i<h.length;i++)tm+=Math.abs(h[i].silver999-h[i-1].silver999);ins.push({i:'&#9878;',t:'Avg. daily swing: \u20B9'+fI((tm/(h.length-1))*1000)+' per KG'})}
if(h.length>=5){const oi=h[0].usdinr,c=oi>0?(((S.usdinr-oi)/oi)*100).toFixed(1):'0';ins.push({i:'&#128177;',t:'Rupee '+(c>0?'weakened':'strengthened')+' '+Math.abs(c)+'% in '+h.length+' days, '+(c>0?'pushing':'easing')+' silver prices'})}
if(!ins.length)ins.push({i:'&#128161;',t:'Price history building. Check back tomorrow.'});
el.innerHTML=ins.map(i=>'<div class="mg-sv-ii"><span class="mg-sv-iic">'+i.i+'</span><span>'+i.t+'</span></div>').join('')}

function setupCB(){root.querySelectorAll('.mg-pill-row[data-purity]').forEach(cp=>{const p=cp.dataset.purity;cp.addEventListener('click',e=>{const b=e.target.closest('.mg-pill');if(!b||!b.dataset.days)return;S.cd[p]=parseInt(b.dataset.days);cp.querySelectorAll('.mg-pill').forEach(x=>x.classList.remove('active'));b.classList.add('active');rC(p)})})}
function rC(p){if(typeof Chart==='undefined'){setTimeout(()=>rC(p),500);return}const hist=S.history.slice(-(S.cd[p]||7));if(!hist.length)return;const key='silver'+p;const labels=hist.map(h=>fD(h.date));const data=hist.map(h=>h[key]*1000);const dk=root.classList.contains('mg-dark');const col={999:'#D4853B',925:'#2b6cb0',900:'#2d8a4e'}[p];if(S.charts[p])S.charts[p].destroy();const ctx=document.getElementById('sChart'+p);if(!ctx)return;const c2d=ctx.getContext('2d');const gd=c2d.createLinearGradient(0,0,0,220);gd.addColorStop(0,col+'30');gd.addColorStop(1,col+'00');
S.charts[p]=new Chart(c2d,{type:'line',data:{labels,datasets:[{label:p+' Silver /KG',data,borderColor:col,backgroundColor:gd,borderWidth:2.5,pointBackgroundColor:col,pointBorderColor:dk?'#161616':'#FFF',pointBorderWidth:2,pointRadius:3,pointHoverRadius:6,fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:dk?'#222':'#fff',titleColor:dk?'#f0ece8':'#1a1a1a',bodyColor:dk?'#a09890':'#706a62',borderColor:dk?'#2c2c2c':'#d1ccc4',borderWidth:1,padding:12,displayColors:false,titleFont:{family:"'DM Sans'",weight:'600'},bodyFont:{family:"'JetBrains Mono'",size:13},callbacks:{label:c=>'\u20B9'+c.parsed.y.toLocaleString('en-IN')+' / KG'}}},scales:{x:{grid:{color:dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'},ticks:{color:dk?'#706860':'#9b9590',font:{family:"'DM Sans'",size:10},maxRotation:45}},y:{grid:{color:dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'},ticks:{color:dk?'#706860':'#9b9590',font:{family:"'JetBrains Mono'",size:10},callback:v=>'\u20B9'+(v/1000).toFixed(0)+'K'}}}}})}

function gSS(){return[gTI(),S.s999,S.s925,S.s900,S.xagusd.toFixed(2),S.usdinr.toFixed(2),S.src].join('|')}
function sSB2(){try{const now=Date.now();const la=parseInt(localStorage.getItem('silver_last_backend_save_at')||'0',10);const ls=localStorage.getItem('silver_last_backend_save_sig')||'';if(gSS()!==ls)return true;return!la||(now-la)/6e4>=BSM}catch(e){return true}}
function mBS(){try{localStorage.setItem('silver_last_backend_save_at',String(Date.now()));localStorage.setItem('silver_last_backend_save_sig',gSS())}catch(e){}}
function mSB(){if(!sSB2())return;sB()}
function sB(){fetch('/tools/save-data.php?key=MG_SECURE_2026',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'silver',data:{date:gTI(),silver999:S.s999,silver925:S.s925,silver900:S.s900,xagusd:S.xagusd,usdinr:S.usdinr,source:S.src}})}).then(async res=>{const text=await res.text();if(!res.ok||!/saved successfully/i.test(text))throw new Error(text);mBS()}).catch(()=>{})}
async function loadDBH(){try{const res=await fetch('/tools/get-data.php?tool=silver&limit=90');const data=await res.json();if(!data||!data.length){loadH();return}S.history=data.map(nHE).filter(item=>item!==null);S.isSeeded=false;const today=gTI();if(!S.history.some(h=>h.date===today)&&S.s999>0)storeH()}catch(err){loadH()}}
function loadH(){try{let r=localStorage.getItem(HKEY);S.history=(r?JSON.parse(r):[]).map(nHE).filter(Boolean);S.history=S.history.filter(h=>h.silver999>=50&&h.silver999<=1000)}catch(e){S.history=[]}}
function storeH(){const today=gTI();const ei=S.history.findIndex(h=>h.date===today);const entry={date:today,xagusd:+S.xagusd.toFixed(3),usdinr:+S.usdinr.toFixed(3),silver999:+S.s999.toFixed(3),silver925:+S.s925.toFixed(3),silver900:+S.s900.toFixed(3)};if(ei>=0)S.history[ei]=entry;else S.history.push(entry);S.history.sort((a,b)=>a.date.localeCompare(b.date));while(S.history.length>MH)S.history.shift();try{localStorage.setItem(HKEY,JSON.stringify(S.history))}catch(e){}}

function pFP(){const sel=document.getElementById('sIP');if(!sel)return;const p=sel.value;const price={999:S.s999,925:S.s925,900:S.s900}[p]||S.s925;const inp=document.getElementById('sIR');if(inp)inp.value=price>0?'\u20B9'+fD3(price)+' / gram':'...'}
window._sPF=pFP;
window._sCI=function(){const sel=document.getElementById('sIP');const p=sel?sel.value:'925';const rate={999:S.s999,925:S.s925,900:S.s900}[p]||S.s925;const wt=parseFloat((document.getElementById('sIW')||{}).value)||0;const mkSel=document.getElementById('sIM');const mkPct=parseFloat(mkSel?mkSel.value:'5')||0;if(wt<=0||rate<=0)return;const sv=rate*wt;const mk=sv*(mkPct/100);const sub=sv+mk;const gst=sub*0.03;const grand=sub+gst;const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};s('irS','\u20B9'+fI(sv));s('irM','\u20B9'+fI(mk));s('irSb','\u20B9'+fI(sub));s('irG','\u20B9'+fI(gst));s('irT','\u20B9'+fI(grand));const res=document.getElementById('sIRes');if(res)res.classList.add('visible')};

function fI(n){return Math.round(Number(n)||0).toLocaleString('en-IN')}
function fD3(n){return Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:3,maximumFractionDigits:3})}
function fD(d){return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
function gTI(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})}
function iFR(v){const n=Number(v);return Number.isFinite(n)&&n>0}
function median(v){const s=v.slice().sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function cSR(values,last,maxDeltaPct){const clean=values.map(v=>Number(v)).filter(v=>Number.isFinite(v));if(!clean.length)return 0;if(!Number.isFinite(last)||last<=0)return median(clean);const preferred=clean.filter(v=>Math.abs((v-last)/last)*100<=maxDeltaPct);return median(preferred.length?preferred:clean)}
})();
