type Point = [number, number];
type Kind = 'meteor' | 'dust' | 'asteroid' | 'satellite' | 'comet' | 'ship';
type Flight = { kind: Kind; model: number; start: number; duration: number; from: Point; to: Point; size: number; bend: number };

// Fifteen distinct hull profiles, facing right, in normalized canvas coordinates.
export const hulls: Point[][] = [
  [[1,0],[-.7,-.65],[-.35,0],[-.7,.65]],
  [[1,0],[.1,-.2],[-.2,-.85],[-.8,-.85],[-.55,0],[-.8,.85],[-.2,.85],[.1,.2]],
  [[1,0],[.4,-.35],[-1,-.35],[-.7,0],[-1,.35],[.4,.35]],
  [[.8,0],[.35,-.8],[-.35,-.8],[-.85,0],[-.35,.8],[.35,.8]],
  [[1,-.15],[-.2,-.15],[-.6,-.7],[-1,-.7],[-.7,0],[-1,.7],[-.6,.7],[-.2,.15],[1,.15]],
  [[1,0],[.3,-.2],[.2,-.65],[-.2,-.65],[-.2,-.25],[-.9,-.25],[-.9,.25],[-.2,.25],[-.2,.65],[.2,.65],[.3,.2]],
  [[.9,0],[-.6,-1],[-.25,-.2],[-.8,0],[-.25,.2],[-.6,1]],
  [[1,0],[.3,-.45],[-.8,-.45],[-1,-.15],[-1,.15],[-.8,.45],[.3,.45]],
  [[.9,-.45],[-.7,-.55],[-.9,-.2],[.3,0],[-.9,.2],[-.7,.55],[.9,.45],[.5,0]],
  [[1,0],[.1,-.15],[-.45,-.9],[-.7,-.9],[-.5,-.15],[-1,0],[-.5,.15],[-.7,.9],[-.45,.9],[.1,.15]],
  [[.8,0],[.6,-.5],[-.1,-.75],[-.8,-.45],[-.8,.45],[-.1,.75],[.6,.5]],
  [[1,0],[.5,-.15],[.3,-.8],[-.1,-.8],[-.3,-.15],[-1,-.35],[-.65,0],[-1,.35],[-.3,.15],[-.1,.8],[.3,.8],[.5,.15]],
  [[1,0],[-.1,-.25],[-.3,-.5],[-.9,-.5],[-.9,-.1],[-.4,0],[-.9,.1],[-.9,.5],[-.3,.5],[-.1,.25]],
  [[.75,0],[.3,-.3],[.6,-.75],[-.6,-.75],[-.8,0],[-.6,.75],[.6,.75],[.3,.3]],
  [[1,0],[.4,-.1],[.2,-.35],[-.2,-.35],[-.5,-.65],[-1,-.65],[-.8,0],[-1,.65],[-.5,.65],[-.2,.35],[.2,.35],[.4,.1]],
];

export function randomDelay(rng = Math.random) {
  return 7 - Math.log(1 - Math.min(rng(), 1 - Number.EPSILON)) * 16;
}
export function pickKind(value: number): Kind {
  return value < .35 ? 'meteor' : value < .60 ? 'dust' : value < .8 ? 'asteroid' : value < .93 ? 'satellite' : value < .985 ? 'comet' : 'ship';
}
export function createTraffic(rng = Math.random) {
  let due = randomDelay(rng), active: Flight | null = null;
  let bag: number[] = [], previous = -1;
  const nextModel = () => {
    if (!bag.length) {
      bag = hulls.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    previous = bag.pop()!;
    return previous;
  };
  const spawn = (kind: Kind, now: number) => {
    const edge = Math.floor(rng() * 4);
    const point = (side: number): Point => {
      const p = .12 + rng() * .76;
      return side === 0 ? [.08,p] : side === 1 ? [.92,p] : side === 2 ? [p,.12] : [p,.88];
    };
    active = { kind, model: kind === 'ship' ? nextModel() : 0, start: now,
      duration: kind === 'meteor' ? 2 + rng() * 2 : 8 + rng() * 7,
      from: point(edge), to: point(edge ^ 1), size: .7 + rng() * .5, bend: (rng() - .5) * .18 };
    return active;
  };
  return {
    summon(now: number) {
      // Ignore repeat requests during a flight; never stack bright effects.
      if (active?.kind === 'ship' && now < active.start + active.duration) return null;
      return spawn('ship', now);
    },
    reset() { active = null; due = randomDelay(rng); },
    tick(now: number) {
      if (active && now >= active.start + active.duration) { active = null; due = now + randomDelay(rng); }
      if (!active && now >= due) spawn(pickKind(rng()), now);
      return active;
    },
  };
}

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

export function drawTraffic(ctx: CanvasRenderingContext2D, flight: Flight, now: number, width: number, height: number) {
  const t = Math.max(0, Math.min(1, (now - flight.start) / flight.duration));
  const {from,to,kind} = flight;
  const x = (from[0] + (to[0]-from[0])*t) * width;
  const y = (from[1] + (to[1]-from[1])*t + Math.sin(t*Math.PI)*flight.bend) * height;
  const angle = Math.atan2((to[1]-from[1]+Math.cos(t*Math.PI)*flight.bend*Math.PI)*height,(to[0]-from[0])*width);
  const fade = Math.min(1,t*7,(1-t)*7);
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = fade * (kind === 'ship' ? .85 : .5);
  if (kind === 'ship') {
    const size = Math.min(19,width*.035)*flight.size;
    const hue = [190,210,265,165,35][flight.model%5];
    // A localized warp aperture and engine bloom, never a full-screen flash.
    const warp = Math.max(0,1-t*7,(t-.86)/.14);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `hsla(${hue},90%,75%,${warp*.65})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0,0,3+warp*8,8+warp*22,0,0,Math.PI*2); ctx.stroke();
    const bloom = ctx.createRadialGradient(-size,0,0,-size,0,size*2.5);
    bloom.addColorStop(0,`hsla(${hue},100%,80%,.6)`); bloom.addColorStop(1,`hsla(${hue},100%,60%,0)`);
    ctx.fillStyle=bloom;ctx.fillRect(-size*3.5,-size*2.5,size*5,size*5);
    ctx.restore();
    ctx.scale(size,size);
    ctx.fillStyle = '#657c90'; ctx.strokeStyle = '#c2d6e5'; ctx.lineWidth = .055;
    polygon(ctx,hulls[flight.model]);
    ctx.fillStyle = `hsl(${hue},85%,75%)`;ctx.fillRect(-.2,-.07,.65,.14);
    ctx.fillStyle = '#ddf5ff';ctx.fillRect(-.72,-.12,.12,.24);
  } else if (kind === 'satellite') {
    ctx.rotate(.3);ctx.fillStyle='#7291ab';ctx.fillRect(-3,-2,6,4);
    ctx.fillStyle='#365571';ctx.strokeStyle='#9cb5cb';ctx.lineWidth=.6;
    for (const sy of [-10,4]) {ctx.fillRect(-5,sy,10,6);ctx.strokeRect(-5,sy,10,6);}
    ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();
  } else if (kind === 'asteroid') {
    ctx.rotate(t*3);ctx.scale(5*flight.size,5*flight.size);
    ctx.fillStyle='#5b6269';ctx.strokeStyle='#a5adb2';ctx.lineWidth=.12;
    polygon(ctx,[[1,0],[.5,-.8],[-.4,-.65],[-1,-.1],[-.65,.65],[.2,.9]]);
  } else if (kind === 'dust') {
    ctx.fillStyle='#b0cddd';
    for(let i=0;i<7;i++){ctx.globalAlpha=fade*(.15+i*.025);ctx.fillRect(-i*5,Math.sin(i*2.4)*7,1,1);}
  } else {
    const length = kind === 'comet' ? 55 : 32;
    const tail=ctx.createLinearGradient(-length,0,0,0);
    tail.addColorStop(0,'rgba(130,190,230,0)');tail.addColorStop(1,'rgba(210,239,255,.9)');
    ctx.strokeStyle=tail;ctx.lineWidth=kind==='comet'?1.8:.8;
    ctx.beginPath();ctx.moveTo(-length,0);ctx.lineTo(0,0);ctx.stroke();
    ctx.fillStyle='#deefff';ctx.beginPath();ctx.arc(0,0,kind==='comet'?1.4:.8,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
