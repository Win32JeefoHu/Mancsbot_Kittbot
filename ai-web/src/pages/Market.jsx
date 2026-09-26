import {money,Metric} from '../ui.jsx'

const zoneText=z=>z?\`${money(z.low,z.low<10?4:2)} – ${money(z.high,z.high<10?4:2)}\`:'—'

export default function Market({data}){
 const prices=data?.lastPrices||{},stats=data?.strategyStats||{},structure=data?.marketStructure||{},sp=structure.pairs||{}
 return <div className="stack">
  <div className="hud-card intro-panel">
   <span className="eyebrow">LIVE MARKET TELEMETRY · MARKET STRUCTURE v1.7</span>
   <h2>Market Radar</h2>
   <p>Coinbase árfolyamok, aktív stratégia, multi-timeframe market structure, Support/Resistance zónák és Bounce/Breakout/Retest setupok.</p>
   <div className="metrics">
    <Metric label="Structure Guard" value={structure.confirmationRequired?'BUY CONFIRMATION ON':'MONITOR ONLY'}/>
    <Metric label="Min. setup score" value={structure.scoreThreshold==null?'—':\`${structure.scoreThreshold}/100\`}/>
    <Metric label="History bootstrap" value={structure.bootstrapCompleted?'READY':'BUILDING'}/>
   </div>
  </div>
  <div className="market-grid">{Object.entries(prices).map(([pair,price],i)=>{
   const s=stats[pair]||{},m=sp[pair]||{}
   return <div className="hud-card market-card" key={pair}>
    <div className="panel-head"><span>◈ {pair}</span><span className="live-tag">LIVE</span></div>
    <div className="market-price">{money(price,price<10?4:2)}</div>
    <div className={i%4===3?'spark market-spark down':'spark market-spark'}><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="metrics">
     <Metric label="Trend" value={m.trend||'WAIT'}/>
     <Metric label="Setup" value={m.setup?\`${m.setup} · ${m.score||0}/100\`:'WAIT'}/>
     <Metric label="Signal" value={m.action||'WAIT'}/>
     <Metric label="Support" value={zoneText(m.support)}/>
     <Metric label="Resistance" value={zoneText(m.resistance)}/>
     <Metric label="RSI" value={s.rsi==null?'—':Number(s.rsi).toFixed(1)}/>
     <Metric label="Change" value={s.change==null?'—':\`${(s.change*100).toFixed(3)}%\`}/>
     <Metric label="Threshold" value={s.dynamicThreshold==null?'—':\`${(s.dynamicThreshold*100).toFixed(3)}%\`}/>
    </div>
   </div>
  })}</div>
 </div>
}