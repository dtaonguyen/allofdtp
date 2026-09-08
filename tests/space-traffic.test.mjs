import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraffic, SHIP_COUNT, pickKind, randomDelay, drawTraffic } from '../components/space-traffic.ts';
import { shipModels, renderShip, flightLighting } from '../components/ship-renderer.ts';

test('15 distinct silhouettes and randomized unbounded intervals', () => {
  assert.equal(SHIP_COUNT,15);
  assert.equal(shipModels.length,15);
  assert.equal(new Set(shipModels.map(m=>m.name)).size,15);
  assert.ok(randomDelay(()=>.9)>randomDelay(()=>.1));
  assert.ok(Number.isFinite(randomDelay(()=>1)));
});

test('lighting is subtle, continuous, position-dependent and fades at both ends',()=>{
  for(const angle of [-Math.PI,-1,0,1,Math.PI]){
    let previous=flightLighting(0,angle,.5);
    for(let i=0;i<=1000;i++){
      const light=flightLighting(i/1000,angle,i/1000);
      assert.ok(light.halo>=0&&light.halo<=.1801);
      assert.ok(light.exposure>=.58&&light.exposure<=1);
      assert.ok(Math.abs(light.halo-previous.halo)<.002);
      previous=light;
    }
    assert.ok(flightLighting(1,angle,.5).halo<1e-10);
  }
  assert.notEqual(flightLighting(.5,0,0).exposure,flightLighting(.5,0,.5).exposure);
  assert.notEqual(flightLighting(.5,0,.5).halo,flightLighting(.5,Math.PI,.5).halo);
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
      drawTraffic(ctx,{kind,model,start:0,duration:10,from:[.1,.1],to:[.9,.9],size:1,bend:.1},time,320,280,
        (c,m,t,n,w,s)=>renderShip(c,{ready:true,image:{naturalWidth:1500,naturalHeight:900}},m,t,n,w,s));
      assert.equal(depth,0);
    }
  }
});

test('each ship samples its own atlas cell; missing image is safe',()=>{
  const samples=[];
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(_,key)=>key==='drawImage'?(...args)=>samples.push(args):key==='createRadialGradient'||key==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
  renderShip(ctx,undefined,0,.5,5,1200,1);
  renderShip(ctx,{ready:false,image:{}},0,.5,5,1200,1);
  assert.equal(samples.length,0);
  const image={naturalWidth:1500,naturalHeight:900};
  for(let i=0;i<15;i++)renderShip(ctx,{ready:true,image},i,.5,5,1200,1);
  assert.equal(samples.length,15);
  assert.equal(new Set(samples.map(a=>a.slice(1,3).join(','))).size,15);
  for(const [,x,y,w,h] of samples){assert.ok(x>=0&&y>=0&&x+w<=1500&&y+h<=900);}
});
