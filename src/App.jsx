import { useState, useEffect, useRef, useCallback } from "react";

const VERCEL_URL = "https://coffee-cart-pos.vercel.app";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDP8DZ6zvYUJWDb2jE6S1AExHia4xxBElM",
  authDomain: "coffee-cart-pos.firebaseapp.com",
  projectId: "coffee-cart-pos",
  storageBucket: "coffee-cart-pos.firebasestorage.app",
  messagingSenderId: "492386331460",
  appId: "1:492386331460:web:4b212b914ff6faaaa24511"
};

const DEF_CATS = [
  { id:"Coffee", label:"Coffee", color:"#d97706", bg:"#fff8f0", border:"#f5c98a" },
  { id:"Cold",   label:"Cold",   color:"#16a34a", bg:"#f0fdf4", border:"#86efac" },
  { id:"Other",  label:"Other",  color:"#2563eb", bg:"#f0f9ff", border:"#93c5fd" },
  { id:"Food",   label:"Food",   color:"#7c3aed", bg:"#fdf4ff", border:"#d8b4fe" },
];
const DEF_MENU = [
  { id:"m1",  name:"Espresso",   price:3.5,  emoji:"☕", catId:"Coffee" },
  { id:"m2",  name:"Latte",      price:5.0,  emoji:"🥛", catId:"Coffee" },
  { id:"m3",  name:"Cappuccino", price:5.0,  emoji:"☕", catId:"Coffee" },
  { id:"m4",  name:"Flat White", price:4.5,  emoji:"☕", catId:"Coffee" },
  { id:"m5",  name:"Long Black", price:4.0,  emoji:"☕", catId:"Coffee" },
  { id:"m6",  name:"Mocha",      price:5.5,  emoji:"🍫", catId:"Coffee" },
  { id:"m7",  name:"Chai Latte", price:5.0,  emoji:"🍵", catId:"Other"  },
  { id:"m8",  name:"Hot Choc",   price:5.0,  emoji:"🍫", catId:"Other"  },
  { id:"m9",  name:"Cold Brew",  price:5.5,  emoji:"🧊", catId:"Cold"   },
  { id:"m10", name:"Iced Latte", price:6.0,  emoji:"🧊", catId:"Cold"   },
  { id:"m11", name:"Croissant",  price:4.0,  emoji:"🥐", catId:"Food"   },
  { id:"m12", name:"Muffin",     price:3.5,  emoji:"🧁", catId:"Food"   },
];
const SIZES  = ["Small","Regular","Large"];
const MILKS  = ["Full Cream","Skim","Oat","Almond","Soy"];
const EXTRAS = ["+Shot ($0.50)","Decaf","Extra Hot","Iced"];
const PAY_MS = [
  { id:"square", label:"Square Tap", emoji:"💳" },
  { id:"cash",   label:"Cash",       emoji:"💵" },
  { id:"other",  label:"Other",      emoji:"📱" },
];
const PALETTE = ["#d97706","#16a34a","#2563eb","#7c3aed","#e05252","#0891b2","#be185d","#65a30d","#7c4a1e","#475569"];
const GST = 0.1;
const TABS_POS  = ["Order","Menu","Drawer","Reports","History"];
const TABS_BUMP = ["Queue","History"];

const fmt    = n => "$" + Number(n).toFixed(2);
const toAU   = () => new Date().toLocaleDateString("en-AU");
const toTime = () => new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
const uid    = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const cstyle = (cats, id) => {
  const c = cats.find(x => x.id === id);
  return c ? {color:c.color, bg:c.bg, border:c.border} : {color:"#7c4a1e", bg:"#fafaf9", border:"#d4c5b5"};
};

// ── Mini components ──────────────────────────────────────────────
function Btn({onClick, children, bg="#7c4a1e", ghost, disabled, full}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: full ? "unset" : 1,
        width: full ? "100%" : undefined,
        padding:"11px 14px", borderRadius:9,
        border: ghost ? "1px solid #ede8e3" : "none",
        background: disabled ? "#ddd" : ghost ? "#fff" : bg,
        color: ghost ? "#9c8a7a" : "#fff",
        fontWeight:700, fontSize:13,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily:"inherit"
      }}
    >{children}</button>
  );
}
function Inp({style, ...props}) {
  return (
    <input
      style={{width:"100%", border:"1px solid #ede8e3", borderRadius:8, padding:"8px 11px", fontSize:13, outline:"none", background:"#fff", boxSizing:"border-box", fontFamily:"inherit", ...style}}
      {...props}
    />
  );
}
function Chip({active, onClick, children, color="#7c4a1e", bg="#fdf8f5"}) {
  return (
    <button
      onClick={onClick}
      style={{padding:"6px 12px", borderRadius:8, border: active ? "2px solid "+color : "1px solid #ede8e3", background: active ? bg : "#fff", fontWeight:600, fontSize:12, cursor:"pointer", color: active ? color : "#5a3e2b", fontFamily:"inherit"}}
    >{children}</button>
  );
}
function Card({children, style}) {
  return <div style={{background:"#fff", border:"1px solid #ede8e3", borderRadius:12, padding:12, marginBottom:10, ...style}}>{children}</div>;
}
function Modal({children, onClose}) {
  return (
    <div
      onClick={e => { if(e.target === e.currentTarget) onClose(); }}
      style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200}}
    >
      <div style={{background:"#fff", borderRadius:"18px 18px 0 0", width:"100%", maxWidth:480, padding:20, maxHeight:"90vh", overflowY:"auto"}}>
        {children}
      </div>
    </div>
  );
}
function Timer({sentAt}) {
  const [e, setE] = useState(Math.floor((Date.now()-sentAt)/1000));
  useEffect(() => {
    const iv = setInterval(() => setE(Math.floor((Date.now()-sentAt)/1000)), 1000);
    return () => clearInterval(iv);
  }, [sentAt]);
  const m = Math.floor(e/60), s = e % 60;
  const color = e>180 ? "#ef4444" : e>90 ? "#d97706" : "#16a34a";
  return <span style={{fontSize:18, fontWeight:800, color, fontVariantNumeric:"tabular-nums"}}>{m>0 ? m+"m " : ""}{String(s).padStart(2,"0")}s</span>;
}

// ── Main ─────────────────────────────────────────────────────────
export default function App() {
  const [fb,      setFb]      = useState(null);
  const [ready,   setReady]   = useState(false);
  const [sync,    setSync]    = useState("Connecting...");
  const [cats,    setCats]    = useState(DEF_CATS);
  const [menu,    setMenu]    = useState(DEF_MENU);
  const [history, setHistory] = useState([]);
  const [queue,   setQueue]   = useState([]);
  const [drawer,  setDrawer]  = useState({float:200, transactions:[]});
  const [staffList,setStaffList] = useState(["Alex","Jordan","Sam"]);
  const onumRef = useRef({date:"",n:0});

  const [mode,    setMode]    = useState("pos");
  const [posTab,  setPosTab]  = useState("Order");
  const [bumpTab, setBumpTab] = useState("Queue");
  const [recalled,setRecalled]= useState(null);
  const [paidMsg, setPaidMsg] = useState("");

  // order
  const [order,   setOrder]   = useState([]);
  const [cName,   setCName]   = useState("");
  const [oNote,   setONote]   = useState("");
  const [staff,   setStaff]   = useState("");
  const [payMethod,setPay]    = useState("square");
  const [cashT,   setCashT]   = useState("");
  const [disc,    setDisc]    = useState({type:"pct", value:"", reason:""});
  const [sqPending,setSqPending] = useState(false);
  // modals
  const [itemM,   setItemM]   = useState(null);
  const [iSize,   setISize]   = useState("Regular");
  const [iMilk,   setIMilk]   = useState("Full Cream");
  const [iExtra,  setIExtra]  = useState([]);
  const [chkOpen, setChkOpen] = useState(false);
  const [refundM, setRefundM] = useState(null);
  const [refundAmt,setRefundAmt] = useState("");
  const [refundNote,setRefundNote] = useState("");
  const [catM,    setCatM]    = useState(null);
  const [newCat,  setNewCat]  = useState({label:"", color:PALETTE[0]});
  const [editItem,setEditItem]= useState(null);
  const [drawerM, setDrawerM] = useState(null);
  const [drawerAmt,setDrawerAmt] = useState("");
  const [drawerNote,setDrawerNote] = useState("");
  const [staffM,  setStaffM]  = useState(false);
  const [newStaff,setNewStaff]= useState("");
  const [menuFil, setMenuFil] = useState("All");
  const [bumpSrc, setBumpSrc] = useState("");
  const [repRange,setRepRange]= useState("today");
  const [aiText,  setAiText]  = useState("");
  const [aiLoad,  setAiLoad]  = useState(false);
  const [newItm,  setNewItm]  = useState({name:"",price:"",emoji:"☕",catId:"Coffee"});

  // ── Firebase ────────────────────────────────────────────────────
  useEffect(() => {
    let unsubs = [];
    (async () => {
      try {
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, orderBy }
          = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
        const db  = getFirestore(app);
        setFb({ db, col:collection, doc, setDoc, updateDoc, deleteDoc, batch:writeBatch, getDocs, q:query, ob:orderBy });

        const snap = await getDocs(collection(db,"menu"));
        if(snap.empty) {
          const b = writeBatch(db);
          DEF_MENU.forEach(x => b.set(doc(db,"menu",x.id), x));
          DEF_CATS.forEach(x => b.set(doc(db,"categories",x.id), x));
          b.set(doc(db,"drawer","main"), {float:200,transactions:[]});
          b.set(doc(db,"settings","orderNum"), {date:"",n:0});
          b.set(doc(db,"settings","staffList"), {list:["Alex","Jordan","Sam"]});
          await b.commit();
        }

        unsubs.push(onSnapshot(collection(db,"categories"), s => setCats(s.docs.map(d=>({...d.data(),id:d.id})))));
        unsubs.push(onSnapshot(collection(db,"menu"),       s => setMenu(s.docs.map(d=>({...d.data(),id:d.id})))));
        unsubs.push(onSnapshot(query(collection(db,"queue"),orderBy("sentAt")), s => {
          const q = s.docs.map(d=>({...d.data(),id:d.id}));
          setQueue(prev => { if(q.length > prev.length) beep(); return q; });
        }));
        unsubs.push(onSnapshot(query(collection(db,"history"),orderBy("sentAt","desc")), s => setHistory(s.docs.map(d=>({...d.data(),id:d.id})))));
        unsubs.push(onSnapshot(doc(db,"drawer","main"),     s => { if(s.exists()) setDrawer(s.data()); }));
        unsubs.push(onSnapshot(doc(db,"settings","staffList"), s => { if(s.exists()) setStaffList(s.data().list||[]); }));
        unsubs.push(onSnapshot(doc(db,"settings","orderNum"),  s => { if(s.exists()) onumRef.current = s.data(); }));
        setSync("🟢 Live"); setReady(true);
      } catch(e) { console.error(e); setSync("🔴 Error"); setReady(true); }
    })();
    return () => unsubs.forEach(u => u());
  }, []);

  function beep() {
    try {
      const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value=880; g.gain.setValueAtTime(0.3,c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.4);
      o.start(); o.stop(c.currentTime+0.4);
    } catch(e) {}
  }

  // ── Calcs ───────────────────────────────────────────────────────
  const sub  = order.reduce((s,i) => s+i.price*i.qty, 0);
  const dAmt = disc.value ? (disc.type==="pct" ? sub*(parseFloat(disc.value)/100) : Math.min(parseFloat(disc.value),sub)) : 0;
  const tot  = Math.max(0, sub-dAmt);
  const gst  = tot*GST/(1+GST);
  const chg  = cashT ? Math.max(0, parseFloat(cashT)-tot) : 0;

  // ── DB helpers ──────────────────────────────────────────────────
  async function onum() {
    if(!fb) return 1;
    const today = toAU(), cur = onumRef.current;
    const next = cur.date===today ? cur.n+1 : 1;
    await fb.setDoc(fb.doc(fb.db,"settings","orderNum"), {date:today,n:next});
    onumRef.current = {date:today, n:next};
    return next;
  }

  async function markPaid(sqId) {
    const num = await onum();
    const catIds = [...new Set(order.map(i=>i.catId))];
    const catId  = catIds.length===1 ? catIds[0] : "Mixed";
    const entry  = {num, items:order, subtotal:sub, discAmt:dAmt, total:tot, gst, customer:cName.trim()||"Guest", note:oNote, staff:staff||"—", time:toTime(), date:toAU(), payMethod, catId, refunds:[], sentAt:Date.now(), squareId:sqId||null};
    const id = uid();
    if(fb) {
      await fb.setDoc(fb.doc(fb.db,"queue",id), entry);
      await fb.setDoc(fb.doc(fb.db,"history",id), entry);
      if(payMethod==="cash") {
        const tx = {id:uid(), type:"sale", amount:tot, note:"Cash - "+(cName||"Guest"), time:toTime(), date:toAU()};
        await fb.updateDoc(fb.doc(fb.db,"drawer","main"), {transactions:[tx,...(drawer.transactions||[])]});
      }
    }
    setOrder([]); setCName(""); setONote(""); setDisc({type:"pct",value:"",reason:""});
    setChkOpen(false); setPay("square"); setCashT(""); setSqPending(false);
    setPaidMsg("Order #"+num+" sent to barista!");
    setTimeout(() => setPaidMsg(""), 3000);
  }

  async function bump(id) {
    const t = queue.find(x=>x.id===id);
    if(t) setRecalled(t);
    if(fb) await fb.deleteDoc(fb.doc(fb.db,"queue",id));
  }
  async function recall() {
    if(!recalled||!fb) return;
    await fb.setDoc(fb.doc(fb.db,"queue",recalled.id), {...recalled, sentAt:Date.now()});
    setRecalled(null);
  }
  async function doRefund() {
    const amt = parseFloat(refundAmt)||0;
    if(!amt||!refundM||!fb) return;
    const r = {id:uid(), amount:amt, note:refundNote||"Refund", time:toTime(), date:toAU()};
    await fb.updateDoc(fb.doc(fb.db,"history",refundM.id), {refunds:[...(refundM.refunds||[]),r]});
    if(refundM.payMethod==="cash") {
      const tx = {id:uid(), type:"remove", amount:amt, note:"Refund - "+refundM.customer+" #"+refundM.num, time:toTime(), date:toAU()};
      await fb.updateDoc(fb.doc(fb.db,"drawer","main"), {transactions:[tx,...(drawer.transactions||[])]});
    }
    setRefundM(null); setRefundAmt(""); setRefundNote("");
  }
  async function doDrawer(type) {
    const amt = parseFloat(drawerAmt); if(!amt||!fb) return;
    if(type==="float") { await fb.updateDoc(fb.doc(fb.db,"drawer","main"), {float:amt}); }
    else { const tx={id:uid(),type,amount:amt,note:drawerNote||type,time:toTime(),date:toAU()}; await fb.updateDoc(fb.doc(fb.db,"drawer","main"),{transactions:[tx,...(drawer.transactions||[])]}); }
    setDrawerAmt(""); setDrawerNote(""); setDrawerM(null);
  }
  async function saveCat(cat) {
    if(!fb) return;
    await fb.setDoc(fb.doc(fb.db,"categories",cat.id), {...cat, bg:cat.color+"22", border:cat.color+"88"});
    setCatM(null);
  }
  async function delCat(id) {
    if(menu.some(m=>m.catId===id)) { alert("Remove items from this category first."); return; }
    if(fb) await fb.deleteDoc(fb.doc(fb.db,"categories",id));
  }
  async function saveItem(item) {
    if(!fb) return;
    await fb.setDoc(fb.doc(fb.db,"menu",item.id), item);
    setEditItem(null);
  }
  async function addItem() {
    const {name,price,emoji,catId} = newItm;
    if(!name||!price||!fb) return;
    const id = uid();
    await fb.setDoc(fb.doc(fb.db,"menu",id), {id,name,price:parseFloat(price),emoji:emoji||"☕",catId});
    setNewItm({name:"",price:"",emoji:"☕",catId:"Coffee"});
  }
  async function delItem(id) { if(fb) await fb.deleteDoc(fb.doc(fb.db,"menu",id)); }
  async function saveStaff(list) { if(fb) await fb.setDoc(fb.doc(fb.db,"settings","staffList"),{list}); }

  function addToOrder(item) { setItemM(item); setISize("Regular"); setIMilk("Full Cream"); setIExtra([]); }
  function confirmItem() {
    const ec = iExtra.filter(e=>e.includes("$0.50")).length*0.5;
    const sa = iSize==="Large"?0.5:iSize==="Small"?-0.5:0;
    const fp = itemM.price+ec+sa;
    const extras = iExtra.length ? ", "+iExtra.map(e=>e.split(" ($")[0]).join(", ") : "";
    const lbl = itemM.name+" ("+iSize+", "+iMilk+extras+")";
    setOrder(p => { const ex=p.find(i=>i.label===lbl); if(ex) return p.map(i=>i.label===lbl?{...i,qty:i.qty+1}:i); return [...p,{id:uid(),label:lbl,price:fp,qty:1,emoji:itemM.emoji,catId:itemM.catId}]; });
    setItemM(null);
  }

  function squareCharge() {
    const cents = Math.round(tot*100);
    const isAndroid = /android/i.test(navigator.userAgent);
    const data = {
      amount_money: { amount: cents, currency_code: "AUD" },
      callback_url: VERCEL_URL,
      client_id: SQUARE_APP_ID,
      version: "1.3",
      notes: (cName||"Guest")+" - Coffee Cart"
    };
    const url = isAndroid
      ? "intent://squareup.com/pos/charge?amount_money="+cents+"&currency_code=AUD&notes="+encodeURIComponent((cName||"Guest")+" - Coffee Cart")+"#Intent;scheme=https;package=com.squareup;end"
      : "square-commerce-v1://payment/create?data="+encodeURIComponent(JSON.stringify(data));
    window.open(url, "_blank");
    setSqPending(true);
  }

  // ── Reports ─────────────────────────────────────────────────────
  const filHist = useCallback(() => {
    const now = new Date();
    return history.filter(h => {
      const d = new Date(h.date.split("/").reverse().join("-"));
      if(repRange==="today") return h.date===toAU();
      if(repRange==="week")  return (now-d)/864e5<=7;
      if(repRange==="month") return (now-d)/864e5<=30;
      return true;
    });
  }, [history, repRange]);

  function exportCSV() {
    const fil = filHist();
    const rows = [["#","Date","Time","Customer","Staff","Items","Subtotal","Discount","Total","GST","Refunds","Payment"],
      ...fil.map(h=>[h.num||"",h.date,h.time,h.customer,h.staff||"—",h.items.map(i=>i.qty+"x "+i.label).join("; "),(h.subtotal||h.total).toFixed(2),(h.discAmt||0).toFixed(2),h.total.toFixed(2),(h.gst||0).toFixed(2),(h.refunds||[]).reduce((s,r)=>s+r.amount,0).toFixed(2),h.payMethod])];
    const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = "coffee_"+toAU().replace(/\//g,"-")+".csv";
    a.click();
  }

  async function getAI() {
    setAiLoad(true); setAiText("");
    const sum = history.length===0 ? "No orders." : history.slice(0,30).map(h=>h.date+" "+h.time+" ["+h.payMethod+"] "+h.customer+": "+h.items.map(i=>i.qty+"x "+i.label).join(", ")+" — "+fmt(h.total)).join("\n");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"You are a friendly advisor for a small Australian coffee cart. Give 3-4 short practical insights. Use bullet points.",messages:[{role:"user",content:"Orders:\n"+sum+"\nInsights?"}]})});
      const d = await r.json(); setAiText(d.content?.[0]?.text||"No insights.");
    } catch(e) { setAiText("Could not load insights."); }
    setAiLoad(false);
  }

  const drawerBal = drawer.float
    + (drawer.transactions||[]).filter(t=>t.type==="sale"||t.type==="add").reduce((s,t)=>s+t.amount,0)
    - (drawer.transactions||[]).filter(t=>t.type==="remove").reduce((s,t)=>s+t.amount,0);

  // ── Loading ─────────────────────────────────────────────────────
  if(!ready) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",background:"#fafaf9"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:"3px solid #ede8e3",borderTopColor:"#7c4a1e",borderRadius:"50%",animation:"spin 0.7s linear infinite",marginBottom:12}}/>
      <p style={{color:"#9c8a7a",fontSize:13}}>Connecting to Firebase...</p>
    </div>
  );

  const ModeBar = () => (
    <div style={{display:"flex",gap:8,padding:"9px 12px",background:"#fff",borderBottom:"1px solid #e8e4e0",flexShrink:0}}>
      {[["pos","☕ POS"],["bump","📋 Barista"]].map(([m,l]) => (
        <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"8px 0",borderRadius:9,border:mode===m?"2px solid #7c4a1e":"1px solid #ede8e3",background:mode===m?"#fdf8f5":"#fff",fontWeight:700,fontSize:12,cursor:"pointer",color:mode===m?"#7c4a1e":"#9c8a7a",fontFamily:"inherit"}}>{l}</button>
      ))}
      <span style={{marginLeft:"auto",fontSize:10,color:"#9c8a7a",alignSelf:"center",whiteSpace:"nowrap"}}>{sync}</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // BUMP
  // ════════════════════════════════════════════════════════════════
  if(mode==="bump") {
    const bHist = history.filter(h => {
      const q = bumpSrc.toLowerCase();
      return !q || h.customer.toLowerCase().includes(q) || String(h.num).includes(q) || h.items.some(i=>i.label.toLowerCase().includes(q));
    }).slice(0,50);
    return (
      <div style={{fontFamily:"Inter,sans-serif",background:"#1a1008",minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
        <ModeBar/>
        <div style={{display:"flex",borderBottom:"1px solid #3a2010",flexShrink:0}}>
          {TABS_BUMP.map(t => (
            <button key={t} onClick={()=>setBumpTab(t)} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:bumpTab===t?"2px solid #f5c98a":"2px solid transparent",color:bumpTab===t?"#f5c98a":"#7c4a1e",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {t}{t==="Queue" ? " ("+queue.length+")" : ""}
            </button>
          ))}
          {recalled && <button onClick={recall} style={{margin:6,background:"#7c4a1e",color:"#fff",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Recall #{recalled.num}</button>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:12}}>
          {bumpTab==="Queue" && (
            queue.length===0
              ? <div style={{textAlign:"center",color:"#5a3e2b",marginTop:60}}><div style={{fontSize:36,marginBottom:8}}>✅</div><div style={{fontSize:14,fontWeight:600,color:"#7c6050"}}>All clear!</div></div>
              : queue.map(t => {
                  const c = cstyle(cats,t.catId);
                  return (
                    <div key={t.id} style={{background:c.bg,border:"2px solid "+c.border,borderRadius:13,padding:13,marginBottom:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <span style={{background:c.color,color:"#fff",fontWeight:800,fontSize:13,padding:"2px 9px",borderRadius:9}}>#{t.num}</span>
                          <span style={{fontWeight:700,fontSize:14,color:"#1a1008"}}>{t.customer}</span>
                          {t.staff&&t.staff!=="—"&&<span style={{fontSize:10,color:"#7c6050"}}>· {t.staff}</span>}
                        </div>
                        <div style={{textAlign:"right"}}><Timer sentAt={t.sentAt}/><div style={{fontSize:9,color:"#9c8a7a"}}>{t.time}</div></div>
                      </div>
                      {t.items.map((i,idx) => <div key={idx} style={{fontSize:12,color:"#2c1a0e",marginBottom:2}}><span style={{fontWeight:800,color:c.color}}>{i.qty}x</span> {i.label}</div>)}
                      {t.note && <div style={{fontSize:10,color:"#7c4a1e",marginTop:4,fontStyle:"italic",background:"rgba(255,255,255,0.5)",borderRadius:5,padding:"2px 6px"}}>📝 {t.note}</div>}
                      <button onClick={()=>bump(t.id)} style={{width:"100%",marginTop:11,background:"#2c1a0e",color:"#fff",border:"none",borderRadius:9,padding:13,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✓ BUMP</button>
                    </div>
                  );
                })
          )}
          {bumpTab==="History" && (
            <div>
              <Inp value={bumpSrc} onChange={e=>setBumpSrc(e.target.value)} placeholder="Search name, order #, item..." style={{background:"#2c1a0e",color:"#f5e6d0",border:"none",marginBottom:10}}/>
              {bHist.map(h => {
                const c = cstyle(cats,h.catId);
                return (
                  <div key={h.id} style={{background:"#2c1a0e",border:"1px solid "+c.border,borderRadius:12,padding:12,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:c.color,color:"#fff",fontWeight:800,fontSize:11,padding:"2px 8px",borderRadius:9}}>#{h.num}</span>
                        <span style={{fontWeight:700,fontSize:13,color:"#f5e6d0"}}>{h.customer}</span>
                      </div>
                      <span style={{fontWeight:700,fontSize:13,color:"#f5c98a"}}>{fmt(h.total)}</span>
                    </div>
                    <div style={{fontSize:10,color:"#7c6050",marginBottom:4}}>{h.date} · {h.time} · {h.staff||"—"}</div>
                    {h.items.map((i,idx) => <div key={idx} style={{fontSize:12,color:"#c4a882",marginBottom:1}}>{i.qty}x {i.label}</div>)}
                    {h.note && <div style={{fontSize:10,color:"#a07050",marginTop:3,fontStyle:"italic"}}>"{h.note}"</div>}
                    {(h.refunds||[]).length>0 && <div style={{fontSize:10,color:"#e05252",marginTop:3}}>Refunded: {fmt((h.refunds||[]).reduce((s,r)=>s+r.amount,0))}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // POS
  // ════════════════════════════════════════════════════════════════
  const filtMenu = menuFil==="All" ? menu : menu.filter(i=>i.catId===menuFil);
  const fil      = filHist();
  const rRev     = fil.reduce((s,h)=>s+h.total,0);
  const rGST     = fil.reduce((s,h)=>s+(h.gst||0),0);
  const rDisc    = fil.reduce((s,h)=>s+(h.discAmt||0),0);
  const rRef     = fil.reduce((s,h)=>s+(h.refunds||[]).reduce((r,x)=>r+x.amount,0),0);
  const rAvg     = fil.length ? rRev/fil.length : 0;
  const byPay    = PAY_MS.map(pm=>({...pm,total:fil.filter(h=>h.payMethod===pm.id).reduce((s,h)=>s+h.total,0),count:fil.filter(h=>h.payMethod===pm.id).length})).filter(p=>p.count>0);
  const iCts     = Object.entries(fil.flatMap(h=>h.items).reduce((acc,i)=>{const k=i.label.split(" (")[0];acc[k]=(acc[k]||0)+i.qty;return acc;},{})).sort((a,b)=>b[1]-a[1]);
  const byStaff  = Object.entries(fil.reduce((acc,h)=>{const s=h.staff||"—";if(!acc[s])acc[s]={o:0,r:0};acc[s].o++;acc[s].r+=h.total;return acc;},{})).sort((a,b)=>b[1].r-a[1].r);
  const last7    = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const ds=d.toLocaleDateString("en-AU");return{label:d.toLocaleDateString("en-AU",{weekday:"short"}),rev:history.filter(h=>h.date===ds).reduce((s,h)=>s+h.total,0)};});
  const maxR     = Math.max(...last7.map(d=>d.rev),1);

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:"#fafaf9",minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <ModeBar/>
      <div style={{background:"#fff",borderBottom:"1px solid #e8e4e0",padding:"9px 14px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
          <span style={{fontSize:18}}>☕</span>
          <span style={{fontWeight:700,fontSize:15,color:"#2c1a0e"}}>Coffee Cart POS</span>
          <button onClick={()=>setStaffM(true)} style={{marginLeft:"auto",background:"#fdf5ee",border:"1px solid #ede8e3",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,color:"#7c4a1e",cursor:"pointer",fontFamily:"inherit"}}>{staff ? "👤 "+staff : "👤 Set Staff"}</button>
          {paidMsg && <span style={{fontSize:10,color:"#16a34a",fontWeight:700}}>{paidMsg}</span>}
        </div>
        <div style={{display:"flex"}}>
          {TABS_POS.map(t => (
            <button key={t} onClick={()=>setPosTab(t)} style={{flex:1,padding:"7px 0",background:"none",border:"none",borderBottom:posTab===t?"2px solid #7c4a1e":"2px solid transparent",color:posTab===t?"#7c4a1e":"#9c8a7a",fontWeight:posTab===t?700:500,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:12}}>

        {/* ORDER */}
        {posTab==="Order" && (
          <div>
            <Inp value={cName} onChange={e=>setCName(e.target.value)} placeholder="👤 Customer name..." style={{marginBottom:9}}/>
            <div style={{display:"flex",gap:6,marginBottom:9,overflowX:"auto",paddingBottom:2}}>
              {["All",...cats.map(c=>c.id)].map(cid => {
                const cat = cats.find(c=>c.id===cid);
                const active = menuFil===cid;
                return <button key={cid} onClick={()=>setMenuFil(cid)} style={{flexShrink:0,padding:"4px 12px",borderRadius:20,border:active?"2px solid "+(cat?.color||"#7c4a1e"):"1px solid #ede8e3",background:active?(cat?.bg||"#fdf8f5"):"#fff",fontWeight:active?700:500,fontSize:11,cursor:"pointer",color:active?(cat?.color||"#7c4a1e"):"#9c8a7a",fontFamily:"inherit"}}>{cid==="All"?"All":cat?.label||cid}</button>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {filtMenu.map(item => {
                const c = cstyle(cats,item.catId);
                return <button key={item.id} onClick={()=>addToOrder(item)} style={{background:"#fff",border:"1px solid "+c.border,borderRadius:11,padding:"11px 7px",textAlign:"center",cursor:"pointer",fontFamily:"inherit"}}>
                  <div style={{fontSize:22}}>{item.emoji}</div>
                  <div style={{fontWeight:600,fontSize:12,color:"#2c1a0e",marginTop:2}}>{item.name}</div>
                  <div style={{fontSize:10,color:"#9c8a7a",marginTop:1}}>{fmt(item.price)}</div>
                </button>;
              })}
            </div>
            {order.length>0 && (
              <Card>
                <div style={{fontWeight:700,color:"#2c1a0e",marginBottom:8,fontSize:12}}>{cName ? cName+"'s Order" : "Current Order"}</div>
                {order.map(i => (
                  <div key={i.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                    <span style={{fontSize:15}}>{i.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#2c1a0e"}}>{i.label}</div>
                      <div style={{fontSize:10,color:"#9c8a7a"}}>{fmt(i.price)}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <button onClick={()=>setOrder(p=>p.map(x=>x.id===i.id?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0))} style={{width:21,height:21,borderRadius:"50%",border:"1px solid #ede8e3",background:"#fafaf9",cursor:"pointer",fontSize:13,color:"#7c4a1e",fontFamily:"inherit"}}>-</button>
                      <span style={{fontSize:12,fontWeight:700,minWidth:12,textAlign:"center"}}>{i.qty}</span>
                      <button onClick={()=>setOrder(p=>p.map(x=>x.id===i.id?{...x,qty:x.qty+1}:x))} style={{width:21,height:21,borderRadius:"50%",border:"1px solid #ede8e3",background:"#fafaf9",cursor:"pointer",fontSize:13,color:"#7c4a1e",fontFamily:"inherit"}}>+</button>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#2c1a0e",minWidth:36,textAlign:"right"}}>{fmt(i.price*i.qty)}</span>
                  </div>
                ))}
                <Inp value={oNote} onChange={e=>setONote(e.target.value)} placeholder="Order note..." style={{marginTop:2,marginBottom:8,fontSize:11}}/>
                <div style={{borderTop:"1px solid #ede8e3",paddingTop:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:10,color:"#9c8a7a"}}>Total (incl. GST)</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#2c1a0e"}}>{fmt(tot)}</div>
                    <div style={{fontSize:9,color:"#9c8a7a"}}>GST {fmt(gst)}</div>
                  </div>
                  <button onClick={()=>setChkOpen(true)} style={{background:"#7c4a1e",color:"#fff",border:"none",borderRadius:9,padding:"10px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Checkout</button>
                </div>
              </Card>
            )}
            {order.length===0 && <div style={{textAlign:"center",color:"#c4b5a5",marginTop:24,fontSize:12}}>Tap items to build an order</div>}
          </div>
        )}

        {/* MENU */}
        {posTab==="Menu" && (
          <div>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontWeight:700,color:"#2c1a0e",fontSize:13}}>Categories</span>
                <button onClick={()=>{setCatM("new");setNewCat({label:"",color:PALETTE[0]});}} style={{background:"#7c4a1e",color:"#fff",border:"none",borderRadius:7,padding:"4px 11px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ New</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {cats.map(cat => (
                  <div key={cat.id} style={{display:"flex",alignItems:"center",gap:4,background:cat.bg,border:"1px solid "+cat.border,borderRadius:20,padding:"3px 10px"}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:cat.color,display:"inline-block"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:cat.color}}>{cat.label}</span>
                    <button onClick={()=>setCatM({...cat})} style={{background:"none",border:"none",cursor:"pointer",color:cat.color,fontSize:12,padding:"0 0 0 2px",fontFamily:"inherit"}}>✎</button>
                    <button onClick={()=>delCat(cat.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#e05252",fontSize:11,padding:0,fontFamily:"inherit"}}>✕</button>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{fontWeight:700,color:"#2c1a0e",marginBottom:8,fontSize:13}}>Menu Items</div>
            {menu.map(item => {
              const c = cstyle(cats,item.catId);
              const cat = cats.find(x=>x.id===item.catId);
              return (
                <div key={item.id} style={{background:"#fff",border:"1px solid "+c.border,borderRadius:10,padding:"9px 11px",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:20}}>{item.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,color:"#2c1a0e",fontSize:12}}>{item.name}</div>
                    <span style={{fontSize:10,background:c.bg,color:c.color,padding:"1px 6px",borderRadius:9,fontWeight:600}}>{cat?.label||item.catId}</span>
                  </div>
                  <div style={{fontWeight:700,color:"#7c4a1e",fontSize:12}}>{fmt(item.price)}</div>
                  <button onClick={()=>setEditItem({...item})} style={{background:"#faf5f0",border:"1px solid #ede8e3",borderRadius:6,padding:"3px 7px",fontSize:10,cursor:"pointer",color:"#7c4a1e",fontWeight:600,fontFamily:"inherit"}}>Edit</button>
                  <button onClick={()=>delItem(item.id)} style={{background:"#fff5f5",border:"1px solid #fde8e8",borderRadius:6,padding:"3px 7px",fontSize:10,cursor:"pointer",color:"#e05252",fontWeight:600,fontFamily:"inherit"}}>✕</button>
                </div>
              );
            })}
            <div style={{background:"#fff",border:"1px dashed #d4c5b5",borderRadius:11,padding:12,marginTop:10}}>
              <div style={{fontWeight:700,color:"#2c1a0e",marginBottom:7,fontSize:12}}>+ Add New Item</div>
              <Inp placeholder="Name" value={newItm.name} onChange={e=>setNewItm(f=>({...f,name:e.target.value}))} style={{marginBottom:6}}/>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <Inp placeholder="Price (AUD)" type="number" value={newItm.price} onChange={e=>setNewItm(f=>({...f,price:e.target.value}))} style={{flex:1}}/>
                <Inp placeholder="Emoji" value={newItm.emoji} onChange={e=>setNewItm(f=>({...f,emoji:e.target.value}))} style={{width:50,textAlign:"center"}}/>
              </div>
              <select value={newItm.catId} onChange={e=>setNewItm(f=>({...f,catId:e.target.value}))} style={{width:"100%",border:"1px solid #ede8e3",borderRadius:8,padding:"8px 11px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"inherit"}}>
                {cats.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <Btn full onClick={addItem}>Add Item</Btn>
            </div>
          </div>
        )}

        {/* DRAWER */}
        {posTab==="Drawer" && (
          <div>
            <Card style={{textAlign:"center",marginBottom:11}}>
              <div style={{fontSize:11,color:"#9c8a7a",marginBottom:3}}>Cash Drawer Balance</div>
              <div style={{fontSize:34,fontWeight:800,color:"#2c1a0e"}}>{fmt(drawerBal)}</div>
              <div style={{fontSize:10,color:"#9c8a7a",marginTop:2}}>Float: {fmt(drawer.float)}</div>
            </Card>
            <div style={{display:"flex",gap:7,marginBottom:11}}>
              {[["add","+ Add","#f0fdf4","#bbf7d0","#16a34a"],["remove","- Remove","#fff5f5","#fecaca","#e05252"],["float","Set Float","#faf5f0","#ede8e3","#7c4a1e"]].map(([t,l,bg,b,color]) => (
                <button key={t} onClick={()=>{setDrawerM(t);setDrawerAmt("");setDrawerNote("");}} style={{flex:1,background:bg,border:"1px solid "+b,borderRadius:8,padding:"10px 0",fontWeight:700,fontSize:11,color,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
            <div style={{fontWeight:700,color:"#2c1a0e",marginBottom:7,fontSize:12}}>Drawer Log</div>
            {!(drawer.transactions||[]).length && <div style={{textAlign:"center",color:"#c4b5a5",fontSize:12}}>No transactions</div>}
            {(drawer.transactions||[]).slice(0,30).map(t => (
              <div key={t.id} style={{background:"#fff",border:"1px solid #ede8e3",borderRadius:8,padding:"8px 11px",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:11,fontWeight:600,color:"#2c1a0e"}}>{t.note}</div><div style={{fontSize:10,color:"#9c8a7a"}}>{t.date} · {t.time}</div></div>
                <span style={{fontWeight:700,fontSize:12,color:t.type==="remove"?"#e05252":"#16a34a"}}>{t.type==="remove"?"-":"+"}{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS */}
        {posTab==="Reports" && (
          <div>
            <div style={{display:"flex",gap:5,marginBottom:11}}>
              {[["today","Today"],["week","7 Days"],["month","30 Days"],["all","All"]].map(([v,l]) => (
                <button key={v} onClick={()=>setRepRange(v)} style={{flex:1,padding:"6px 0",borderRadius:7,border:repRange===v?"2px solid #7c4a1e":"1px solid #ede8e3",background:repRange===v?"#fdf8f5":"#fff",fontWeight:600,fontSize:11,cursor:"pointer",color:repRange===v?"#7c4a1e":"#9c8a7a",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:11}}>
              {[["Revenue",fmt(rRev),"#7c4a1e"],["Orders",fil.length,"#2c1a0e"],["Avg Order",fmt(rAvg),"#2c1a0e"],["GST",fmt(rGST),"#2c1a0e"],["Discounts","-"+fmt(rDisc),"#e05252"],["Refunds","-"+fmt(rRef),"#e05252"],["Net",fmt(rRev-rRef),"#16a34a"],["Items Sold",fil.flatMap(h=>h.items).reduce((s,i)=>s+i.qty,0),"#2c1a0e"]].map(([label,val,color]) => (
                <Card key={label} style={{marginBottom:0}}><div style={{fontSize:9,color:"#9c8a7a",marginBottom:2}}>{label}</div><div style={{fontSize:18,fontWeight:800,color}}>{val}</div></Card>
              ))}
            </div>
            <Card style={{marginBottom:11}}>
              <div style={{fontWeight:700,color:"#2c1a0e",fontSize:11,marginBottom:9}}>Revenue - Last 7 Days</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:65}}>
                {last7.map((d,i) => (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{fontSize:8,color:"#9c8a7a"}}>{d.rev>0?fmt(d.rev):""}</div>
                    <div style={{width:"100%",background:d.rev>0?"#7c4a1e":"#f0ebe6",borderRadius:"3px 3px 0 0",height:Math.max(3,(d.rev/maxR)*48)}}/>
                    <div style={{fontSize:9,color:"#9c8a7a"}}>{d.label}</div>
                  </div>
                ))}
              </div>
            </Card>
            {byPay.length>0 && <Card style={{marginBottom:11}}>
              <div style={{fontWeight:700,color:"#2c1a0e",fontSize:11,marginBottom:8}}>Payments</div>
              {byPay.map(pm => (
                <div key={pm.id} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:"#2c1a0e"}}>{pm.emoji} {pm.label}</span><span style={{fontSize:11,fontWeight:700,color:"#7c4a1e"}}>{fmt(pm.total)} ({pm.count})</span></div>
                  <div style={{background:"#f0ebe6",borderRadius:3,height:4}}><div style={{background:"#7c4a1e",borderRadius:3,height:4,width:(rRev>0?(pm.total/rRev)*100:0)+"%"}}/></div>
                </div>
              ))}
            </Card>}
            {byStaff.length>0 && <Card style={{marginBottom:11}}>
              <div style={{fontWeight:700,color:"#2c1a0e",fontSize:11,marginBottom:8}}>Staff</div>
              {byStaff.map(([n,d]) => <div key={n} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11}}><span style={{color:"#2c1a0e"}}>{n}</span><span style={{color:"#7c4a1e",fontWeight:700}}>{fmt(d.r)} · {d.o} orders</span></div>)}
            </Card>}
            {iCts.length>0 && <Card style={{marginBottom:11}}>
              <div style={{fontWeight:700,color:"#2c1a0e",fontSize:11,marginBottom:8}}>Top Items</div>
              {iCts.slice(0,8).map(([n,q],i) => (
                <div key={n} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:"#2c1a0e"}}>{i+1}. {n}</span>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{background:"#f0ebe6",borderRadius:3,height:4,width:44}}><div style={{background:"#7c4a1e",borderRadius:3,height:4,width:(q/iCts[0][1])*44}}/></div>
                    <span style={{fontSize:10,fontWeight:700,color:"#7c4a1e",minWidth:24,textAlign:"right"}}>{q}</span>
                  </div>
                </div>
              ))}
            </Card>}
            <Btn full onClick={exportCSV} style={{marginBottom:11}}>Export CSV</Btn>
            <Card>
              <div style={{fontWeight:700,color:"#2c1a0e",fontSize:11,marginBottom:5}}>AI Insights</div>
              <Btn full onClick={getAI} disabled={aiLoad}>{aiLoad ? "Analysing..." : "Get AI Insights"}</Btn>
              {aiText && <div style={{marginTop:9,fontSize:12,color:"#2c1a0e",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiText}</div>}
            </Card>
          </div>
        )}

        {/* HISTORY */}
        {posTab==="History" && (
          <div>
            <div style={{fontWeight:700,color:"#2c1a0e",marginBottom:8}}>Order History</div>
            {!history.length && <div style={{textAlign:"center",color:"#c4b5a5",marginTop:36,fontSize:12}}>No orders yet</div>}
            {history.map(h => {
              const c = cstyle(cats,h.catId);
              const ref = (h.refunds||[]).reduce((s,r)=>s+r.amount,0);
              return (
                <div key={h.id} style={{background:"#fff",border:"1px solid "+c.border,borderRadius:11,padding:11,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {h.num && <span style={{background:c.bg,color:c.color,fontWeight:800,fontSize:11,padding:"1px 6px",borderRadius:9}}>#{h.num}</span>}
                      <span style={{fontWeight:700,fontSize:12,color:"#2c1a0e"}}>{h.customer}</span>
                      {h.staff&&h.staff!=="—"&&<span style={{fontSize:10,color:"#9c8a7a"}}>· {h.staff}</span>}
                    </div>
                    <span style={{fontWeight:800,color:"#7c4a1e",fontSize:12}}>{fmt(h.total)}</span>
                  </div>
                  <div style={{fontSize:10,color:"#9c8a7a",marginBottom:4}}>{PAY_MS.find(p=>p.id===h.payMethod)?.emoji} {PAY_MS.find(p=>p.id===h.payMethod)?.label} · {h.date} {h.time}</div>
                  {h.discAmt>0 && <div style={{fontSize:10,color:"#e05252",marginBottom:2}}>Discount: -{fmt(h.discAmt)}</div>}
                  {h.items.map((i,idx) => <div key={idx} style={{fontSize:11,color:"#5a3e2b",marginBottom:1}}>{i.qty}x {i.label}</div>)}
                  {h.note && <div style={{fontSize:10,color:"#9c8a7a",marginTop:3,fontStyle:"italic"}}>"{h.note}"</div>}
                  {ref>0 && <div style={{fontSize:10,color:"#e05252",marginTop:3}}>Refunded: {fmt(ref)}</div>}
                  <button onClick={()=>{setRefundM(h);setRefundAmt("");setRefundNote("");}} style={{marginTop:7,background:"#fff5f5",border:"1px solid #fecaca",borderRadius:7,padding:"4px 11px",fontSize:10,fontWeight:700,color:"#e05252",cursor:"pointer",fontFamily:"inherit"}}>Refund</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {itemM && (
        <Modal onClose={()=>setItemM(null)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>{itemM.emoji} {itemM.name}</div>
          <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Size</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>{SIZES.map(s=><Chip key={s} active={iSize===s} onClick={()=>setISize(s)}>{s}</Chip>)}</div>
          <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Milk</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{MILKS.map(m=><Chip key={m} active={iMilk===m} onClick={()=>setIMilk(m)}>{m}</Chip>)}</div>
          <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Extras</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{EXTRAS.map(e=><Chip key={e} active={iExtra.includes(e)} onClick={()=>setIExtra(x=>x.includes(e)?x.filter(v=>v!==e):[...x,e])}>{e}</Chip>)}</div>
          <div style={{display:"flex",gap:7}}><Btn ghost onClick={()=>setItemM(null)}>Cancel</Btn><Btn onClick={confirmItem}>Add to Order</Btn></div>
        </Modal>
      )}

      {chkOpen && (
        <Modal onClose={()=>{if(!sqPending){setChkOpen(false);setSqPending(false);}}}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>Checkout{cName?" - "+cName:""}</div>
          {order.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12,color:"#5a3e2b"}}><span>{i.qty}x {i.label}</span><span style={{fontWeight:600}}>{fmt(i.price*i.qty)}</span></div>)}
          <div style={{background:"#faf5f0",border:"1px solid #ede8e3",borderRadius:8,padding:9,margin:"9px 0"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Discount</div>
            <div style={{display:"flex",gap:5,marginBottom:5}}>{[["pct","% Off"],["flat","$ Off"]].map(([t,l])=><Chip key={t} active={disc.type===t} onClick={()=>setDisc(d=>({...d,type:t}))}>{l}</Chip>)}</div>
            <div style={{display:"flex",gap:5}}>
              <Inp type="number" placeholder={disc.type==="pct"?"e.g. 10":"e.g. 2.00"} value={disc.value} onChange={e=>setDisc(d=>({...d,value:e.target.value}))} style={{flex:1,fontSize:11}}/>
              <Inp placeholder="Reason" value={disc.reason} onChange={e=>setDisc(d=>({...d,reason:e.target.value}))} style={{flex:2,fontSize:11}}/>
            </div>
          </div>
          <div style={{borderTop:"1px solid #ede8e3",paddingTop:9,marginBottom:11}}>
            {dAmt>0 && <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#e05252"}}>Discount{disc.reason?" ("+disc.reason+")":""}</span><span style={{fontSize:11,color:"#e05252"}}>-{fmt(dAmt)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#9c8a7a"}}>GST incl.</span><span style={{fontSize:11,color:"#9c8a7a"}}>{fmt(gst)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:14,color:"#2c1a0e"}}>Total</span><span style={{fontWeight:800,fontSize:20,color:"#7c4a1e"}}>{fmt(tot)}</span></div>
          </div>
          <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Payment Method</div>
          <div style={{display:"flex",gap:6,marginBottom:11}}>
            {PAY_MS.map(pm=><Chip key={pm.id} active={payMethod===pm.id} onClick={()=>{if(!sqPending)setPay(pm.id);}}>{pm.emoji} {pm.label}</Chip>)}
          </div>
          {payMethod==="cash" && (
            <div style={{background:"#f9fafb",border:"1px solid #ede8e3",borderRadius:8,padding:9,marginBottom:11}}>
              <div style={{fontSize:10,color:"#9c8a7a",marginBottom:4}}>Cash tendered</div>
              <Inp type="number" placeholder="0.00" value={cashT} onChange={e=>setCashT(e.target.value)} style={{fontSize:15,fontWeight:700}}/>
              {cashT&&parseFloat(cashT)>=tot&&<div style={{marginTop:6,fontWeight:700,fontSize:13,color:"#16a34a"}}>Change: {fmt(chg)}</div>}
            </div>
          )}
          {payMethod==="square" && sqPending && (
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:9,padding:12,marginBottom:11,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>💳</div>
              <div style={{fontSize:13,fontWeight:700,color:"#2c1a0e",marginBottom:4}}>Did the payment go through?</div>
              <div style={{fontSize:11,color:"#9c8a7a",marginBottom:10}}>Confirm only if Square showed a success screen</div>
              <div style={{display:"flex",gap:7}}>
                <Btn bg="#e05252" onClick={()=>setSqPending(false)}>No - Failed</Btn>
                <Btn bg="#16a34a" onClick={()=>markPaid()}>Yes - Paid!</Btn>
              </div>
            </div>
          )}
          {!sqPending && (
            <div style={{display:"flex",gap:7}}>
              <Btn ghost onClick={()=>setChkOpen(false)}>Back</Btn>
              {payMethod==="square"
                ? <Btn bg="#16a34a" onClick={squareCharge}>💳 Charge {fmt(tot)} via Square</Btn>
                : <Btn bg="#16a34a" onClick={()=>markPaid()}>Mark as Paid</Btn>
              }
            </div>
          )}
        </Modal>
      )}

      {refundM && (
        <Modal onClose={()=>setRefundM(null)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:5}}>Refund - {refundM.customer}</div>
          <div style={{fontSize:11,color:"#9c8a7a",marginBottom:11}}>Order #{refundM.num} · Max: {fmt(refundM.total-(refundM.refunds||[]).reduce((s,r)=>s+r.amount,0))}</div>
          <Inp type="number" placeholder="Refund amount (AUD)" value={refundAmt} onChange={e=>setRefundAmt(e.target.value)} style={{fontSize:14,fontWeight:700,marginBottom:7}}/>
          <Inp placeholder="Reason (optional)" value={refundNote} onChange={e=>setRefundNote(e.target.value)} style={{marginBottom:13}}/>
          <div style={{display:"flex",gap:7}}><Btn ghost onClick={()=>setRefundM(null)}>Cancel</Btn><Btn bg="#e05252" onClick={doRefund}>Issue Refund</Btn></div>
        </Modal>
      )}

      {catM && (
        <Modal onClose={()=>setCatM(null)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>{catM==="new"?"New Category":"Edit Category"}</div>
          <Inp placeholder="Category name" value={catM==="new"?newCat.label:catM.label} onChange={e=>catM==="new"?setNewCat(c=>({...c,label:e.target.value})):setCatM(c=>({...c,label:e.target.value}))} style={{marginBottom:9}}/>
          <div style={{fontSize:9,fontWeight:700,color:"#9c8a7a",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Colour</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
            {PALETTE.map(col => { const cur=catM==="new"?newCat.color:catM.color; return <button key={col} onClick={()=>catM==="new"?setNewCat(c=>({...c,color:col})):setCatM(c=>({...c,color:col}))} style={{width:28,height:28,borderRadius:"50%",background:col,border:cur===col?"3px solid #2c1a0e":"2px solid #fff",cursor:"pointer",outline:"none"}}/>; })}
          </div>
          <div style={{display:"flex",gap:7}}>
            <Btn ghost onClick={()=>setCatM(null)}>Cancel</Btn>
            <Btn onClick={()=>{ const isNew=catM==="new"; const cat=isNew?{...newCat,id:newCat.label.trim()}:catM; if(!cat.label)return; saveCat(cat); }}>Save</Btn>
          </div>
        </Modal>
      )}

      {editItem && (
        <Modal onClose={()=>setEditItem(null)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>Edit Item</div>
          <Inp value={editItem.name} onChange={e=>setEditItem(i=>({...i,name:e.target.value}))} style={{marginBottom:7}}/>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <Inp type="number" value={editItem.price} onChange={e=>setEditItem(i=>({...i,price:parseFloat(e.target.value)}))} style={{flex:1}}/>
            <Inp value={editItem.emoji} onChange={e=>setEditItem(i=>({...i,emoji:e.target.value}))} style={{width:50,textAlign:"center"}}/>
          </div>
          <select value={editItem.catId} onChange={e=>setEditItem(i=>({...i,catId:e.target.value}))} style={{width:"100%",border:"1px solid #ede8e3",borderRadius:8,padding:"8px 11px",fontSize:13,marginBottom:12,outline:"none",fontFamily:"inherit"}}>
            {cats.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div style={{display:"flex",gap:7}}><Btn ghost onClick={()=>setEditItem(null)}>Cancel</Btn><Btn onClick={()=>saveItem(editItem)}>Save</Btn></div>
        </Modal>
      )}

      {drawerM && (
        <Modal onClose={()=>setDrawerM(null)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>{drawerM==="add"?"Add Cash":drawerM==="remove"?"Remove Cash":"Set Float"}</div>
          <Inp type="number" placeholder="Amount (AUD)" value={drawerAmt} onChange={e=>setDrawerAmt(e.target.value)} style={{fontSize:15,fontWeight:700,marginBottom:7}}/>
          {drawerM!=="float" && <Inp placeholder="Note" value={drawerNote} onChange={e=>setDrawerNote(e.target.value)} style={{marginBottom:11}}/>}
          <div style={{display:"flex",gap:7}}><Btn ghost onClick={()=>setDrawerM(null)}>Cancel</Btn><Btn onClick={()=>doDrawer(drawerM)}>Confirm</Btn></div>
        </Modal>
      )}

      {staffM && (
        <Modal onClose={()=>setStaffM(false)}>
          <div style={{fontWeight:700,fontSize:15,color:"#2c1a0e",marginBottom:11}}>Who's serving?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
            {staffList.map(s=><Chip key={s} active={staff===s} onClick={()=>{setStaff(s);setStaffM(false);}}>{s}</Chip>)}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:11}}>
            <Inp placeholder="Add staff member" value={newStaff} onChange={e=>setNewStaff(e.target.value)} style={{flex:1}}/>
            <button onClick={()=>{if(newStaff.trim()&&!staffList.includes(newStaff.trim())){const nl=[...staffList,newStaff.trim()];setStaffList(nl);saveStaff(nl);}setNewStaff("");}} style={{background:"#7c4a1e",color:"#fff",border:"none",borderRadius:7,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add</button>
          </div>
          <Btn ghost onClick={()=>setStaffM(false)}>Close</Btn>
        </Modal>
      )}
    </div>
  );
}
