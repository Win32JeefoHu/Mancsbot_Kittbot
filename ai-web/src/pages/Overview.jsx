import {Card,money,pct,TradeList} from '../ui.jsx'
export default function Overview({data,onAction,busy}){
 const positions=data?.positions||{},prices=data?.lastPrices||{}
 const invested=Object.keys(prices).reduce((s,p)=>s+Number(positions[p]?.amount||0)*Number(prices[p]||0),0)
 const pnl=Number(data?.pnl||0)
 return <div className="stack">
  <div className="hero-grid"><div className="card hero"><span className="eyebrow">TOTAL PORTFOLIO</span><h2>{money(data?.portfolioValue)}</h2><div className={pnl>=0?'positive':'negative'}>{pct(data?.pnlPercent)} · {money(pnl)}</div><p>KITT élő paper trading állapot</p></div><div className="card controls"><span className="eyebrow">ENGINE CONTROL</span><h3><i className={data?.running?'dot on':'dot'}/>{data?.running?'ENGINE RUNNING':'ENGINE STANDBY'}</h3><div className="actions">{data?.running?<button className="danger" disabled={busy} onClick={()=>onAction('stop')}>■ Stop</button>:<button className="primary" disabled={busy} onClick={()=>onAction('start')}>▶ Start</button>}<button className="ghost" disabled={busy} onClick={()=>onAction('reset')}>↻ Reset</button></div></div></div>
  <div className="stats"><Card label="CASH" value={money(data?.cash)} sub="Szabad tőke"/><Card label="INVESTED" value={money(invested)} sub="Piaci érték"/><Card label="TRADES" value={data?.trades?.length||0} sub="Aktuális session"/><Card label="STRATEGY" value={data?.strategyName||'—'} sub={`Trade size ${((data?.strategyConfig?.risk?.tradeFraction||.05)*100).toFixed(1)}%`}/></div>
  <div className="card"><div className="head"><div><span className="eyebrow">RECENT EXECUTIONS</span><h3>Legutóbbi tradek</h3></div></div><TradeList trades={[...(data?.trades||[])].reverse().slice(0,8)}/></div>
 </div>
}
