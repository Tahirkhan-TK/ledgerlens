(function(g){'use strict';
const CATS=['Travel','IT & Software','Entertainment','Meals','Office Supplies','Utilities','Professional Fees','Training'];
const DEFAULT_CAPS={'Travel':150000,'IT & Software':400000,'Entertainment':25000,'Meals':8000,'Office Supplies':60000,'Utilities':120000,'Professional Fees':500000,'Training':100000};
const LEX={'Travel':'flight airfare air ticket hotel accommodation stay taxi airport transfer nights booking',
'IT & Software':'cloud hosting software licence license subscription server vpn security laptop monitor maintenance accessories',
'Entertainment':'dinner client hosting celebration event catering appreciation customer hospitality delegation',
'Meals':'lunch meals tea snacks overtime dinner working',
'Office Supplies':'paper toner stationery files furniture chair printer',
'Utilities':'electricity bill internet telephone broadband',
'Professional Fees':'audit legal advisory retainer tax consultancy fee',
'Training':'training workshop course certification compliance excel'};
Object.keys(LEX).forEach(k=>LEX[k]=new Set(LEX[k].split(' ')));
const tok=s=>(String(s).toLowerCase().match(/[a-z]+/g)||[]);
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
else if(c=='"')q=true;else if(c==','){r.push(f);f=''}
else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);f='';if(r.length>1||r[0]!=='')R.push(r);r=[]}else f+=c}
if(f!==''||r.length){r.push(f);R.push(r)}
const h=R.shift().map(s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_'));
return R.map(x=>{const o={};h.forEach((k,i)=>o[k]=(x[i]||'').trim());return o})}
function normalize(rows){return rows.map((o,i)=>({id:o.invoice_id||o.id||'ROW-'+(i+1),date:o.date,employee:o.employee||'',vendor:o.vendor||'Unknown',
vendor_id:o.vendor_id||o.vendor||'NA',description:o.description||'',amount:parseFloat(String(o.amount_pkr||o.amount||'0').replace(/,/g,''))||0,
claimed:o.claimed_category||o.category||'',truth:o.true_category||null,
label:o.is_anomaly===undefined||o.is_anomaly===''?null:Number(o.is_anomaly),type:o.anomaly_type||''})).filter(r=>r.amount>0)}
function classify(desc,prior){const t=tok(desc),sc={};
CATS.forEach(c=>{let s=0;t.forEach(w=>{if(LEX[c].has(w))s++});sc[c]=s+1.5*((prior&&prior[c])||0)});
const e=Object.entries(sc).sort((a,b)=>b[1]-a[1]);
return e[0][1]>0?{cat:e[0][0],conf:(e[0][1]-e[1][1])/(e[0][1]+.5)}:{cat:null,conf:0}}
function analyze(rows,caps,thr){caps=caps||DEFAULT_CAPS;thr=thr==null?.5:thr;
const pr={},am={};
rows.forEach(r=>{const p=pr[r.vendor_id]=pr[r.vendor_id]||{_n:0};p[r.claimed]=(p[r.claimed]||0)+1;p._n++;(am[r.vendor_id]=am[r.vendor_id]||[]).push(r.amount)});
Object.values(pr).forEach(p=>Object.keys(p).forEach(k=>{if(k!=='_n')p[k]/=p._n}));
const st={};Object.keys(am).forEach(k=>{const m=med(am[k]);st[k]={m,mad:Math.max(med(am[k].map(x=>Math.abs(x-m))),m*.1),n:am[k].length}});
const items=rows.map(r=>{const c=classify(r.description,pr[r.vendor_id]);return{...r,pred:c.cat||r.claimed,conf:c.conf,flags:[],ms:Date.parse(r.date)||0}});
const seen={};
[...items].sort((a,b)=>a.ms-b.ms).forEach(it=>{const k=it.vendor_id+'|'+it.amount;
const prev=(seen[k]||[]).find(p=>Math.abs(it.ms-p.ms)<=7*864e5);
if(prev)it.flags.push({t:'dup',w:.92,msg:`Same vendor and amount as ${prev.id} (${Math.round(Math.abs(it.ms-prev.ms)/864e5)} day(s) apart): possible duplicate payment.`,ref:prev.id});
(seen[k]=seen[k]||[]).push(it)});
items.forEach(it=>{const cap=caps[it.pred];
if(cap&&it.amount>cap){const x=it.amount/cap,hid=it.claimed!==it.pred&&caps[it.claimed]>=it.amount;
it.flags.push({t:'limit',w:Math.min(.95,.6+(x-1)*.5),msg:`${fmt(it.amount)} exceeds the ${it.pred} cap of ${fmt(cap)} (${x.toFixed(2)}x).`+(hid?` Filed as ${it.claimed} (cap ${fmt(caps[it.claimed])}), which would have hidden the breach.`:'')})}
if(it.claimed&&it.pred!==it.claimed&&it.conf>=.45)it.flags.push({t:'mismatch',w:.35+.4*it.conf,msg:`Claimed as ${it.claimed}, but the description and vendor history point to ${it.pred} (confidence ${(it.conf*100).toFixed(0)}%).`});
const s=st[it.vendor_id];if(s.n>=4&&it.amount>s.m+4*s.mad&&it.amount/s.m>2.5)it.flags.push({t:'outlier',w:Math.min(.8,.4+.1*(it.amount/s.m-2.5)),msg:`${(it.amount/s.m).toFixed(1)}x this vendor's typical invoice of ${fmt(s.m)}.`});
it.score=1-it.flags.reduce((a,f)=>a*(1-f.w),1);it.flagged=it.score>=thr;
const d=it.flags.find(f=>f.t==='dup'),l=it.flags.find(f=>f.t==='limit'),o=it.flags.find(f=>f.t==='outlier');
it.exposure=it.flagged?Math.max(d?it.amount:0,l?it.amount-cap:0,o?it.amount-st[it.vendor_id].m:0):0});
return items}
const fmt=n=>'PKR '+Math.round(n).toLocaleString('en-US');
function evaluate(items){if(items.some(i=>i.label===null))return null;
const tp=items.filter(i=>i.flagged&&i.label).length,fp=items.filter(i=>i.flagged&&!i.label).length,fn=items.filter(i=>!i.flagged&&i.label).length;
const P=tp/(tp+fp||1),R=tp/(tp+fn||1),rate=(a,f)=>a.length?a.filter(f).length/a.length:null;
const hi=items.filter(i=>i.flagged&&i.score>=.8),cc=items.filter(i=>i.truth&&i.conf>=.6);
const types={};items.filter(i=>i.label).forEach(i=>{(types[i.type]=types[i.type]||[]).push(i)});
return{tp,fp,fn,P,R,F1:2*P*R/(P+R||1),
catAcc:rate(items.filter(i=>i.truth),i=>i.pred===i.truth),
breach:rate(items.filter(i=>['over_limit','miscategorised'].includes(i.type)),i=>i.flags.some(f=>f.t==='limit')),
dupRecall:rate(items.filter(i=>i.type==='duplicate'),i=>i.flags.some(f=>f.t==='dup')),
hiConfWrong:rate(hi,i=>!i.label),hiConfN:hi.length,catConfWrong:rate(cc,i=>i.pred!==i.truth),catConfN:cc.length,
byType:Object.fromEntries(Object.entries(types).map(([k,v])=>[k,[v.filter(i=>i.flagged).length,v.length]])),
fps:items.filter(i=>i.flagged&&!i.label).slice(0,6),fns:items.filter(i=>!i.flagged&&i.label).slice(0,6)}}
g.Ledger={CATS,DEFAULT_CAPS,parseCSV,normalize,analyze,evaluate,fmt}})(typeof window!=='undefined'?window:globalThis);
