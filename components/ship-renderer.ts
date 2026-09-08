type Engine = readonly [number, number, number];
// Measured source-pixel crop bounds and exhaust outlets of the generated atlas.
const columns = [0,330,642,970,1273,1619];
const rows = [[40,310],[320,610],[615,905]];
const ports: Engine[][] = [
  [[38,143,5],[38,178,5],[38,212,5]],
  [[360,111,6],[388,178,3],[360,246,6]],
  [[672,141,5],[672,179,5],[672,216,5]],
  [[977,165,5],[977,195,5]],
  [[1295,138,5],[1295,178,5],[1295,217,5]],
  [[49,443,5],[49,493,5]],
  [[344,426,5],[344,510,5]],
  [[655,420,4],[655,454,4],[655,482,4],[655,518,4]],
  [[988,456,4],[988,482,4]],
  [[1298,445,5],[1298,492,5]],
  [[38,725,5],[38,758,5],[38,791,5]],
  [[373,728,5],[373,786,5]],
  [[672,719,5],[672,756,5],[672,791,5]],
  [[1002,740,5],[1002,776,5]],
  [[1286,700,5],[1286,739,5],[1286,777,5],[1286,815,5]],
];
export const shipModels: { name: string; hue: number; engines: readonly Engine[]; drive: 'ion' | 'plasma' | 'pulse'; scale: number }[] = [
  { name: 'Astra', hue: 190, engines: [[-.30,0,.055]], drive: 'ion', scale: .9 },
  { name: 'Vanguard', hue: 205, engines: [[-.29,-.13,.04],[-.29,.13,.04]], drive: 'ion', scale: 1 },
  { name: 'Spectre', hue: 275, engines: [[-.25,-.10,.035],[-.25,.10,.035]], drive: 'pulse', scale: 1 },
  { name: 'Halo', hue: 165, engines: [[-.28,0,.07]], drive: 'pulse', scale: 1 },
  { name: 'Titan', hue: 32, engines: [[-.31,-.12,.04],[-.31,0,.05],[-.31,.12,.04]], drive: 'plasma', scale: 1.15 },
  { name: 'Aurora', hue: 185, engines: [[-.3,-.15,.045],[-.3,.15,.045]], drive: 'ion', scale: 1 },
  { name: 'Obsidian', hue: 300, engines: [[-.25,0,.06]], drive: 'pulse', scale: .95 },
  { name: 'Solaris', hue: 40, engines: [[-.3,-.08,.035],[-.3,.08,.035]], drive: 'plasma', scale: 1 },
  { name: 'Leviathan', hue: 210, engines: [[-.31,-.15,.035],[-.31,-.05,.035],[-.31,.05,.035],[-.31,.15,.035]], drive: 'ion', scale: 1.15 },
  { name: 'Kestrel', hue: 170, engines: [[-.3,0,.05]], drive: 'ion', scale: .9 },
  { name: 'Mirage', hue: 260, engines: [[-.25,-.12,.04],[-.25,.12,.04]], drive: 'pulse', scale: 1 },
  { name: 'Nomad', hue: 25, engines: [[-.30,-.10,.045],[-.30,.10,.045]], drive: 'plasma', scale: 1.05 },
  { name: 'Pulsar', hue: 195, engines: [[-.3,0,.065]], drive: 'pulse', scale: .95 },
  { name: 'Seraph', hue: 155, engines: [[-.26,-.18,.03],[-.26,.18,.03]], drive: 'ion', scale: 1.05 },
  { name: 'Eclipse', hue: 285, engines: [[-.3,-.1,.04],[-.3,0,.04],[-.3,.1,.04]], drive: 'plasma', scale: 1.1 },
];
const engineHues = [190,195,275,190,27,38,185,28,38,275,28,135,0,190,28];
shipModels.forEach((model,i) => {
  const left=columns[i%5], right=columns[i%5+1];
  const [top,bottom]=rows[Math.floor(i/5)];
  model.hue=engineHues[i];
  model.engines=ports[i].map(([x,y,r])=>[(x-(left+right)/2)/(right-left),(y-(top+bottom)/2)/(right-left),r/(right-left)] as const);
});

// Kept in the scene effect, not module scope: safe during server rendering.
export type ShipAtlas = { image: HTMLImageElement; ready: boolean };
export function loadShipAtlas(): ShipAtlas {
  const image = new Image();
  const atlas = { image, ready: false };
  image.decoding = 'async';
  image.onload = () => { atlas.ready = image.naturalWidth > 0; };
  image.onerror = () => { atlas.ready = false; };
  image.src = '/ships/fleet-cinematic.png';
  return atlas;
}

export function renderShip(ctx: CanvasRenderingContext2D, atlas: ShipAtlas | undefined, modelIndex: number, t: number, now: number, width: number, variation: number) {
  if (!atlas?.ready) return;
  const model = shipModels[modelIndex];
  const size = Math.min(134, Math.max(78, width*.095))*model.scale*(.9+variation*.12);
  const hue = model.hue;
  const entry = Math.max(0,1-t/.16);
  const exit = Math.max(0,(t-.84)/.16);
  const warp = Math.max(entry,exit);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Expanding lens, chromatic arcs and drifting sparks stay local to the hull.
  if (warp > 0) {
    const radius = size*(.22+(1-warp)*.2);
    for(let ring=0;ring<3;ring++) {
      ctx.strokeStyle=`hsla(${hue+ring*16},95%,${75+ring*7}%,${warp*.45/(ring+1)})`;
      ctx.lineWidth=1.5-ring*.35;
      ctx.beginPath();ctx.ellipse(0,0,radius*.22+ring*2,radius+ring*5,0,now*.7+ring,now*.7+ring+Math.PI*1.65);ctx.stroke();
    }
    const lens=ctx.createRadialGradient(0,0,0,0,0,radius*1.8);
    lens.addColorStop(0,`hsla(${hue},90%,85%,${warp*.32})`);
    lens.addColorStop(.3,`hsla(${hue},95%,60%,${warp*.1})`);
    lens.addColorStop(1,`hsla(${hue},95%,60%,0)`);
    ctx.fillStyle=lens;ctx.fillRect(-radius*2,-radius*2,radius*4,radius*4);
    for(let i=0;i<12;i++) {
      const a=i*2.399+modelIndex;
      const r=radius*(1+(1-warp)*.8);
      ctx.fillStyle=`hsla(${hue},90%,85%,${warp*.6})`;
      ctx.fillRect(Math.cos(a)*r*.4,Math.sin(a)*r,1.2,1.2);
    }
  }
  for (const [ex,ey,aperture] of model.engines) {
    const x=ex*size, y=ey*size, nozzle=aperture*size;
    const pulse=1+Math.sin(now*(model.drive==='pulse'?7:13)+ey*30)*.09;
    const length=size*(model.drive==='ion'?.4:model.drive==='plasma'?.3:.22)*pulse*(1+exit*2);
    const plume=ctx.createLinearGradient(x-length,y,x,y);
    plume.addColorStop(0,`hsla(${hue},95%,55%,0)`);
    plume.addColorStop(.5,`hsla(${hue},95%,60%,.18)`);
    plume.addColorStop(.88,`hsla(${hue},100%,75%,.65)`);
    plume.addColorStop(1,'rgba(235,250,255,.95)');
    ctx.fillStyle=plume;
    ctx.beginPath();ctx.moveTo(x,y-nozzle);
    ctx.bezierCurveTo(x-length*.35,y-nozzle*.6,x-length*.8,y-nozzle*.2,x-length,y);
    ctx.bezierCurveTo(x-length*.8,y+nozzle*.2,x-length*.35,y+nozzle*.6,x,y+nozzle);ctx.fill();
    const bloom=ctx.createRadialGradient(x,y,0,x,y,nozzle*4);
    bloom.addColorStop(0,'rgba(240,252,255,.9)');
    bloom.addColorStop(.18,`hsla(${hue},100%,75%,.7)`);
    bloom.addColorStop(1,`hsla(${hue},100%,60%,0)`);
    ctx.fillStyle=bloom;ctx.fillRect(x-nozzle*4,y-nozzle*4,nozzle*8,nozzle*8);
    if(model.drive !== 'ion') for(let i=1;i<5;i++) {
      const travel=((now*(model.drive==='pulse'?2:4)+i/5)%1);
      ctx.strokeStyle=`hsla(${hue},95%,85%,${(1-travel)*.3})`;
      ctx.lineWidth=.7;ctx.beginPath();
      ctx.ellipse(x-length*travel,y,1,nozzle*(1-travel)*.7,0,0,Math.PI*2);ctx.stroke();
    }
  }
  // Black-backed cinematic atlas: screen removes black without cutting off bloom.
  ctx.globalCompositeOperation='screen';
  const sourceScaleX=atlas.image.naturalWidth/1619, sourceScaleY=atlas.image.naturalHeight/971;
  const left=columns[modelIndex%5], right=columns[modelIndex%5+1];
  const [top,bottom]=rows[Math.floor(modelIndex/5)];
  const cellW=(right-left)*sourceScaleX, cellH=(bottom-top)*sourceScaleY;
  const displayH=size*cellH/cellW;
  ctx.drawImage(atlas.image,left*sourceScaleX,top*sourceScaleY,cellW,cellH,-size/2,-displayH/2,size,displayH);
  ctx.restore();
}
