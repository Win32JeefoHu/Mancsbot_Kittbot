const fs=require('fs');
const path=require('path');
const express=require('express');

module.exports=function createAILab(engine){
  const router=express.Router();
  const dir=path.join(process.cwd(),'data','ai-lab');
  const stateFile=path.join(dir,'state.json');
  fs.mkdirSync(dir,{recursive:true});

  const clone=v=>JSON.parse(JSON.stringify(v));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const readState=()=>{try{return JSON.parse(fs.readFileSync(stateFile,'utf8'))}catch{return{versions:[],proposals:[],pendingTrial:null,lastAnalysis:null,analysisCount:0,activeVersionId:null}}};
  let state=readState();
  let timer=null;

  function save(){fs.writeFileSync(stateFile,JSON.stringify(state,null,2));}
  function current(){return engine.getTuningConfig?engine.getTuningConfig():{}}
  function ensureInitial(){
    if(state.versions.length)return;
    const cfg=clone(current());
    const v={id:'v1-original',label:'Original',source:'system',createdAt:new Date().toISOString(),config:cfg};
    state.versions=[v]; state.activeVersionId=v.id; save();
  }
  ensureInitial();

  function trades(){
    const s=engine.getState?.()||engine.state||{};
    return s.trades||[];
  }
  function tradeStats(){
    const closed=trades().filter(t=>t.side==='SELL'&&Number.isFinite(Number(t.realizedPnl)));
    const wins=closed.filter(t=>Number(t.realizedPnl)>0).length;
    const losses=closed.filter(t=>Number(t.realizedPnl)<0).length;
    let streak=0,maxLossStreak=0;
    for(const t of closed){if(Number(t.realizedPnl)<0){streak++;maxLossStreak=Math.max(maxLossStreak,streak)}else streak=0}
    const realizedPnl=closed.reduce((s,t)=>s+Number(t.realizedPnl||0),0);
    return{closedTrades:closed.length,wins,losses,winRate:closed.length?wins/closed.length:null,realizedPnl,maxLossStreak,recent:trades().slice(-12)};
  }
  function marketStats(){
    let trendVotes=0,vol=0,count=0;
    for(const points of Object.values(engine.marketHistory||{})){
      if(!points?.length)continue;
      const recent=points.slice(-100),first=Number(recent[0].price),last=Number(recent.at(-1).price);
      const change=first?(last-first)/first:0;
      trendVotes+=change>.003?1:change<-.003?-1:0;
      const rs=[]; for(let i=1;i<recent.length;i++){const a=Number(recent[i-1].price),b=Number(recent[i].price);if(a)rs.push((b-a)/a)}
      const avg=rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:0;
      const variance=rs.length?rs.reduce((s,x)=>s+(x-avg)**2,0)/rs.length:0;
      vol+=Math.sqrt(variance)*100; count++;
    }
    return{regime:trendVotes>1?'UPTREND':trendVotes<-1?'DOWNTREND':'SIDEWAYS',averageVolatilityPct:count?vol/count:0};
  }
  function simulate(cfg){
    let initial=0,finalValue=0,maxDrawdown=0,tradeCount=0,samples=0;
    for(const [pair,points] of Object.entries(engine.marketHistory||{})){
      const hist=(points||[]).slice(-600); if(hist.length<20)continue;
      const strategy=engine.createStrategy(cfg.strategyName,cfg.params||{});
      let cash=1000,amount=0,peak=1000,lastTradeAt=0; initial+=1000; samples+=hist.length;
      for(const p of hist){
        const price=Number(p.price),ts=Number(p.time||0); if(!price)continue;
        strategy.updatePrice(pair,price); const sig=strategy.getSignal(pair);
        if((sig.action==='BUY'||sig.action==='SELL')&&ts-lastTradeAt>=Number(cfg.risk?.cooldownMs||0)){
          const value=Math.max(10,cash*Number(cfg.risk?.tradeFraction||.05));
          if(sig.action==='BUY'&&cash>=value){amount+=value/price;cash-=value;tradeCount++;lastTradeAt=ts}
          else if(sig.action==='SELL'&&amount>0){const q=Math.min(amount,value/price);amount-=q;cash+=q*price;tradeCount++;lastTradeAt=ts}
        }
        const eq=cash+amount*price; peak=Math.max(peak,eq); if(peak)maxDrawdown=Math.max(maxDrawdown,(peak-eq)/peak);
      }
      finalValue+=cash+amount*Number(hist.at(-1)?.price||0);
    }
    return{samples,trades:tradeCount,returnPct:initial?((finalValue-initial)/initial)*100:0,maxDrawdownPct:maxDrawdown*100,finalValue};
  }
  function score(sim){return Number(sim.returnPct||0)-Number(sim.maxDrawdownPct||0)*.4-Number(sim.trades||0)*.001}
  function diff(a,b){
    const out=[]; const walk=(x,y,p='')=>{for(const k of new Set([...Object.keys(x||{}),...Object.keys(y||{})])){const key=p?`${p}.${k}`:k, xv=x?.[k],yv=y?.[k]; if(xv&&typeof xv==='object'&&!Array.isArray(xv)&&yv&&typeof yv==='object'&&!Array.isArray(yv))walk(xv,yv,key);else if(JSON.stringify(xv)!==JSON.stringify(yv))out.push({key,from:xv,to:yv})}};
    walk(a,b); return out;
  }
  function candidates(base,stats,market){
    const out=[],add=fn=>{const c=clone(base);fn(c);c.risk=c.risk||{};c.risk.tradeFraction=clamp(Number(c.risk.tradeFraction||.05),.01,.2);c.risk.cooldownMs=Math.round(clamp(Number(c.risk.cooldownMs||0),0,600000));if(JSON.stringify(c)!==JSON.stringify(base))out.push(c)};
    add(c=>{c.risk.tradeFraction*=.85;c.risk.cooldownMs+=15000});
    add(c=>{c.risk.tradeFraction*=.70;c.risk.cooldownMs+=30000});
    if(stats.winRate!=null&&stats.winRate<.5)add(c=>{c.risk.tradeFraction*=.8;c.risk.cooldownMs+=60000});
    if(base.strategyName==='adaptive'){
      add(c=>{c.params.multiplier=Number(c.params.multiplier||1)*(market.averageVolatilityPct>.18?1.2:1.1);c.params.lookback=Number(c.params.lookback||20)+3});
    }else if(base.strategyName==='rsi'){
      add(c=>{c.params.oversold=Number(c.params.oversold||30)-2;c.params.overbought=Number(c.params.overbought||70)+2;c.params.period=Number(c.params.period||14)+1});
    }
    return out;
  }
  function status(){
    const active=state.versions.find(v=>v.id===state.activeVersionId)||state.versions.at(-1)||null;
    return{enabled:true,mode:'local-adaptive-optimizer',intervalMs:60000,activeVersion:active,pendingTrial:state.pendingTrial,lastAnalysis:state.lastAnalysis,proposals:state.proposals.slice(-10).reverse(),versions:state.versions.slice(-12).reverse(),analysisCount:state.analysisCount,safety:{userApprovalRequired:true,autoCodeRewrite:false,liveApplyAllowed:process.env.ALLOW_AI_LIVE_APPLY==='true',paperMode:!!(engine.state?.paperTrade??true),rollbackAvailable:true},tradeAnalysis:tradeStats(),marketAnalysis:marketStats(),currentConfig:current()};
  }
  function analyze(trigger='manual'){
    const base=clone(current()),ts=tradeStats(),ms=marketStats(),baseSim=simulate(base),list=candidates(base,ts,ms).map(config=>({config,simulation:simulate(config)})).filter(x=>x.simulation.samples>0).sort((a,b)=>score(b.simulation)-score(a.simulation));
    const best=list[0]; let proposal=null;
    if(baseSim.samples<60){
      state.lastAnalysis={at:new Date().toISOString(),trigger,status:'collecting-data',baselineSimulation:baseSim,reasons:[`Piaci minták gyűjtése folyamatban: ${baseSim.samples}/60.`]};
    }else if(best&&score(best.simulation)>score(baseSim)+.02&&!state.pendingTrial){
      const reasons=[];
      if(ts.winRate!=null&&ts.winRate<.5)reasons.push(`A lezárt tradek nyerési aránya ${(ts.winRate*100).toFixed(1)}%.`);
      if(ts.maxLossStreak>=2)reasons.push(`${ts.maxLossStreak} egymást követő vesztes lezárás miatt kisebb kockázatot vizsgálok.`);
      if(ms.regime==='SIDEWAYS')reasons.push('Oldalazó piacon a nagyobb cooldown csökkentheti a zajos belépéseket.');
      if(best.simulation.maxDrawdownPct<baseSim.maxDrawdownPct)reasons.push(`A szimulált drawdown ${baseSim.maxDrawdownPct.toFixed(2)}%-ról ${best.simulation.maxDrawdownPct.toFixed(2)}%-ra változott.`);
      proposal={id:'p_'+Date.now().toString(36),createdAt:new Date().toISOString(),status:'pending',trigger,strategyName:base.strategyName,currentConfig:base,candidateConfig:best.config,changes:diff(base,best.config),baselineSimulation:baseSim,candidateSimulation:best.simulation,reasons,confidence:Math.min(95,Math.round(55+baseSim.samples/25+ts.closedTrades))};
      state.proposals.push(proposal);
      state.lastAnalysis={at:new Date().toISOString(),trigger,status:'proposal-created',baselineSimulation:baseSim,bestSimulation:best.simulation,proposalId:proposal.id,reasons};
    }else{
      state.lastAnalysis={at:new Date().toISOString(),trigger,status:'no-change',baselineSimulation:baseSim,bestSimulation:best?.simulation||null,reasons:['Nincs elég megbízható javulás a jelenlegi konfigurációhoz képest.']};
    }
    state.analysisCount++; save(); return{analysis:state.lastAnalysis,proposal,status:status()};
  }

  router.get('/status',(q,r)=>r.json(status()));
  router.post('/analyze',(q,r)=>r.json(analyze('manual')));
  router.post('/proposals/:id/stage',(q,r)=>{
    try{
      if(state.pendingTrial)throw new Error('Már van aktív próbaverzió.');
      if(engine.state?.paperTrade===false&&process.env.ALLOW_AI_LIVE_APPLY!=='true')return r.status(403).json({error:'LIVE módban az AI alkalmazás alapból tiltott.'});
      const p=state.proposals.find(x=>x.id===q.params.id&&x.status==='pending'); if(!p)throw new Error('Javaslat nem található.');
      const previousConfig=clone(current());
      engine.applyTuningConfig(p.candidateConfig,{source:'ai-proposal:'+p.id});
      p.status='trial'; state.pendingTrial={proposalId:p.id,startedAt:new Date().toISOString(),previousConfig,candidateConfig:clone(p.candidateConfig),changes:clone(p.changes)}; save();
      r.json({success:true,status:status()});
    }catch(e){r.status(400).json({error:e.message})}
  });
  router.post('/proposals/:id/reject',(q,r)=>{const p=state.proposals.find(x=>x.id===q.params.id);if(!p)return r.status(404).json({error:'Javaslat nem található'});p.status='rejected';save();r.json({success:true,status:status()})});
  router.post('/trial/save',(q,r)=>{
    try{
      if(!state.pendingTrial)throw new Error('Nincs menthető próbaverzió.');
      const id=`v${state.versions.length+1}-ai-${Date.now().toString(36).slice(-5)}`;
      state.versions.push({id,label:`AI ${state.versions.length+1}`,createdAt:new Date().toISOString(),source:'ai-approved',proposalId:state.pendingTrial.proposalId,config:clone(current())});
      state.activeVersionId=id; state.pendingTrial=null; save(); r.json({success:true,status:status()});
    }catch(e){r.status(400).json({error:e.message})}
  });
  router.post('/trial/discard',(q,r)=>{
    try{if(!state.pendingTrial)throw new Error('Nincs visszavonható próbaverzió.');engine.applyTuningConfig(state.pendingTrial.previousConfig,{source:'ai-trial-discard'});state.pendingTrial=null;save();r.json({success:true,status:status()})}catch(e){r.status(400).json({error:e.message})}
  });
  router.post('/versions/:id/rollback',(q,r)=>{
    try{if(state.pendingTrial)throw new Error('Aktív próbaverzió mellett előbb ments vagy vonj vissza.');const v=state.versions.find(x=>x.id===q.params.id);if(!v)throw new Error('Verzió nem található.');engine.applyTuningConfig(v.config,{source:'rollback:'+v.id});state.activeVersionId=v.id;save();r.json({success:true,status:status()})}catch(e){r.status(400).json({error:e.message})}
  });

  return{
    router,
    start(){if(!timer){timer=setInterval(()=>{try{analyze('scheduled')}catch(e){console.error('[AI-LAB]',e.message)}},60000);timer.unref?.()}},
    stop(){if(timer)clearInterval(timer);timer=null},
    analyze,
    status,
  };
};