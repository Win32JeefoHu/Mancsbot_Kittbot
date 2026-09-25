import {useCallback,useEffect,useMemo,useState} from 'react'
import Overview from './pages/Overview.jsx'
import Market from './pages/Market.jsx'
import Trades from './pages/Trades.jsx'
import AIStrategyLab from './pages/AIStrategyLab.jsx'
import Diagnostics from './pages/Diagnostics.jsx'
import Settings from './pages/Settings.jsx'

const clean=u=>String(u||'').trim().replace(/\/+$/,'')
const initial=()=>{try{const x=window.KittAndroid?.getBackendBase?.();if(x)return clean(x)}catch(_){}return clean(localStorage.getItem('kittBackendUrl')||'http://127.0.0.1:3000')}
const NAV=[['overview','Dashboard','⌂'],['market','Market','◈'],['trades','Tradek','↗'],['ai','AI Strategy Lab','🧠'],['diagnostics','Diagnostics','◇'],['settings','Kapcsolat','⚙']]
export default function App(){
 const [backend,setBackend]=useState(initial),[page,setPage]=useState('overview'),[data,setData]=useState(null),[lab,setLab]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[labBusy,setLabBusy]=useState(false),[labMsg,setLabMsg]=useState('')
 const api=useMemo(()=>`${clean(backend)}/api/bot`,[backend]),labApi=useMemo(()=>`${clean(backend)}/api/ai-lab`,[backend])
 const refresh=useCallback(async()=>{if(!clean(backend)){setError('Nincs backend cím.');return}try{const r=await fetch(`${api}/status`);if(!r.ok)throw new Error(`HTTP ${r.status}`);setData(await r.json());setError('')}catch(e){setError(`Backend nem elérhető: ${clean(backend)} · ${e.message}`)}},[backend,api])
 const refreshLab=useCallback(async()=>{if(!clean(backend))return;try{const r=await fetch(`${labApi}/status`);if(r.ok)setLab(await r.json())}catch(_){}},[backend,labApi])
 useEffect(()=>{refresh();const id=setInterval(refresh,2000);return()=>clearInterval(id)},[refresh])
 useEffect(()=>{refreshLab();const id=setInterval(refreshLab,10000);return()=>clearInterval(id)},[refreshLab])
 const botAction=async(name)=>{setBusy(true);setNotice('');try{const r=await fetch(`${api}/${name}`,{method:'POST',headers:{'Content-Type':'application/json'}}),j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);if(j.state)setData(j.state);setNotice(`${name} kész.`)}catch(e){setError(e.message)}finally{setBusy(false)}}
 const labAction=async(path)=>{setLabBusy(true);setLabMsg('');try{const r=await fetch(`${labApi}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'}}),j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);setLab(j.status||j);setLabMsg(path==='analyze'?'Elemzés lefutott.':path.includes('/stage')?'Próbaverzió aktív.':path==='trial/save'?'AI verzió elmentve.':path==='trial/discard'?'Próbaverzió visszavonva.':path.includes('rollback')?'Korábbi verzió visszaállítva.':'Művelet kész.');await refresh()}catch(e){setLabMsg(`Hiba: ${e.message}`)}finally{setLabBusy(false)}}
 const saveBackend=v=>{const x=clean(v);localStorage.setItem('kittBackendUrl',x);setBackend(x);setNotice('Backend cím mentve.');setError('')}
 return <div className="shell"><aside><div className="brand"><span>K</span><div><b>KITT</b><small>AI TRADING OS</small></div></div><nav>{NAV.map(([id,label,icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><i>{icon}</i>{label}</button>)}</nav><div className="aside-foot"><div><i className={data?.running?'dot on':'dot'}/>{data?.running?'ENGINE ACTIVE':'STANDBY'}</div><b>{data?.paperTrade?'PAPER':'LIVE'}</b></div></aside><main><header><div><span className="eyebrow">MancsBot / Nagy Dániel</span><h1>{NAV.find(n=>n[0]===page)?.[1]}</h1></div><div className="mode">{data?.paperTrade?'PAPER MODE':'LIVE MODE'}</div></header>{error&&<div className="alert error">⚠ {error}</div>}{notice&&<div className="alert ok">✓ {notice}</div>}{page==='overview'&&<Overview data={data} onAction={botAction} busy={busy}/>} {page==='market'&&<Market data={data}/>} {page==='trades'&&<Trades data={data} lab={lab}/>} {page==='ai'&&<AIStrategyLab lab={lab} busy={labBusy} message={labMsg} onAction={labAction} onRefresh={refreshLab}/>} {page==='diagnostics'&&<Diagnostics data={data}/>} {page==='settings'&&<Settings backend={backend} onSave={saveBackend}/>}</main></div>
}
