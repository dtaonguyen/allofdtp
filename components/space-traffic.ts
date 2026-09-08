type Point = [number, number];
type Kind = 'meteor' | 'dust' | 'asteroid' | 'satellite' | 'comet' | 'ship';
type Flight = { kind: Kind; model: number; start: number; duration: number; from: Point; to: Point; size: number; bend: number };

export const SHIP_COUNT = 15;
type ShipPainter = (ctx: CanvasRenderingContext2D, model: number, t: number, now: number, width: number, size: number, angle: number, screenX: number) => void;

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
      bag = Array.from({ length: SHIP_COUNT }, (_, i) => i);
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

export function drawTraffic(ctx: CanvasRenderingContext2D, flight: Flight, now: number, width: number, height: number, paintShip?: ShipPainter) {
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
    paintShip?.(ctx, flight.model, t, now, width, flight.size, angle, x/Math.max(1,width));
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
