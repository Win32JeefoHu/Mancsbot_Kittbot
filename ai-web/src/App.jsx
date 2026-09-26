import {useCallback,useEffect,useMemo,useState} from 'react'
import Overview from './pages/Overview.jsx'
import Market from './pages/Market.jsx'
import Trades from './pages/Trades.jsx'
import AIStrategyLab from './pages/AIStrategyLab.jsx'
import Diagnostics from './pages/Diagnostics.jsx'
import Settings from './pages/Settings.jsx'

const clean=u=>String(u||'').trim().replace(/\/+$/,'')
const initial=()=>{try{const x=window.KittAndroid?.getBackendBase?.();if(x)return clean(x)}catch(_){}return clean(localStorage.getItem('kittBackendUrl')||'http://127.0.0.1:3000')}
const NAV=[['overview','Dashboard','⌂'],['market','Market','◈'],['trades','Tradek','⇄'],['ai','AI Strategy Lab','◉'],['diagnostics','Diagnostics','⌁'],['settings','Settings','⚙']]

export default function App(){
 const [backend,setBackend]=useState(initial),[page,setPage]=useState('overview'),[data,setData]=useState(null),[lab,setLab]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[labBusy,setLabBusy]=useState(false),[labMsg,setLabMsg]=useState(''),[clock,setClock]=useState(new Date())
 const api=useMemo(()=>`${clean(backend)}/api/bot`,[backend]),labApi=useMemo(()=>`${clean(backend)}/api/ai-lab`,[backend])
 const refresh=useCallback(async()=>{if(!clean(backend)){setError('Nincs backend cím.');return}try{const r=await fetch(`${api}/status`);if(!r.ok)throw new Error(`HTTP ${r.status}`);setData(await r.json());setError('')}catch(e){setError(`Backend nem elérhető: ${clean(backend)} · ${e.message}`)}},[backend,api])
 const refreshLab=useCallback(async()=>{if(!clean(backend))return;try{const r=await fetch(`${labApi}/status`);if(!r.ok)throw new Error(`HTTP ${r.status}`);setLab(await r.json())}catch(_){}},[backend,labApi])
 useEffect(()=>{refresh();const id=setInterval(refresh,2000);return()=>clearInterval(id)},[refresh])
 useEffect(()=>{refreshLab();const id=setInterval(refreshLab,10000);return()=>clearInterval(id)},[refreshLab])
 useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[])
 const botAction=async(name)=>{setBusy(true);setNotice('');try{const r=await fetch(`${api}/${name}`,{method:'POST',headers:{'Content-Type':'application/json'}}),j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);if(j.state)setData(j.state);setNotice(`${name} kész.`)}catch(e){setError(e.message)}finally{setBusy(false)}}
 const labAction=async(path)=>{setLabBusy(true);setLabMsg('');try{const r=await fetch(`${labApi}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'}}),j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);setLab(j.status||j);setLabMsg(path==='analyze'?'Elemzés lefutott.':path.includes('/stage')?'Próbaverzió aktív.':path==='trial/save'?'AI verzió elmentve.':path==='trial/discard'?'Próbaverzió visszavonva.':path.includes('rollback')?'Korábbi verzió visszaállítva.':'Művelet kész.');await refresh()}catch(e){setLabMsg(`Hiba: ${e.message}`)}finally{setLabBusy(false)}}
 const saveBackend=v=>{const x=clean(v);localStorage.setItem('kittBackendUrl',x);setBackend(x);setNotice('Backend cím mentve.');setError('')}
 const connected=!error&&!!data
 const nav=<>{NAV.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i><span>{label}</span></button>)}</>
 return <div className="app-frame">
  <div className="cosmic-grid"/>
  <aside className="side-rail">
   <div className="brand-lockup"><div className="kitt-emblem"><span>K</span></div><div><b>KITT</b><small>AI TRADING OS</small></div></div>
   <nav>{nav}</nav>
   <div className="rail-status"><span><i className={data?.running?'pulse-dot on':'pulse-dot'}/>{data?.running?'ENGINE ACTIVE':'STANDBY'}</span><b>{data?.paperTrade?'PAPER':'LIVE'}</b></div>
  </aside>
  <main className="command-deck">
   <header className="top-command">
    <div className="mobile-brand"><div className="kitt-emblem"><span>K</span></div><div><b>KITT</b><small>AI TRADING OS</small></div></div>
    <div className="page-title"><span className="eyebrow">MANCSBOT / NAGY DÁNIEL</span><h1>{NAV.find(n=>n[0]===page)?.[1]}</h1></div>
    <div className="top-telemetry">
     <div className={connected?'connection-chip connected':'connection-chip'}><span className="server-icon">▤</span><div><small>BACKEND</small><b>{connected?'CONNECTED':'OFFLINE'}</b><em>{connected?'127.0.0.1:3000':'kapcsolat szükséges'}</em></div></div>
     <div className="clock-chip"><small>LOCAL TIME</small><b>{clock.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</b></div>
    </div>
   </header>
   {error&&<div className="alert error">⚠ {error}</div>}
   {notice&&<div className="alert ok">✓ {notice}</div>}
   <section className="page-stage">
    {page==='overview'&&<Overview data={data} lab={lab} onAction={botAction} busy={busy}/>}
    {page==='market'&&<Market data={data}/>}
    {page==='trades'&&<Trades data={data} lab={lab}/>}
    {page==='ai'&&<AIStrategyLab lab={lab} busy={labBusy} message={labMsg} onAction={labAction} onRefresh={refreshLab}/>}
    {page==='diagnostics'&&<Diagnostics data={data}/>}
    {page==='settings'&&<Settings backend={backend} onSave={saveBackend}/>}
   </section>
  </main>
  <nav className="bottom-nav">{nav}</nav>
 </div>
}