type Model = { name: string; drive: 'chemical' | 'ion' | 'coast'; scale: number; nozzle: [number, number] };
export const shipModels: Model[] = [
  {name:'Crew capsule',drive:'chemical',scale:.9,nozzle:[-.3,0]},
  {name:'Lunar tug',drive:'chemical',scale:1,nozzle:[-.3,0]},
  {name:'Cargo tanker',drive:'chemical',scale:1.1,nozzle:[-.3,0]},
  {name:'Deep-space ion probe',drive:'ion',scale:.95,nozzle:[-.3,0]},
  {name:'Sample return',drive:'coast',scale:.9,nozzle:[-.3,0]},
  {name:'Habitat transport',drive:'coast',scale:1.1,nozzle:[-.3,0]},
  {name:'Radio research probe',drive:'coast',scale:1,nozzle:[-.3,0]},
  {name:'Modular freighter',drive:'chemical',scale:1.1,nozzle:[-.3,0]},
  {name:'Solar observatory',drive:'coast',scale:1,nozzle:[-.3,0]},
  {name:'Robotic surveyor',drive:'ion',scale:.9,nozzle:[-.3,0]},
  {name:'Fuel depot tug',drive:'chemical',scale:1.05,nozzle:[-.3,0]},
  {name:'Electric transfer craft',drive:'ion',scale:1.1,nozzle:[-.3,0]},
  {name:'Ice survey probe',drive:'coast',scale:.9,nozzle:[-.3,0]},
  {name:'Orbital maintenance craft',drive:'coast',scale:.95,nozzle:[-.3,0]},
  {name:'Crew exploration transport',drive:'coast',scale:1.15,nozzle:[-.3,0]},
];
// Per-row crop boundaries preserve extended radiators and antenna booms.
const columns=[[0,320,665,990,1330,1619],[0,330,655,995,1325,1619],[0,315,685,990,1240,1619]];
const rows=[[20,310],[325,615],[635,910]];
const outlets=[[24,155],[344,135],[680,158],[1047,174],[1362,167],[20,455],[359,468],[682,470],[1025,466],[1359,480],[18,764],[333,765],[710,766],[1014,770],[1260,745]];
shipModels.forEach((model,i)=>{
  const row=Math.floor(i/5), col=i%5;
  const left=columns[row][col],right=columns[row][col+1];
  const [top,bottom]=rows[row];
  model.nozzle=[(outlets[i][0]-(left+right)/2)/(right-left),(outlets[i][1]-(top+bottom)/2)/(right-left)];
});
export type ShipAtlas = { image: HTMLImageElement; ready: boolean };
export function loadShipAtlas(): ShipAtlas {
  const image=new Image();
  const atlas={image,ready:false};
  image.decoding='async';
  image.onload=()=>{atlas.ready=image.naturalWidth>0;};
  image.onerror=()=>{atlas.ready=false;};
  image.src='/ships/fleet-scientific.png';
  return atlas;
}
// Slow, bounded exposure variation, without oscillating flashes.
export function flightLighting(t: number, angle: number, screenX: number) {
  const progress=Math.max(0,Math.min(1,t));
  const envelope=Math.sin(Math.PI*progress)**2;
  const incidence=.5+.5*Math.cos(angle+.65);
  const sweep=.5+.5*Math.sin(Math.max(0,Math.min(1,screenX))*Math.PI);
  return {exposure:.48+envelope*(.22+.16*incidence+.12*sweep),halo:envelope*(.012+.016*incidence)};
}
export function renderShip(ctx: CanvasRenderingContext2D, atlas: ShipAtlas | undefined, modelIndex: number, t: number, _now: number, width: number, variation: number, angle=0, screenX=.5) {
  if(!atlas?.ready)return;
  const model=shipModels[modelIndex];
  const size=Math.min(138,Math.max(82,width*.1))*model.scale*(.9+variation*.12);
  const light=flightLighting(t,angle,screenX);
  ctx.save();
  // Subtle optical bloom behind DTP, not simulated scattering in vacuum.
  const radius=Math.min(260,size*2.1);
  ctx.globalCompositeOperation='screen';
  const glow=ctx.createRadialGradient(-size*.15,-size*.16,size*.2,0,0,radius);
  glow.addColorStop(0,`rgba(213,225,237,${light.halo})`);
  glow.addColorStop(.45,`rgba(186,204,224,${light.halo*.35})`);
  glow.addColorStop(1,'rgba(186,204,224,0)');
  ctx.fillStyle=glow;ctx.fillRect(-radius,-radius,radius*2,radius*2);
  // Most craft coast; ion emission is faint and chemical burns are brief.
  const burn=model.drive==='ion'?.15:model.drive==='chemical'?Math.max(0,1-t/.16)*.3:0;
  if(burn>0){
    const [nx,ny]=model.nozzle;
    const x=nx*size,y=ny*size;
    const length=size*(model.drive==='ion'?.18:.12);
    const plume=ctx.createLinearGradient(x-length,y,x,y);
    const color=model.drive==='ion'?'165,191,225':'231,217,194';
    plume.addColorStop(0,`rgba(${color},0)`);
    plume.addColorStop(.7,`rgba(${color},${burn*.35})`);
    plume.addColorStop(1,`rgba(${color},${burn})`);
    ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(x,y-1);
    ctx.lineTo(x-length,y-2);ctx.lineTo(x-length,y+2);ctx.lineTo(x,y+1);ctx.fill();
  }
  const row=Math.floor(modelIndex/5),col=modelIndex%5;
  const sx=atlas.image.naturalWidth/1619,sy=atlas.image.naturalHeight/971;
  const left=columns[row][col],right=columns[row][col+1];
  const [top,bottom]=rows[row];
  const cellW=(right-left)*sx,cellH=(bottom-top)*sy;
  const displayH=size*cellH/cellW;
  ctx.globalAlpha*=light.exposure;
  ctx.drawImage(atlas.image,left*sx,top*sy,cellW,cellH,-size/2,-displayH/2,size,displayH);
  ctx.restore();
}
