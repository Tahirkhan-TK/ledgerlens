"""Synthetic AP dataset for CFS (fictional). Seeded, with ground-truth labels for evaluation."""
import random, csv, datetime as dt
random.seed(722)
CAPS={'Travel':150000,'IT & Software':400000,'Entertainment':25000,'Meals':8000,'Office Supplies':60000,'Utilities':120000,'Professional Fees':500000,'Training':100000}
V={'Skyline Air':('V001','Travel',['Flight Karachi-Lahore business class','Airfare Islamabad return ticket','Flight ticket Dubai trip'],30000,60000),
'PearlStay Hotels':('V002','Travel',['Hotel accommodation 3 nights','Conference stay Islamabad','Taxi and airport transfer'],25000,110000),
'Datalink Systems':('V003','IT & Software',['Cloud hosting subscription','Software licence renewal','Laptop accessories and monitor'],40000,300000),
'Nexa Cloud':('V004','IT & Software',['Server maintenance contract','VPN and security licence','Software subscription annual'],35000,250000),
'Saffron Table Catering':('V005','Entertainment',['Client dinner hosting','Team celebration event catering','Customer appreciation lunch'],9000,22000),
'Lahore Staples':('V006','Office Supplies',['Printer paper and toner','Stationery and files','Office furniture chair'],4000,45000),
'Metro Power Co':('V007','Utilities',['Electricity bill head office','Electricity bill branch'],60000,110000),
'BlueWave Telecom':('V008','Utilities',['Internet and telephone bill','Broadband bill head office'],20000,45000),
'Rizvi & Partners':('V009','Professional Fees',['Audit fee quarterly','Legal advisory retainer','Tax consultancy fee'],120000,420000),
'SkillBridge Academy':('V010','Training',['Staff training workshop fee','Excel and Power BI course','Compliance certification training'],20000,85000),
'Tikka Lane Cafe':('V011','Meals',['Staff lunch overtime','Working dinner meals','Tea and snacks for meeting'],1500,7000)}
AMB=[('PearlStay Hotels','Conference lunch and hall booking'),('Datalink Systems','Training licence for software course'),('SkillBridge Academy','Laptop rental for workshop'),('Saffron Table Catering','Staff meals during audit week'),('Nexa Cloud','Security awareness training subscription'),('Tikka Lane Cafe','Client tea and snacks hosting')]
EMP=[f"EMP-{i:02d}" for i in range(1,13)]; S=dt.date(2026,7,1); rows=[]
def mk(v,d,a,cl,tr,an=0,ty=''):
    rows.append(dict(date=S+dt.timedelta(days=random.randint(0,91)),employee=random.choice(EMP),vendor=v,vendor_id=V[v][0],description=d,amount_pkr=int(round(a,-1)),claimed_category=cl,true_category=tr,is_anomaly=an,anomaly_type=ty))
for _ in range(140):
    v=random.choice(list(V)); _,c,d,lo,hi=V[v]; mk(v,random.choice(d),random.uniform(lo,hi),c,c)
for v,d in AMB: _,c,_,lo,hi=V[v]; mk(v,d,random.uniform(lo,hi),c,c)
for r in random.sample(rows[:140],9):
    c=dict(r); c['date']=r['date']+dt.timedelta(days=random.randint(1,5)); c['employee']=random.choice(EMP); c['is_anomaly']=1; c['anomaly_type']='duplicate'; rows.append(c)
for v in random.choices(['Saffron Table Catering','Tikka Lane Cafe','Lahore Staples','SkillBridge Academy','Skyline Air','PearlStay Hotels'],k=9):
    _,c,d,_,_=V[v]; mk(v,random.choice(d),CAPS[c]*random.uniform(1.15,1.9),c,c,1,'over_limit')
for v,lo,hi in [('BlueWave Telecom',95000,120000)]*3+[('Skyline Air',120000,145000)]*3:
    _,c,d,_,_=V[v]; mk(v,random.choice(d),random.uniform(lo,hi),c,c,1,'outlier')
for _ in range(8): mk('Saffron Table Catering',random.choice(V['Saffron Table Catering'][2]+['Hospitality dinner for client delegation']),random.uniform(27000,55000),'Office Supplies','Entertainment',1,'miscategorised')
rows.sort(key=lambda r:r['date'])
for i,r in enumerate(rows): r['invoice_id']=f"INV-{3001+i}"; r['date']=r['date'].isoformat()
cols=['invoice_id','date','employee','vendor','vendor_id','description','amount_pkr','claimed_category','true_category','is_anomaly','anomaly_type']
with open('sample_invoices.csv','w',newline='') as f: w=csv.DictWriter(f,cols); w.writeheader(); w.writerows(rows)
print(len(rows),'rows,',sum(r['is_anomaly'] for r in rows),'anomalies')
