export const money=(n,d=2)=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}`
export const pct=n=>`${Number(n||0)>=0?'+':''}${Number(n||0).toFixed(2)}%`
export const tm=iso=>iso?new Date(iso).toLocaleTimeString('hu-HU',{hour12:false}):'—'
export function Card({label,value,sub,tone=''}){return <div className="card stat"><span>{label}</span><strong className={tone}>{value}</strong><small>{sub}</small></div>}
export function Empty({children}){return <div className="empty">{children}</div>}
export function Metric({label,value}){return <div className="metric"><span>{label}</span><b>{value}</b></div>}
export function TradeList({trades=[]}){return trades.length?<div className="trade-list">{trades.map(t=><div className="trade" key={t.id}><span className={`badge ${t.side==='BUY'?'buy':'sell'}`}>{t.side}</span><div><b>{t.productId}</b><small>{tm(t.time)}</small></div><span>{money(t.price)}</span><strong className={t.realizedPnl==null?'':Number(t.realizedPnl)>=0?'positive':'negative'}>{t.realizedPnl==null?money(t.value):`P/L ${money(t.realizedPnl)}`}</strong></div>)}</div>:<Empty>Nincs trade.</Empty>}
