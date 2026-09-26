import {money,pct,TradeList} from '../ui.jsx'
const coins=['BTC-USD','ETH-USD','SOL-USD','ADA-USD','DOT-USD','MATIC-USD']
const short=p=>p.replace('-USD','')
export default function Overview({data,lab,onAction,busy}){
 const positions=data?.positions||{},prices=data?.lastPrices||{}
 const invested=Object.keys(prices).reduce((s,p)=>s+Number(positions[p]?.amount||0)*Number(prices[p]||0),0)
 const pnl=Number(data?.pnl||0),a=lab?.tradeAnalysis||{},m=lab?.marketAnalysis||{}
 return <div className="stack dashboard-stack">
  <div className="dashboard-top">
   <div className="hud-card portfolio-panel">
    <div className="panel-head"><span>◉ PORTFOLIO BALANCE</span><span className="live-tag">LIVE DATA</span></div>
    <div className="portfolio-main"><div><strong>{money(data?.portfolioValue)}</strong><b className={pnl>=0?'positive':'negative'}>{pct(data?.pnlPercent)} ▲</b><p className={pnl>=0?'positive':'negative'}>{money(pnl)} session P/L</p></div><div className="holo-chart"><i/><i/><i/><i/><i/><i/><i/></div></div>
    <div className="triple-metrics"><div><small>TOTAL EQUITY</small><b>{money(data?.portfolioValue)}</b></div><div><small>AVAILABLE</small><b>{money(data?.cash)}</b></div><div><small>IN POSITION</small><b>{money(invested)}</b></div></div>
   </div>
   <div className="status-column">
    <div className="hud-card compact-status"><span className="icon-cube">◫</span><div><small>PAPER MODE</small><b className="positive">{data?.paperTrade?'ACTIVE':'OFF'}</b><em>Virtual trading</em></div><span className={data?.paperTrade?'toggle on':'toggle'}/></div>
    <div className="hud-card compact-status"><span className="icon-cube">◉</span><div><small>BOT STATUS</small><b className={data?.running?'positive':'negative'}>{data?.running?'RUNNING':'STANDBY'}</b><em>{data?.strategyName||'adaptive'} strategy</em></div><button className={data?.running?'round-control stop':'round-control'} disabled={busy} onClick={()=>onAction(data?.running?'stop':'start')}>{data?.running?'■':'▶'}</button></div>
   </div>
  </div>

  <div className="hud-card markets-strip">
   <div className="panel-head"><span>◎ ACTIVE MARKETS</span><span className="live-tag">{Object.keys(prices).length} PAIRS</span></div>
   <div className="coin-grid">{coins.map((pair,i)=>{const price=prices[pair];return <div className="coin-tile" key={pair}><div className="coin-badge">{short(pair).slice(0,1)}</div><div><b>{short(pair)}</b><strong>{price==null?'—':money(price,price<10?4:2)}</strong></div><div className={i===4?'spark mini down':'spark mini'}><i/><i/><i/><i/><i/></div></div>})}</div>
  </div>

  <div className="hud-card ai-command-panel">
   <div className="ai-orb"><div className="orb-core">AI</div><span>ANALYZE</span><span>OPTIMIZE</span><span>EVOLVE</span></div>
   <div className="ai-panel-body">
    <div className="panel-head"><span>◉ AI STRATEGY LAB</span><span className="ai-powered">● AI POWERED</span></div>
    <div className="ai-kpis">
     <div><small>STRATEGY STATUS</small><b>{lab?.pendingTrial?'TRIAL ACTIVE':lab?'MONITORING':'LOADING'}</b></div>
     <div><small>SAFETY LAYER</small><b className="positive">{lab?.safety?.userApprovalRequired?'ACTIVE':'WAIT'}</b></div>
     <div><small>PAPER MODE</small><b className="positive">{lab?.safety?.paperMode?'ON':'OFF'}</b></div>
     <div><small>MARKET REGIME</small><b>{m.regime||'WAIT'}</b></div>
     <div><small>WIN RATE</small><b>{a.winRate==null?'—':`${(a.winRate*100).toFixed(1)}%`}</b></div>
     <div><small>REALIZED P/L</small><b className={Number(a.realizedPnl||0)>=0?'positive':'negative'}>{money(a.realizedPnl)}</b></div>
     <div><small>PROPOSALS</small><b>{(lab?.proposals||[]).filter(p=>p.status==='pending').length}</b></div>
     <div><small>VERSIONS</small><b>{(lab?.versions||[]).length}</b></div>
     <div><small>AI CYCLE</small><b>{lab?.intervalMs?Math.round(lab.intervalMs/1000)+' sec':'—'}</b></div>
    </div>
   </div>
  </div>

  <div className="dashboard-bottom">
   <div className="hud-card performance-panel"><div className="panel-head"><span>▥ PERFORMANCE SUMMARY</span><span className="live-tag">SESSION</span></div><div className="performance-numbers"><div><b className={pnl>=0?'positive':'negative'}>{pct(data?.pnlPercent)}</b><small>TOTAL RETURN</small></div><div><b className={pnl>=0?'positive':'negative'}>{money(pnl)}</b><small>REALIZED / TOTAL P&L</small></div><div><b>{a.winRate==null?'—':`${(a.winRate*100).toFixed(1)}%`}</b><small>WIN RATE</small></div></div><div className="performance-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
   <div className="hud-card recent-panel"><div className="panel-head"><span>⇄ RECENT TRADES</span><span className="live-tag">{data?.trades?.length||0}</span></div><TradeList trades={[...(data?.trades||[])].reverse().slice(0,5)}/></div>
  </div>
 </div>
}