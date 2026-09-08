import sharp from 'sharp';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const input=new URL('../public/ships/fleet-scientific.png',import.meta.url);
const output=new URL('../public/ships/fleet-scientific-alpha.png',import.meta.url);
const {data,info}=await sharp(fileURLToPath(input)).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:w,height:h,channels:c}=info;
// Flood only near-black pixels reachable from empty space; retain enclosed dark hardware.
const mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
const dark=i=>Math.max(data[i*c],data[i*c+1],data[i*c+2])<=6;
function seed(i){if(!mask[i]&&dark(i)){mask[i]=1;queue[tail++]=i;}}
for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}
for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
while(head<tail){const i=queue[head++],x=i%w;if(x)seed(i-1);if(x<w-1)seed(i+1);if(i>=w)seed(i-w);if(i<w*(h-1))seed(i+w);}
const rgba=Buffer.alloc(w*h*4);let transparent=0,soft=0;
for(let i=0;i<w*h;i++){
  const x=i%w,y=Math.floor(i/w);let edge=false;
  for(let dy=-1;dy<=1&&!edge;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&mask[i+dy*w+dx])edge=true;
  const peak=Math.max(data[i*c],data[i*c+1],data[i*c+2]);
  const alpha=mask[i]?0:edge?Math.min(1,Math.max(0,(peak-6)/22)):1;
  rgba[i*4+3]=Math.round(alpha*255);
  for(let k=0;k<3;k++)rgba[i*4+k]=alpha?Math.min(255,Math.round(data[i*c+k]/alpha)):0;
  if(!alpha)transparent++;else if(alpha<1)soft++;
}
await sharp(rgba,{raw:{width:w,height:h,channels:4}}).png().toFile(fileURLToPath(output));
const check=await sharp(fileURLToPath(output)).metadata();
assert.equal(check.hasAlpha,true);assert.ok(transparent>w*h*.5);assert.ok(soft>0);
const preview=fileURLToPath(new URL('../public/ships/alpha-proof.png',import.meta.url));
await sharp({create:{width:w,height:h,channels:4,background:'#667b90'}}).composite([{input:rgba,raw:{width:w,height:h,channels:4}}]).png().toFile(preview);
console.log({width:w,height:h,transparent,soft,hasAlpha:check.hasAlpha});
