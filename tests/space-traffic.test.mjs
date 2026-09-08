import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraffic, hulls, pickKind, randomDelay, drawTraffic } from '../components/space-traffic.ts';

test('15 distinct silhouettes and randomized unbounded intervals', () => {
  assert.equal(hulls.length,15);
  assert.equal(new Set(hulls.map(JSON.stringify)).size,15);
  assert.ok(randomDelay(()=>.9)>randomDelay(()=>.1));
  assert.ok(Number.isFinite(randomDelay(()=>1)));
});
test('spaceships are the rarest ambient category', () => {
  const counts={};
  for(let i=0;i<10000;i++){const k=pickKind(i/10000);counts[k]=(counts[k]||0)+1;}
  for(const [kind,count] of Object.entries(counts)) if(kind!=='ship') assert.ok(count>counts.ship);
});
test('summoning visits all 15 models without repetition; holding cannot stack ships',()=>{
  const traffic=createTraffic(()=>.42);
  const seen=[];
  for(let i=0;i<30;i++) {
    const flight=traffic.summon(i*30);
    seen.push(flight.model);
    assert.equal(traffic.summon(i*30+.1),null);
    if(i) assert.notEqual(seen[i],seen[i-1]);
  }
  assert.equal(new Set(seen.slice(0,15)).size,15);
  assert.equal(new Set(seen.slice(15)).size,15);
});
test('all entry edges reachable and normalized paths remain bounded',()=>{
  const edges=new Set();
  for(const value of [.01,.3,.55,.8]){
    const flight=createTraffic(()=>value).summon(0);
    edges.add(flight.from.join(','));
    for(const p of [flight.from,flight.to]) for(const n of p) assert.ok(n>=0&&n<=1);
  }
  assert.equal(edges.size,4);
});
test('renderer balances canvas state for every object, including tiny viewport',()=>{
  let depth=0;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(_,key)=>key==='save'?()=>depth++:key==='restore'?()=>depth--:key==='createRadialGradient'||key==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
  for(const kind of ['ship','meteor','dust','asteroid','satellite','comet']){
    for(let model=0;model<15;model++)for(const time of [0,1,5,9.9]){
      drawTraffic(ctx,{kind,model,start:0,duration:10,from:[.1,.1],to:[.9,.9],size:1,bend:.1},time,320,280);
      assert.equal(depth,0);
    }
  }
});
