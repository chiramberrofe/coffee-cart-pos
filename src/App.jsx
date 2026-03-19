import { useState, useEffect } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDP8DZ6zvYUJWDb2jE6S1AExHia4xxBElM",
  authDomain: "coffee-cart-pos.firebaseapp.com",
  projectId: "coffee-cart-pos",
  storageBucket: "coffee-cart-pos.firebasestorage.app",
  messagingSenderId: "492386331460",
  appId: "1:492386331460:web:4b212b914ff6faaaa24511"
};

const fmt = n => "$" + Number(n).toFixed(2);

function Timer({ sentAt }) {
  const [e, setE] = useState(Math.floor((Date.now()-sentAt)/1000));
  useEffect(() => {
    const iv = setInterval(() => setE(Math.floor((Date.now()-sentAt)/1000)), 1000);
    return () => clearInterval(iv);
  }, [sentAt]);
  const m = Math.floor(e/60), s = e%60;
  const color = e>180 ? "#ef4444" : e>90 ? "#f59e0b" : "#22c55e";
  return (
    <span style={{fontSize:20,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>
      {m>0 ? m+"m " : ""}{String(s).padStart(2,"0")}s
    </span>
  );
}

export default function App() {
  const [queue,   setQueue]   = useState([]);
  const [history, setHistory] = useState([]);
  const [recalled,setRecalled]= useState(null);
  const [tab,     setTab]     = useState("queue");
  const [search,  setSearch]  = useState("");
  const [ready,   setReady]   = useState(false);
  const [sync,    setSync]    = useState("Connecting...");
  const [fb,      setFb]      = useState(null);

  useEffect(() => {
    let unsubs = [];
    (async () => {
      try {
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, collection, doc, onSnapshot, deleteDoc, setDoc, query, orderBy }
          = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
        const db  = getFirestore(app);
        setFb({ db, collection, doc, deleteDoc, setDoc, query, orderBy });

        unsubs.push(onSnapshot(query(collection(db,"queue"), orderBy("sentAt")), snap => {
          const q = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          setQueue(prev => {
            if (q.length > prev.length) beep();
            return q;
          });
        }));
        unsubs.push(onSnapshot(query(collection(db,"history"), orderBy("sentAt","desc")), snap => {
          setHistory(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        }));

        setSync("🟢 Live"); setReady(true);
      } catch(e) { console.error(e); setSync("🔴 Error"); setReady(true); }
    })();
    return () => unsubs.forEach(u => u());
  }, []);

  function beep() {
    try {
      const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value=880;
      g.gain.setValueAtTime(0.4,c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5);
      o.start(); o.stop(c.currentTime+0.5);
    } catch(e) {}
  }

  async function bump(id) {
    if (!fb) return;
    const ticket = queue.find(t => t.id===id);
    if (ticket) setRecalled(ticket);
    await fb.deleteDoc(fb.doc(fb.db,"queue",id));
  }

  async function recall() {
    if (!recalled||!fb) return;
    await fb.setDoc(fb.doc(fb.db,"queue",recalled.id), {...recalled, sentAt:Date.now()});
    setRecalled(null);
  }

  const filtHist = history.filter(h => {
    const q = search.toLowerCase();
    return !q || h.customer?.toLowerCase().includes(q) || (h.items||[]).some(i=>i.name?.toLowerCase().includes(q)) || String(h.squarePaymentId||"").includes(q);
  });

  if (!ready) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#1a1008",fontFamily:"Inter,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,border:"3px solid #3a2010",borderTopColor:"#f5c98a",borderRadius:"50%",animation:"spin 0.7s linear infinite",marginBottom:14}}/>
      <p style={{color:"#7c6050",fontSize:14}}>Connecting...</p>
    </div>
  );

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:"#1a1008",minHeight:"100vh",maxWidth:600,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>☕</span>
            <span style={{fontWeight:800,fontSize:17,color:"#f5c98a"}}>Barista Screen</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {recalled && (
              <button onClick={recall} style={{background:"#7c4a1e",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ↩ Recall
              </button>
            )}
            <span style={{fontSize:11,color:"#7c6050"}}>{sync}</span>
          </div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #3a2010"}}>
          {[["queue","Queue","#f5c98a"],["history","History","#f5c98a"]].map(([t,l,ac]) => (
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:tab===t?"2px solid "+ac:"2px solid transparent",color:tab===t?ac:"#7c4a1e",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {l}{t==="queue" ? " ("+queue.length+")" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      {tab==="queue" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px 24px"}}>
          {queue.length===0 ? (
            <div style={{textAlign:"center",marginTop:80}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontSize:16,fontWeight:700,color:"#5a3e2b"}}>All clear!</div>
              <div style={{fontSize:13,color:"#3a2010",marginTop:4}}>No pending orders</div>
            </div>
          ) : queue.map(t => (
            <div key={t.id} style={{background:"#2c1a0e",border:"2px solid #5a3e2b",borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:16,color:"#f5e6d0",marginBottom:2}}>{t.customer||"Guest"}</div>
                  <div style={{fontSize:11,color:"#7c6050"}}>{t.time} · {t.payMethod==="tap"?"Tap to Pay":"Card"} {t.last4?"····"+t.last4:""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <Timer sentAt={t.sentAt}/>
                  <div style={{fontSize:16,fontWeight:800,color:"#f5c98a",marginTop:2}}>{fmt(t.total)}</div>
                </div>
              </div>
              {(t.items||[]).map((i,idx) => (
                <div key={idx} style={{fontSize:14,color:"#c4a882",marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:800,color:"#f5c98a",fontSize:15}}>{i.qty}×</span>
                  <span>{i.name}</span>
                  <span style={{marginLeft:"auto",color:"#7c6050",fontSize:12}}>{fmt(i.price)}</span>
                </div>
              ))}
              {t.note && (
                <div style={{fontSize:12,color:"#d97706",marginTop:8,background:"rgba(217,119,6,0.1)",borderRadius:7,padding:"5px 9px",fontStyle:"italic"}}>
                  📝 {t.note}
                </div>
              )}
              <button onClick={()=>bump(t.id)} style={{width:"100%",marginTop:14,background:"#f5c98a",color:"#1a1008",border:"none",borderRadius:10,padding:14,fontWeight:900,fontSize:16,cursor:"pointer",letterSpacing:0.5,fontFamily:"inherit"}}>
                ✓ BUMP
              </button>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {tab==="history" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px 24px"}}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search customer, item..."
            style={{width:"100%",background:"#2c1a0e",color:"#f5e6d0",border:"1px solid #3a2010",borderRadius:9,padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12,fontFamily:"inherit"}}
          />
          {filtHist.length===0 && <div style={{textAlign:"center",color:"#5a3e2b",marginTop:40,fontSize:13}}>No orders yet</div>}
          {filtHist.map(h => (
            <div key={h.id} style={{background:"#2c1a0e",border:"1px solid #3a2010",borderRadius:12,padding:13,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontWeight:700,fontSize:14,color:"#f5e6d0"}}>{h.customer||"Guest"}</span>
                <span style={{fontWeight:800,fontSize:14,color:"#f5c98a"}}>{fmt(h.total)}</span>
              </div>
              <div style={{fontSize:11,color:"#7c6050",marginBottom:6}}>{h.date} · {h.time} · {h.payMethod==="tap"?"Tap to Pay":"Card"} {h.last4?"····"+h.last4:""}</div>
              {(h.items||[]).map((i,idx) => (
                <div key={idx} style={{fontSize:13,color:"#c4a882",marginBottom:2}}>{i.qty}× {i.name}</div>
              ))}
              {h.note && <div style={{fontSize:11,color:"#d97706",marginTop:5,fontStyle:"italic"}}>📝 {h.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
