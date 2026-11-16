// Shot plan for "The Emu War" — timed to voice.mp3 (63.24 s, 30 fps, 1897 frames).
import { M, clamp, lerp, lerp3, ramp, camFromKeys, idle, blinkAt, q } from './motion.js';
export const FPS = 30, TOTAL = 1897, DECK = 0;
export const SHOTS = [
  { id: 'hook', a: 0, b: 129, light: 'day' }, { id: 'lost', a: 130, b: 188, light: 'day' }, { id: 'wa', a: 189, b: 234, light: 'day' },
  { id: 'vets', a: 235, b: 369, light: 'day' }, { id: 'march', a: 370, b: 539, light: 'day' }, { id: 'beg', a: 540, b: 598, light: 'day' },
  { id: 'major', a: 599, b: 671, light: 'day' }, { id: 'two', a: 672, b: 701, light: 'day' }, { id: 'guns', a: 702, b: 731, light: 'day' },
  { id: 'bullets', a: 732, b: 791, light: 'day' }, { id: 'plan', a: 792, b: 883, light: 'day' }, { id: 'fire', a: 884, b: 941, light: 'day' },
  { id: 'scatter', a: 942, b: 1079, light: 'day' }, { id: 'chase', a: 1080, b: 1175, light: 'day' }, { id: 'tmount', a: 1176, b: 1261, light: 'day' },
  { id: 'bumpy', a: 1262, b: 1352, light: 'day' }, { id: 'keepup', a: 1353, b: 1412, light: 'day' }, { id: 'weeks', a: 1413, b: 1450, light: 'day' },
  { id: 'news', a: 1451, b: 1505, light: 'day' }, { id: 'pols', a: 1506, b: 1577, light: 'day' }, { id: 'packup', a: 1578, b: 1682, light: 'golden' },
  { id: 'imp', a: 1683, b: 1753, light: 'golden' }, { id: 'score', a: 1754, b: 1896, light: 'golden' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
export const smooth = M.smooth;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const LIGHTS = {
  day: { az: 120, el: 52, sky: '#bcd4ee', ground: '#a07a48', hemi: 1.12, sun: '#fff0d0', sunI: 2.6, fog: '#ecdcc0', fogNear: 90, fogFar: 900,
    skyTop: '#3f86df', skyHor: '#d3e6f4', sat: 1.12, waterDeep: '#2c6c8c', waterShal: '#5aaec4', glint: '#effaff', vig: 0.2, shadowExt: 22 },
  golden: { az: 8, el: 11, sky: '#9a90c8', ground: '#7a5440', hemi: 1.0, sun: '#ffb46c', sunI: 2.9, fog: '#f0b88c', fogNear: 60, fogFar: 760,
    skyTop: '#6f6eb0', skyHor: '#ffc27e', sunDisc: '#fff0c8', sunSize: 0.0035, sat: 1.12, gain: '#fff2e2', waterDeep: '#3d5a86', waterShal: '#d99a6e', glint: '#ffe2a8', vig: 0.26, shadowExt: 22 },
};
export const lightFor = (S, f) => { const L = { ...LIGHTS[S.light] }; if (S.id === 'scatter' || S.id === 'march') L.shadowExt = 40; return L; };

// ---------- cameras ----------
const CAMS = {
  hook: [{ f: 0, pos: [0.25, 1.5, 4.0], look: [0.3, 1.4, 0], fov: 34 }, { f: 40, pos: [0.3, 1.5, 4.2], look: [0.3, 1.4, 0], fov: 34 }, { f: 80, pos: [1.2, 1.9, 9.5], look: [0.8, 1.3, -1], fov: 38 }, { f: 129, pos: [1.9, 2.1, 11.5], look: [0.9, 1.3, -2], fov: 40 }],
  lost: [{ f: 130, pos: [0, 1.5, 6.2], look: [0, 1.35, 0], fov: 38 }, { f: 188, pos: [0.2, 1.55, 5.2], look: [0.2, 1.4, 0], fov: 36 }],
  wa: [{ f: 189, pos: [-1.6, 1.6, 12], look: [-1.6, 1.7, 7.5], fov: 36 }, { f: 212, pos: [-1.6, 1.8, 12], look: [-1.6, 1.8, 7.5], fov: 36 }, { f: 234, pos: [-1, 2.8, 12], look: [-6, 2.6, -30], fov: 46 }],
  vets: [{ f: 235, pos: [-2.4, 1.5, -8.5], look: [-1.4, 1.4, -15.5], fov: 44 }, { f: 300, pos: [-0.8, 1.6, -8], look: [-1.4, 1.4, -15.5], fov: 44 }, { f: 369, pos: [6, 3.8, -2], look: [-1.5, 1.2, -17], fov: 50 }],
  march: [{ f: 370, pos: [4.5, 1.3, -4], look: [0.5, 1.2, -16], fov: 38 }, { f: 539, pos: [-3, 1.7, -3.5], look: [-1, 1.2, -16], fov: 40 }],
  beg: [{ f: 540, pos: [0, 1.5, 2.8], look: [0, 1.3, -3.5], fov: 38 }, { f: 598, pos: [0, 1.4, 2.1], look: [0, 1.3, -3.5], fov: 36 }],
  major: [{ f: 599, pos: [0, 1.5, 4.4], look: [0, 1.35, 0], fov: 32 }, { f: 671, pos: [0, 1.5, 5.2], look: [0, 1.35, 0], fov: 34 }],
  two: [{ f: 672, pos: [0, 1.45, 6.2], look: [0, 1.3, 0], fov: 34 }, { f: 701, pos: [0, 1.45, 5.8], look: [0, 1.3, 0], fov: 34 }],
  guns: [{ f: 702, pos: [0, 1.0, 8.5], look: [0, 1.0, 0], fov: 38 }, { f: 731, pos: [0, 1.0, 7.8], look: [0, 1.0, 0], fov: 38 }],
  bullets: [{ f: 732, pos: [0, 1.9, 9.5], look: [0, 1.3, 0], fov: 38 }, { f: 791, pos: [0, 1.8, 8.6], look: [0, 1.3, 0], fov: 38 }],
  plan: [{ f: 792, pos: [-0.2, 1.5, 7.2], look: [-0.2, 1.4, 0], fov: 36 }, { f: 883, pos: [-0.2, 1.5, 6.4], look: [-0.2, 1.4, 0], fov: 34 }],
  fire: [{ f: 884, pos: [0.5, 1.2, 8], look: [0.5, 1.1, 0], fov: 40 }, { f: 941, pos: [0.7, 1.3, 7.4], look: [0.9, 1.1, 0], fov: 40 }],
  scatter: [{ f: 942, pos: [0, 6, 2], look: [0, 0.8, -18], fov: 55 }, { f: 1079, pos: [0, 8, 4], look: [0, 0.8, -22], fov: 58 }],
  chase: [{ f: 1080, pos: [-1.5, 1.6, 12], look: [-1.5, 1.2, 0], fov: 40 }, { f: 1175, pos: [9.5, 1.6, 12], look: [9.5, 1.2, 0], fov: 40 }],
  bumpy: [{ f: 1262, pos: [1.8, 2.0, 8], look: [0.5, 1.6, -2], fov: 46 }, { f: 1352, pos: [16.8, 2.0, 8], look: [15.5, 1.6, -2], fov: 46 }],
  tmount: [{ f: 1176, pos: [5, 1.2, 5.5], look: [0, 1.4, -2], fov: 46 }, { f: 1261, pos: [1.5, 2.2, 6.5], look: [0, 1.6, -2], fov: 44 }],
  keepup: [{ f: 1353, pos: [17, 1.8, 9.5], look: [17, 1.5, -2], fov: 46 }, { f: 1412, pos: [17.5, 1.8, 9], look: [17.5, 1.5, -2], fov: 46 }],
  weeks: [{ f: 1413, pos: [0, 2.0, 8], look: [0, 1.8, 0], fov: 38 }, { f: 1450, pos: [0, 2.0, 7], look: [0, 1.8, 0], fov: 36 }],
  news: [{ f: 1451, pos: [-80, 1.9, -5], look: [-80, 1.8, -14], fov: 40 }, { f: 1505, pos: [-80, 1.9, -6.5], look: [-80, 1.8, -14], fov: 38 }],
  pols: [{ f: 1506, pos: [80, 1.5, -12], look: [80, 1.35, -22], fov: 40 }, { f: 1577, pos: [80, 1.55, -13], look: [80, 1.4, -22], fov: 38 }],
  packup: [{ f: 1578, pos: [2, 2.2, 12], look: [4, 1.5, -2], fov: 40 }, { f: 1682, pos: [7, 2.0, 12.5], look: [9, 1.5, -2], fov: 40 }],
  imp: [{ f: 1683, pos: [0.2, 1.5, 4.8], look: [0.2, 1.4, 0], fov: 32 }, { f: 1753, pos: [0.2, 1.5, 4.2], look: [0.2, 1.4, 0], fov: 30 }],
  score: [{ f: 1754, pos: [0.3, 2.4, 11], look: [0.6, 1.8, -1], fov: 46 }, { f: 1896, pos: [0.6, 2.1, 8.2], look: [0.7, 1.8, -1], fov: 46 }],
};
const chaseX = (f) => -3 + 11 * M.easeOut(ramp(f, 1080, 1165));
const truckBump = (f) => -0 + 5 * ((f - 1262) / 30);
const KICKS = [{ f: 902, a: 0.03 }, { f: 910, a: 0.03 }, { f: 918, a: 0.03 }, { f: 926, a: 0.03 }, { f: 936, a: 0.03 }, { f: 1282, a: 0.06 }, { f: 1300, a: 0.06 }, { f: 1318, a: 0.06 }, { f: 1334, a: 0.06 }, { f: 1788, a: 0.04 }];
export const camAt = (f) => {
  const S = shotAt(f);
  let c = camFromKeys(CAMS[S.id], f, { creep: 0.0005, kicks: KICKS });
  if (S.id === 'chase') { const x = chaseX(f); c.pos = [x + 1.1, 1.5, 10.5]; c.look = [x + 1.1, 1.2, 0]; c.fov = 44; }
  if (S.id === 'bumpy') { const x = truckBump(f); c = { ...c, pos: [x + 1.8, 2.0 + 0.05 * Math.sin(f * 1.3), 8], look: [x + 0.5, 1.6, -2], fov: 46 }; for (const k of KICKS) { const d = f - k.f; if (d >= 0 && d < 7) c.roll = (d % 2 ? -1 : 1) * 1.8 * (1 - d / 7); } }
  if (S.id === 'fire' && f >= 890) { const s = Math.sin(f * 2.3) * 0.03; c.look = [c.look[0], c.look[1] + s, c.look[2]]; }
  c.flash = f >= 1413 && f < 1418 ? (1 - (f - 1413) / 5) * 0.8 : f >= 1578 && f < 1582 ? (1 - (f - 1578) / 4) * 0.6 : 0;
  return c;
};

// ---------- lens ----------
const DOFS = { hook: [[0.1, 1.3, 0], 9], lost: [[0.4, 1.4, 0], 8], wa: [[-1.6, 1.6, 7.5], 8], vets: [[-3, 1.3, -16], 4], march: [[0, 1.2, -16], 3], beg: [[0, 1.4, -3], 7],
  major: [[0, 1.4, 0], 9], two: [[0, 1.3, 0], 7], guns: [[0, 1, 0], 5], bullets: [[0, 1.2, 0], 4], plan: [[0, 1.4, 0], 4], fire: [[0.5, 1.1, 0], 4], scatter: [[0, 0.5, -20], 0],
  chase: [[0, 1.2, 0], 3], tmount: [[0, 1.5, -2], 5], bumpy: [[0, 1.6, -2], 3], keepup: [[17, 1.5, -2], 3], weeks: [[0, 1.8, 0], 5], news: [[-80, 1.8, -14], 6],
  pols: [[80, 1.7, -22], 6], packup: [[4, 1.5, -2], 3], imp: [[0.2, 1.4, 0], 10], score: [[0.7, 1.9, -1], 4] };
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f), [pt, cinf] = DOFS[S.id];
  let target = pt;
  if (S.id === 'chase' || S.id === 'bumpy') target = [C.look[0], C.look[1], C.look[2]];
  if (S.id === 'hook') return { focus: dist(C.pos, pt), cinf: lerp(10, 0, M.smooth(ramp(f, 40, 90))) };
  if (S.id === 'wa') return { focus: lerp(dist(C.pos, pt), 80, M.smooth(ramp(f, 205, 232))), cinf: lerp(8, 0, M.smooth(ramp(f, 205, 232))) };
  return { focus: dist(C.pos, target), cinf };
};

// ---------- world state ----------
const truckPose = (f, S) => {
  const bob = (s) => Math.abs(Math.sin(f * s));
  switch (S.id) {
    case 'tmount': return { x: 0, z: -2, y: 0.02 * Math.sin(f * 0.6), spin: f * 0.2, yaw: 0 };
    case 'bumpy': { const t = (f - 1262) / 30; return { x: truckBump(f), z: -2, y: 0.38 * bob(0.42) + 0.04, spin: t * 9, roll: 0.07 * Math.sin(f * 0.7), pitch: 0.1 * Math.sin(f * 0.44 + 1), yaw: 0 }; }
    case 'keepup': { const t = (f - 1353) / 30; return { x: 14.6 + 4 * t - 1.8 * t * t, z: -2, y: 0.05 * Math.sin(f * 1.5) * (1 - t / 2), spin: t * 4, pitch: -0.02, yaw: 0 }; }
    case 'packup': { const t = (f - 1578) / 30; return { x: 1 + 2.6 * t, z: -2, y: 0.02 * Math.sin(f * 0.5), spin: t * 4, yaw: 0 }; }
  }
  return null;
};
export const worldAt = (f) => {
  const S = shotAt(f);
  return { trample: [ramp(f, 415, 470), ramp(f, 470, 520), ramp(f, 520, 585)], truck: truckPose(f, S), banner: 'gone', old: false };
};

const FARMERS = [[-2.8, -15.5, 'farmer', 51], [-1.4, -14.9, 'farmerB', 52], [0.0, -15.7, 'farmerC', 53]];
// ---------- actors ----------
const gl = (S) => (S.light === 'golden' ? '#ffe2c8' : '#ffffff');
export const actorsAt = (f, T) => {
  const S = shotAt(f), out = [], tint = gl(S);
  const I = (seed) => { const i = idle(f, seed); return { bob: q(i.bob, 3), tilt: q(i.tilt, 1), headTilt: q(i.headTilt, 1) }; };
  const Pp = (who, o, pos, extra = {}) => out.push({ key: who + JSON.stringify(o), draw: (p) => T.romanFront(p, who, o), x: pos[0], y: pos[1], z: pos[2], tint, ...extra });
  const E = (o, pos, extra = {}) => out.push({ key: 'emu' + JSON.stringify(o), draw: (p) => T.emuCard(p, o), x: pos[0], y: pos[1], z: pos[2], s: 0.95, tint, ...extra });
  const X = (kind, o, pos, extra = {}) => out.push({ key: kind + JSON.stringify(o), draw: (p) => T[kind](p, o), x: pos[0], y: pos[1], z: pos[2], tint, ...extra });
  const eIdle = (seed) => ({ blink: blinkAt(f, seed), bob: q(idle(f, seed).bob * 2.5, 3) });
  const gait = (seed, rate = 0.05) => q((f * rate + seed * 0.37) % 1, 2);
  const pop = (f0, d = 10) => M.back((f - f0) / d);
  switch (S.id) {
    case 'hook': {
      Pp('soldier', { expr: 'stern', seed: 3, blink: blinkAt(f, 3), L: 'hang', R: 'hang', look: 0.2, ...I(3) }, [-0.05, 0, 0]);
      E({ mood: f < 60 ? 'calm' : 'smug', neck: q(0.3 + 0.2 * Math.sin(f * 0.06)), ...eIdle(7) }, [1.15, 0, -0.6], { flip: true });
      if (f > 70) [[-4, -13], [2.5, -15], [7, -12], [-9, -17]].forEach(([x, z], i) => E({ mood: 'calm', neck: q(0.2 * Math.sin(f * 0.05 + i)), ...eIdle(20 + i) }, [x, 0, z], { flip: i % 2 === 0 }));
      break;
    }
    case 'lost': {
      Pp('soldier', { expr: 'dazed', seed: 3, L: 'cheek', R: 'hang', look: -0.3, headTilt: q(6 * Math.sin(f * 0.15), 1), bob: 0 }, [-0.9, 0, -0.8]);
      E({ mood: 'smug', neck: q(0.55 + 0.1 * Math.sin(f * 0.1)), ...eIdle(7), head: q(0.4 * Math.sin(f * 0.09)) }, [0.9, 0, 0], { flip: true });
      break;
    }
    case 'wa': {
      X('signCard', { lines: [{ t: 'WESTERN', size: 74, col: '#3a2614' }, { t: 'AUSTRALIA', size: 74, col: '#3a2614' }] }, [-1.6, 0, 7.5], { s: 1.5 });
      break;
    }
    case 'vets': {
      FARMERS.forEach(([x, z, w, sd], i) => {
        const sw = Math.sin(f * 0.16 + sd);
        const o = { seed: sd, L: i === 1 ? 'hip' : 'reach', R: 'hang', expr: i === 1 ? 'pained' : 'neutral', tilt: q(f > 330 && i === 1 ? 0 : 14 * sw, 0), blink: blinkAt(f, sd), look: 0.3, lift: 0, facing: i === 2 ? -1 : 1, ...I(sd) };
        Pp(w, { ...o, tilt: q(o.tilt, 0) }, [x, 0, z]);
      });
      break;
    }
    case 'march': {
      const t = (f - 370) / 30;
      for (let r = 0; r < 3; r++) for (let j = 0; j < 5; j++) {
        const sd = r * 5 + j, x0 = 4 + j * 1.9 + r * 0.7, x = x0 - 2.6 * t, z = -12.5 - r * 3 + (j % 2) * 0.8;
        const peck = f > 440 && (j + r) % 3 === 0 && Math.sin(f * 0.07 + sd) > 0.2;
        E({ step: peck ? 0 : gait(sd, 0.06), mood: sd % 4 === 0 ? 'alert' : 'calm', neck: peck ? -0.6 : q(0.15 * Math.sin(f * 0.06 + sd)), mouth: peck ? q(0.5 + 0.5 * Math.sin(f * 0.6)) : 0, blink: blinkAt(f, sd + 3) }, [x, 0, z], { flip: true });
      }
      break;
    }
    case 'beg': {
      [[-0.9, 'farmer', 51, 'up', 'hang'], [0, 'farmerB', 52, 'up', 'up'], [0.9, 'farmerC', 53, 'hang', 'up']].forEach(([x, w, sd, L, R], i) => {
        const wv = Math.sin(f * 0.5 + i * 2);
        Pp(w, { seed: sd, L, R, expr: i === 1 ? 'pained' : 'nervous', blink: blinkAt(f, sd), look: 0, tilt: q(3 * wv, 1), bob: q(0.01 * Math.abs(wv), 3) }, [x, 0, -3 + i * 0.1]);
      });
      [[-3, -20], [1, -24], [5, -18], [-6, -27], [8, -26]].forEach(([x, z], i) => { const p_ = Math.sin(f * 0.08 + i * 2) > 0; E({ mood: 'calm', neck: p_ ? -0.6 : 0.1, mouth: p_ ? q(0.5 + 0.5 * Math.sin(f * 0.6)) : 0, blink: blinkAt(f, i + 30) }, [x, 0, z], { flip: i % 2 === 0 }); });
      break;
    }
    case 'major': {
      const sp = 1 + 0.03 * M.spring((f - 599) / 30);
      Pp('major', { expr: f < 640 ? 'grin' : 'smile', seed: 9, blink: blinkAt(f, 9), L: 'hip', R: 'hip', look: 0, ...I(9) }, [0, 0, 0], { s: sp });
      break;
    }
    case 'two': {
      const a = M.back((f - 672) / 8), b = M.back((f - 686) / 8);
      Pp('soldier', { expr: 'stern', seed: 5, blink: blinkAt(f, 5), L: 'hang', R: 'hang', ...I(5) }, [-0.8, 0, 0], { s: Math.max(0.01, a) });
      Pp('soldierB', { expr: 'neutral', seed: 6, blink: blinkAt(f, 6), L: 'hang', R: 'hang', ...I(6) }, [0.8, 0, 0], { s: Math.max(0.01, b) });
      break;
    }
    case 'guns': {
      const a = M.back((f - 702) / 8), b = M.back((f - 716) / 8);
      X('gunCard', { flash: 0 }, [-0.95, 0, 0], { s: 1.2 * Math.max(0.01, a) });
      X('gunCard', { flash: 0 }, [0.95, 0, 0], { s: 1.2 * Math.max(0.01, b) });
      break;
    }
    case 'bullets': {
      const pos = [[-1.15, 0, 0.1, 732], [0, 0, 0, 740], [1.15, 0, 0.1, 748], [-0.58, 0.86, 0.05, 756], [0.58, 0.86, 0.05, 764], [0, 1.72, 0, 772]];
      pos.forEach(([x, y, z, f0]) => { const k = M.back((f - f0) / 9); if (f >= f0) X('crateCard', { pop: 1 }, [x, y, z], { s: 1.15 * Math.max(0.01, k), blob: y === 0 }); });
      break;
    }
    case 'plan': {
      const n = Math.floor(ramp(f, 828, 872) * 3 + 0.001);
      X('calCard', { crossed: n, title: 'DAYS' }, [-0.85, 0, -0.2], { s: 1.0 });
      Pp('major', { expr: f > 860 ? 'laugh' : 'grin', seed: 9, blink: blinkAt(f, 9), L: 'point', R: 'hip', look: -0.4, ...I(9) }, [0.55, 0, 0]);
      break;
    }
    case 'fire': {
      const fl = f >= 892 ? (f % 4 < 2 ? 1 : 0) : 0, fl2 = f >= 892 ? ((f + 2) % 4 < 2 ? 1 : 0) : 0;
      const j = f >= 892 ? (f % 2 ? 0.008 : -0.008) : 0;
      Pp('soldier', { expr: f >= 892 ? 'shock' : 'stern', seed: 5, L: 'hang', R: 'hang', bob: q(Math.abs(j), 3), blink: 0 }, [-0.6 + j, 0, 0.1]);
      X('gunCard', { flash: fl }, [-0.15, 0.05, 0.5], { s: 1.0 });
      Pp('soldierB', { expr: f >= 892 ? 'grin' : 'stern', seed: 6, L: 'hang', R: 'hang', bob: q(Math.abs(j), 3), blink: 0 }, [1.2 - j, 0, 0.1]);
      X('gunCard', { flash: fl2 }, [1.65, 0.05, 0.5], { s: 1.0 });
      [[2.4, -6], [3.8, -9], [5.4, -7]].forEach(([x, z], i) => E({ mood: f >= 892 ? 'alert' : 'calm', neck: f >= 892 ? 0.6 : 0.1, blink: blinkAt(f, i + 40) }, [x, 0, z], { flip: true }));
      break;
    }
    case 'scatter': {
      const t = Math.max(0, (f - 950) / 30);
      for (let i = 0; i < 12; i++) {
        const g = i % 3, sx = -4.5 + (i * 0.83) % 9, sz = -14 - (i % 4) * 2.4, dir = g === 0 ? [-1, -0.1] : g === 1 ? [1, -0.15] : [0.35, -1], sp = 8.5 + (i % 3);
        const x = sx + dir[0] * sp * t, z = sz + dir[1] * sp * t;
        if (Math.abs(x) > 40 || z < -50) continue;
        const run = f >= 950;
        E({ step: run ? gait(i, 0.11) : 0, mood: run ? 'alert' : 'calm', neck: run ? 0.1 : q(0.2 * Math.sin(f * 0.1 + i)), blink: run ? 0 : blinkAt(f, i + 5) }, [x, 0, z], { flip: run ? dir[0] < 0.2 && g !== 2 || g === 2 && false : i % 2 === 0, s: 0.95 });
      }
      break;
    }
    case 'chase': {
      const xs = chaseX(f), t = (f - 1080) / 30, spd = 1 - M.easeOut(ramp(f, 1080, 1165)) * 0.85, ph = q((f * 0.1 * Math.max(0.15, spd)) % 1, 2), tired = f > 1135;
      [[0, 'soldier', 5], [-1.6, 'soldierB', 6], [-3.2, 'major', 9]].forEach(([dx, w, sd], i) => {
        Pp(w, { seed: sd, L: 'hang', R: 'hang', facing: 1, step: tired ? 0 : ph, expr: tired ? 'pained' : 'stern', tilt: tired ? q(18 + 4 * Math.sin(f * 0.3 + i), 0) : 0, blink: 0, look: 0.4 }, [xs + dx * 0.55, 0, 0.2 - i * 0.1]);
      });
      for (let i = 0; i < 4; i++) { const ex = xs + 2.6 + i * 1.3 + 7 * t * (1 + i * 0.1); E({ step: gait(i, 0.11), mood: 'smug', neck: 0.1, blink: 0 }, [ex, 0, -1.2 - i * 0.5], { flip: false }); }
      break;
    }
    case 'tmount': {
      const g = M.back((f - 1190) / 18), lift = 1 - clamp(g);
      X('gunCard', { flash: 0, legs: false }, [-0.75, 1.1 + 2.2 * lift * (f < 1210 ? 1 : 0), -2], { s: 0.8 * Math.max(0.01, f >= 1188 ? 1 : 0), blob: false });
      Pp('major', { expr: f < 1210 ? 'grin' : 'laugh', seed: 9, blink: blinkAt(f, 9), L: 'hip', R: f > 1215 ? 'thumb' : 'hip', ...I(9) }, [-1.9, 1.1, -2], { blob: false });
      break;
    }
    case 'bumpy': {
      const x = truckBump(f), by = truckPose(f, S).y, sw = Math.sin(f * 0.44 + 1);
      Pp('soldier', { expr: 'shock', seed: 5, L: 'up', R: 'hang', bob: q(0.03 * Math.abs(Math.sin(f * 0.42)), 3), tilt: q(10 * sw, 0), blink: 0 }, [x - 1.6, 1.1 + by, -1.6], { blob: false });
      Pp('major', { expr: 'dazed', seed: 9, L: 'hip', R: 'up', bob: q(0.03 * Math.abs(Math.sin(f * 0.42 + 1)), 3), tilt: q(-9 * sw, 0), blink: 0 }, [x - 1.0, 1.1 + by, -2.3], { blob: false });
      X('gunCard', { flash: f % 6 < 2 ? 1 : 0, legs: false }, [x - 0.2, 1.15 + by, -2], { s: 0.8, blob: false, roll: q(0.5 * Math.sin(f * 0.44 + 2), 2) });
      break;
    }
    case 'keepup': {
      const tp = truckPose(f, S), t = (f - 1353) / 30;
      Pp('major', { expr: 'dazed', seed: 9, L: 'cheek', R: 'hang', bob: 0, tilt: 0 }, [tp.x - 0.9, 1.1 + tp.y, -2.3], { blob: false });
      Pp('soldier', { expr: 'pained', seed: 5, L: 'cheek', R: 'hang', bob: 0, tilt: 0 }, [tp.x - 1.7, 1.1 + tp.y, -1.6], { blob: false });
      for (let i = 0; i < 5; i++) E({ step: gait(i, 0.12), mood: 'smug', neck: 0.1, blink: 0 }, [6 - i * 2.1 + 14.5 * t + 2, 0, i % 2 ? 1.4 : -4.5], { flip: false });
      break;
    }
    case 'weeks': {
      X('calCard', { crossed: Math.floor(ramp(f, 1416, 1447) * 28), title: 'WEEKS' }, [0, 0, 0], { s: 1.7 });
      break;
    }
    case 'news': {
      const heads = [['EMUS WIN!', 'ARMY BEATEN BY BIRDS', -6, -0.85, 1.5, 1.05], ['BIRDS 1  ARMY 0', 'SOLDIERS OUTRUN', 7, 0.85, 1.7, 1.0], ['WAR ON EMUS FAILS', 'GUNS MISS AGAIN', -3, -0.7, 0.35, 0.95], ['HA HA!', 'NATION LAUGHS', 4, 0.55, 0.45, 0.9]];
      heads.forEach(([h, sub, ang, x, y, s], i) => { const k = M.back((f - 1451 - i * 7) / 9); if (f >= 1451 + i * 7) X('newsCard', { head: h, sub, ang: q(ang + 2 * Math.sin(f * 0.15 + i), 1) }, [-80 + x, y, -14 + i * 0.05], { s: s * Math.max(0.01, k), blob: false }); });
      Pp('reader', { expr: 'laugh', seed: 7, L: 'belly', R: 'belly', bob: q(Math.abs(Math.sin(f * 0.55)) * 0.025, 3), tilt: q(4 * Math.sin(f * 0.5), 1) }, [-79.35, 0, -12.5]);
      break;
    }
    case 'pols': {
      [[-1.35, 'pol', 61], [0, 'polB', 62], [1.35, 'pol', 63]].forEach(([dx, w, sd], i) => {
        const on = Math.floor((f - 1510) / 14) % 3 === i;
        Pp(w, { seed: sd, L: 'hang', R: on ? 'up' : 'hang', expr: on ? 'shock' : 'stern', blink: blinkAt(f, sd), look: 0, ...I(sd) }, [80 + dx, 0, -22.4], {});
      });
      break;
    }
    case 'packup': {
      const tp = truckPose(f, S), by = tp.y;
      Pp('major', { expr: 'pained', seed: 9, L: 'cheek', R: 'hang', bob: 0 }, [tp.x - 0.9, 1.1 + by, -2.3], { blob: false });
      Pp('soldier', { expr: 'dazed', seed: 5, L: 'hang', R: 'hang', bob: 0, headTilt: -6 }, [tp.x - 1.7, 1.1 + by, -1.7], { blob: false });
      Pp('soldierB', { expr: 'dazed', seed: 6, L: 'hang', R: 'hang', bob: 0, headTilt: 5 }, [tp.x - 1.0, 1.1 + by, -1.5], { blob: false });
      X('crateCard', { pop: 1 }, [tp.x - 2.0, 1.1 + by, -2.2], { s: 0.55, blob: false });
      [[8, -12], [13, -10], [18, -13]].forEach(([x, z], i) => E({ mood: 'smug', neck: q(0.3 + 0.15 * Math.sin(f * 0.05 + i)), ...eIdle(70 + i) }, [x, 0, z], { flip: true }));
      break;
    }
    case 'imp': {
      Pp('major', { expr: f < 1712 ? 'dazed' : 'smile', seed: 9, blink: blinkAt(f, 9), L: 'hip', R: f > 1712 ? 'thumb' : 'hang', look: 0.4, ...I(9) }, [-0.2, 0, 0]);
      E({ mood: 'smug', neck: q(0.5 + 0.2 * Math.sin(f * 0.07)), head: q(f > 1735 ? 0.6 : 0), ...eIdle(7) }, [1.1, 0, -1.0], { flip: true });
      break;
    }
    case 'score': {
      const ln = [{ t: 'FINAL SCORE', size: 58, col: '#3a2614' }];
      if (f >= 1789) ln.push({ t: 'ARMY   0', size: 78, col: '#c0302c' });
      if (f >= 1838) ln.push({ t: 'EMUS   \u221E', size: 78, col: '#2f7a3a' });
      X('signCard', { lines: ln, w: 500, top: 130, bot: 560 }, [-0.4, 0, -1.5], { s: 1.45 });
      const j = (s) => q(Math.abs(Math.sin(f * 0.3 + s)) * (f >= 1838 ? 0.04 : 0.0), 3);
      E({ mood: 'smug', medal: f >= 1838, neck: q(0.5 + 0.1 * Math.sin(f * 0.1)), ...eIdle(7), bob: j(0) }, [1.85, 0, -0.6], { flip: true, s: 1.1 });
      [[-2.4, -1.4, 1], [3.6, -2.6, 2], [-3.6, -3.4, 3], [0.9, -4.6, 4]].forEach(([x, z, sd]) => E({ mood: 'calm', neck: 0.2, ...eIdle(80 + sd), bob: j(sd * 2) }, [x, 0, z], { flip: x > 0 }));
      break;
    }
  }
  return out;
};

// ---------- 2D effects ----------
const FX = (key, draw, pos, s = 1, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 5, ...extra });
export const fxAt = (f, T) => {
  const S = shotAt(f), out = [];
  const puff = (x, z, k, s = 0.5, col = '#e8cfa8') => out.push(FX('dust' + q(k, 2) + col, (p) => T.fxDust(p, k, col), [x, 0.1 - 1.02 * s, z], s, { tint: '#ffe0b8' }));
  if (S.id === 'lost') out.push(FX('stars' + q((f * 0.02) % 1, 2), (p) => T.fxStars(p, (f * 0.02) % 1), [-0.9, 0, -0.8], 1));
  if (S.id === 'vets') FARMERS.map(([x, z, , sd]) => [x, z, sd]).forEach(([x, z, sd]) => { const t = ((f * 0.025 + sd * 0.13) % 1); out.push(FX('sw', (p) => T.fxSweat(p), [x + 0.3, 1.75 - t * 0.5 - 0.27, z + 0.05], 0.25)); });
  if (S.id === 'march') for (let r = 0; r < 3; r++) for (let j = 0; j < 5; j += 2) { const t = (f - 370) / 30, x = 4 + j * 1.9 + r * 0.7 - 2.6 * t, z = -12.5 - r * 3 + (j % 2) * 0.8; puff(x + 0.9, z, (f * 0.04 + j * 0.3 + r * 0.2) % 1, 0.35); }
  if (S.id === 'fire' && f >= 892) {
    if (f < 904) out.push(FX('bang' + q((f - 892) / 12, 1), (p) => T.fxBang(p, (f - 892) / 12), [0.7, 1.7, 0.5], 0.9));
    for (let i = 0; i < 5; i++) { const t = ((f * 0.09 + i * 0.2) % 1); out.push(FX('bl', (p) => T.fxBullet(p), [0.5 + t * 5.5, 1.15 + (i % 2) * 0.1, 0.3 - t * 3], 0.5)); }
  }
  if (S.id === 'scatter' && f >= 948 && f < 1000) { const k = (f - 948) / 50; puff(0, -17, k, 3.2); puff(-3, -15, k * 0.9, 2.4); puff(3, -19, k * 0.9, 2.4); }
  if (S.id === 'scatter' && f >= 1000 && f < 1060) { const k = (f - 1000) / 60; puff(-36, -17, k, 3); puff(36, -19, k, 3); }
  if (S.id === 'chase' && f > 1125) { const xs = chaseX(f); puff(xs + 2.6, 0.5, ((f - 1125) / 40) % 1, 1.0); out.push(FX('sw2', (p) => T.fxSweat(p), [xs + 0.3, 1.7, 0.3], 0.25)); }
  if (S.id === 'bumpy') { for (let i = 0; i < 5; i++) { const t = ((f * 0.05 + i * 0.2) % 1), x = truckBump(f); out.push(FX('bl', (p) => T.fxBullet(p), [x + 1 + (i - 2) * 1.8 * t * 3, 2.2 + t * 4 - (i % 3), -2 - 2 * t], 0.5)); } out.push(FX('q2', (p) => T.fxQ(p, ((f * 0.03) % 1)), [truckBump(f) - 1.0, 2.9, -2.3], 0.45)); puff(truckBump(f) - 2.4, 0.2, ((f * 0.06) % 1), 0.8); }
  if (S.id === 'keepup') { const tp = truckPose(f, S), t = (f - 1353) / 30; out.push(FX('sm' + q((f * 0.02) % 1, 2), (p) => T.fxSmoke(p, (f * 0.02) % 1), [tp.x + 2.3, 1.1, -2], 0.9)); if (t < 1.2) puff(tp.x - 2.6, -1, (f * 0.05) % 1, 0.7); }
  if (S.id === 'news') out.push(FX('ha' + q((f * 0.08) % 1, 2), (p) => T.fxHaha(p, (f * 0.08) % 1), [-79.5, 0.85, -12.5], 0.6));
  if (S.id === 'pols') [[-1.35, 61], [0, 62], [1.35, 63]].forEach(([dx, sd], i) => { const on = Math.floor((f - 1510) / 14) % 3 === i; if (on) { const t = ((f - 1510) % 14) / 14; out.push(FX('qm' + i, (p) => T.fxQ(p, t), [80 + dx, 1.9, -22.3], 0.5)); } });
  if (S.id === 'packup') { const tp = truckPose(f, S); puff(tp.x - 2.8, -1.8, (f * 0.05) % 1, 0.8, '#d8b890'); }
  if (S.id === 'imp' && f > 1712 && f < 1730) out.push(FX('sw3', (p) => T.fxSweat(p), [0.1, 1.9 - (f - 1712) * 0.01, 0.1], 0.3));
  return out;
};
