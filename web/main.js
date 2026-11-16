import * as THREE from './lib/three.module.js';
import * as T from './toon.js';
import * as P from './paint.js';
import { SHOTS, TOTAL, shotAt, camAt, dofAt, LIGHTS, lightFor, actorsAt, worldAt, fxAt } from './story.js';

const RS = +(new URLSearchParams(location.search).get('rs') || 1); const W = Math.round(1080 * RS), H = Math.round(1920 * RS);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 1500);
const rx = (a) => a * Math.PI / 180;

// ---------- materials ----------
const grad = (() => { const d = new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 2, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
const texM = (c, rx_ = 1, ry_ = 1, color = '#ffffff') => toon({ map: P.tex(c, rx_, ry_), color });
const M = {
  plank: texM(P.planks(1), 1, 6), beam: texM(P.beam(2), 1, 2), beamDark: texM(P.beam(3, [28, 36, 30]), 1, 2),
  rot: texM(P.rotten(4), 1, 1), rotB: texM(P.rotten(14), 1, 1),
  stone: texM(P.stone(4), 1, 1), stoneMoss: texM(P.mossy(P.stone(4), 5, 1.2), 1, 1),
  grass: texM(P.grass(6), 40, 40), dirt: texM(P.dirt(7), 6, 30), plaster: texM(P.plaster(8), 1, 1), plaster2: texM(P.plaster(18, 28), 1, 1),
  roof: texM(P.roof(9), 2, 2), marble: texM(P.marble(10), 1, 1), marbleTop: toon({ color: '#ece2cf' }),
  trunk: toon({ color: '#6a4a32' }), cypress: toon({ color: '#3f6b36' }), pine: toon({ color: '#5c8a3c' }), bush: toon({ color: '#6c9a42' }),
  hill: toon({ color: '#7aa64c' }), hillFar: toon({ color: '#86ad60' }), mount: toon({ color: '#8fa7b8' }), snow: toon({ color: '#f4f6fa' }),
  iron: toon({ color: '#5c5a57' }), bronze: toon({ color: '#b08a4a' }), wood: toon({ color: '#7a5434' }), door: toon({ color: '#5a3a24' }),
  window: toon({ color: '#2b2430' }), red: toon({ color: '#b8282b' }),
};
M.banner = new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.banner()), alphaTest: 0.5, side: THREE.DoubleSide });
// helmet
const helmetIn = P.tex(P.helmetInside()); helmetIn.wrapS = helmetIn.wrapT = THREE.ClampToEdgeWrapping;
M.helmIn = new THREE.MeshToonMaterial({ gradientMap: grad, map: helmetIn, side: THREE.BackSide });
M.helmOut = toon({ color: '#8f8a7e' });

// ---------- ink / normal-depth contract ----------
const NOINK = 'noink'; // userData flag: never outlined (cards, fx, water handled specially)
const ndMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*.5+.5, vD); }`,
  side: THREE.DoubleSide,
});
const cardNd = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } },
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if(texture2D(map,vUv).a<.5) discard; gl_FragColor=vec4(0.,0.,0.,vD); }`,
  side: THREE.DoubleSide,
});
const waterNd = new THREE.ShaderMaterial({
  vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vD; void main(){ gl_FragColor=vec4(.5,1.,.5,vD); }`,
});

// ---------- helpers ----------
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, opts = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = opts.cast ?? true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const uvScale = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
/** box with world-scaled UVs per face (texel density 1 tile per `t` metres) */
const tbox = (w, h, d, t = 2) => {
  const g = box(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / t, uv.getY(i) * dims[f][1] / t); }
  return g;
};

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float sunSize; varying vec3 vP;
    void main(){ float h = clamp(vP.y,0.,1.); vec3 c = mix(hor, top, pow(h, .55)); if(vP.y<0.) c = hor;
      float s = dot(normalize(vP), normalize(sunDir)); c += sunCol * (smoothstep(1.-sunSize, 1.-sunSize*.6, s) + .35*pow(max(s,0.), 24.)*step(.001,sunSize));
      gl_FragColor = vec4(c,1.); }`,
}));
sky.userData.sky = true; scene.add(sky);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog('#ffffff', 40, 600);

// ---------- world: Western Australia wheat farm, 1932 ----------
const DECK = 0; // ground level (actors stand at y = 0)
const waterU = { t: { value: 0 }, deep: { value: new THREE.Color() }, shal: { value: new THREE.Color() }, glint: { value: new THREE.Color() } };
const world = new THREE.Group(); scene.add(world);
const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), c); return c; };
const rg = P.rng(5);
const groundTex = cv(512, 512, (g) => { g.fillStyle = '#c98f52'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${120 + rg() * 80 | 0},${70 + rg() * 40 | 0},${30 + rg() * 30 | 0},${0.12 + rg() * 0.22})`; g.fillRect(rg() * 512, rg() * 512, 2 + rg() * 9, 1 + rg() * 4); } for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(120,130,60,.35)'; g.fillRect(rg() * 512, rg() * 512, 3, 5 + rg() * 8); } });
const wheatTex = cv(512, 512, (g) => { g.fillStyle = '#d9ae45'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${200 + rg() * 50 | 0},${150 + rg() * 60 | 0},${40 + rg() * 30 | 0},.7)`; g.lineWidth = 2; const x = rg() * 512, y = rg() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rg() - 0.5) * 4, y - 8 - rg() * 14); g.stroke(); } });
const mGround = toon({ map: P.tex(groundTex, 120, 120) }), mWheatFloor = toon({ map: P.tex(wheatTex, 9, 8) }), mRoad = toon({ map: P.tex(P.dirt(7), 30, 1.2) });
const ground = add(new THREE.PlaneGeometry(3000, 3000), mGround, 0, 0, 0, world, { cast: false }); ground.rotation.x = -Math.PI / 2;
const fieldFloor = add(new THREE.PlaneGeometry(56, 40), mWheatFloor, 0, 0.03, -28, world, { cast: false }); fieldFloor.rotation.x = -Math.PI / 2;
const road = add(new THREE.PlaneGeometry(220, 6), mRoad, 0, 0.02, 8, world, { cast: false }); road.rotation.x = -Math.PI / 2;
// wheat: three merged tuft zones (near, mid, far) so each can be trampled
const tuftGeo = new THREE.ConeGeometry(0.36, 1.25, 5, 1); tuftGeo.translate(0, 0.625, 0);
const wheatGold = new THREE.Color('#e3b548'), wheatDead = new THREE.Color('#a8834a');
const wheatZone = (z0, z1, seed) => {
  const pos = [], nor = [], uv = [], idx = [], r = P.rng(seed); let base = 0; const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (let x = -27; x <= 27; x += 1.25) for (let z = z0; z <= z1; z += 1.25) {
    const s = 0.8 + r() * 0.5;
    m.compose(new THREE.Vector3(x + (r() - 0.5) * 1.0, 0, z + (r() - 0.5) * 1.0), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.25, r() * 6.28, (r() - 0.5) * 0.25)), new THREE.Vector3(s, s * (0.85 + r() * 0.5), s));
    nm.getNormalMatrix(m); const A = tuftGeo.attributes;
    for (let i = 0; i < A.position.count; i++) { v.fromBufferAttribute(A.position, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(A.normal, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); uv.push(A.uv.getX(i), A.uv.getY(i)); }
    for (let i = 0; i < tuftGeo.index.count; i++) idx.push(tuftGeo.index.getX(i) + base); base += A.position.count;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, toon({ color: '#e3b548' })); mesh.castShadow = true; mesh.receiveShadow = true; world.add(mesh); return mesh;
};
const wheat = [wheatZone(-14, -23, 11), wheatZone(-24, -33, 12), wheatZone(-34, -46, 13)];
// fence along the road side of the field
for (let x = -44; x <= 44; x += 3) add(tbox(0.18, 1.3, 0.18, 1), M.beam, x, 0.65, -6, world);
for (const y of [0.55, 1.05]) add(tbox(90, 0.1, 0.1, 2), M.beam, 0, y, -6, world);
// farmhouse, water tank, windmill (left)
const farm = new THREE.Group(); farm.position.set(-24, 0, -22); farm.rotation.y = rx(18); world.add(farm);
add(tbox(8, 3.4, 6, 2), M.plaster2, 0, 1.7, 0, farm);
for (const s of [-1, 1]) { const rf = add(tbox(5.2, 0.18, 7, 2), M.roof, s * 2.15, 4.15, 0, farm); rf.rotation.z = -s * 0.5; }
add(tbox(0.4, 0.5, 7.1, 2), M.beam, 0, 4.9, 0, farm);
add(box(1, 2, 0.1), M.door, 0, 1, 3.03, farm, { cast: false });
for (const s of [-1, 1]) add(box(1.1, 1.0, 0.1), M.window, s * 2.4, 1.9, 3.03, farm, { cast: false });
add(tbox(1, 2.2, 1, 1.6), M.stone, 2.6, 4.6, -1.6, farm);
for (const x of [-3.8, 3.8]) add(tbox(0.2, 2.6, 0.2, 1), M.beam, x, 1.3, 3.8, farm);
add(tbox(8.4, 0.18, 1.9, 2), M.roof, 0, 2.7, 3.7, farm);
const tank = new THREE.Group(); tank.position.set(-31, 0, -17); world.add(tank);
add(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 14), toon({ color: '#8fa0ad' }), 0, 2.8, 0, tank);
for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) add(tbox(0.15, 1.7, 0.15, 1), M.beam, dx, 0.85, dz, tank);
add(new THREE.ConeGeometry(1.3, 0.6, 14), toon({ color: '#7a8895' }), 0, 4.3, 0, tank);
const mill = new THREE.Group(); mill.position.set(-13, 0, -27); world.add(mill);
for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) { const l = add(new THREE.CylinderGeometry(0.07, 0.1, 10, 6), M.beam, dx * 0.7, 5, dz * 0.7, mill); l.rotation.z = -dx * 0.06; l.rotation.x = dz * 0.06; }
for (const y of [2.5, 5, 7.5]) add(tbox(1.5, 0.08, 1.5, 1), M.beam, 0, y, 0, mill);
const millHead = new THREE.Group(); millHead.position.set(0, 10.2, 0.4); mill.add(millHead);
add(new THREE.SphereGeometry(0.28, 10, 8), M.iron, 0, 0, 0, millHead);
for (let i = 0; i < 10; i++) { const b = add(box(0.35, 2.2, 0.04), toon({ color: '#c9c4b8' }), 0, 0, 0.1, millHead); b.geometry = b.geometry.clone(); b.geometry.translate(0, 1.35, 0); b.rotation.z = i / 10 * Math.PI * 2; }
add(box(0.12, 0.12, 2.4), M.iron, 0, 10.2, -0.6, mill);
// gum trees + scrub
const gum = (x, z, h = 7) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = x * 3.1; world.add(g);
  const t = add(new THREE.CylinderGeometry(0.22, 0.4, h, 7), toon({ color: '#d8cdb4' }), 0, h / 2, 0, g); t.rotation.z = 0.07;
  [[0, h + 0.8, 0, 3.4, 1.6, '#7d9b6a'], [-1.8, h + 0.2, 0.6, 2.4, 1.2, '#8aa876'], [1.9, h - 0.2, -0.5, 2.3, 1.1, '#74936a']].forEach(([a, b, c, rr, hh, col]) => add(new THREE.SphereGeometry(rr, 10, 8), toon({ color: col }), a, b, c, g).scale.y = hh / rr); return g; };
const rt = P.rng(44);
for (let i = 0; i < 30; i++) { const x = (rt() - 0.5) * 190, z = -(rt() * 100) - 6; if (Math.abs(x) < 32 && z > -50) continue; if (Math.hypot(x + 24, z + 22) < 9) continue; gum(x, z, 5 + rt() * 4); }
const bushMats = [toon({ color: '#6f8a4a' }), toon({ color: '#8a9a52' }), toon({ color: '#7a8a44' })];
const scrub = (x, z, r) => { const b = add(new THREE.SphereGeometry(r, 10, 8), bushMats[(Math.abs(x * 7 + z) | 0) % 3], x, r * 0.55, z, world); b.scale.y = 0.75; return b; };
for (let i = 0; i < 46; i++) scrub(34 + rt() * 34, -4 - rt() * 44, 1.1 + rt() * 1.4);
for (let i = 0; i < 46; i++) scrub(-34 - rt() * 34, -4 - rt() * 44, 1.1 + rt() * 1.4);
for (let i = 0; i < 70; i++) scrub((rt() - 0.5) * 220, -52 - rt() * 30, 1.2 + rt() * 1.6);
// far hills (ochre) and ranges
for (let i = 0; i < 16; i++) { const a = (i / 16 - 0.5) * 2.4 - Math.PI / 2, d = 260 + rt() * 160; const h = add(new THREE.SphereGeometry(55 + rt() * 50, 20, 10), i % 2 ? toon({ color: '#c58a5c' }) : toon({ color: '#b87e56' }), Math.cos(a) * d * 1.4, -18, Math.sin(a) * d, world, { cast: false }); h.scale.y = 0.4 + rt() * 0.25; }
// army truck (faces +x)
const truck = new THREE.Group(); world.add(truck); truck.visible = false;
const oliv = toon({ color: '#6b7144' }), olivD = toon({ color: '#565b36' }), blk = toon({ color: '#26262b' });
add(tbox(4.4, 0.45, 1.8, 2), blk, 0, 0.75, 0, truck);
add(tbox(2.7, 0.2, 1.9, 2), olivD, -0.7, 1.05, 0, truck);
for (const s of [-1, 1]) add(tbox(2.7, 0.75, 0.12, 2), oliv, -0.7, 1.45, s * 0.9, truck);
add(tbox(0.12, 0.75, 1.9, 2), oliv, -2.05, 1.45, 0, truck);
add(tbox(1.3, 1.25, 1.8, 2), oliv, 1.0, 1.65, 0, truck);
add(tbox(0.1, 0.7, 1.5, 1), M.window, 1.67, 1.95, 0, truck);
add(tbox(1.1, 0.8, 1.7, 2), oliv, 2.0, 1.25, 0, truck);
add(tbox(0.2, 0.5, 1.6, 1), M.iron, 2.62, 1.1, 0, truck);
const wheels = [];
for (const [x, z] of [[1.7, 0.95], [1.7, -0.95], [-1.3, 0.95], [-1.3, -0.95]]) { const w = new THREE.Group(); w.position.set(x, 0.55, z); truck.add(w); const c = add(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14), blk, 0, 0, 0, w); c.rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(0.28, 0.28, 0.44, 10), toon({ color: '#b8a878' }), 0, 0, 0, w).rotation.x = Math.PI / 2; add(box(0.9, 0.1, 0.46), toon({ color: '#3a3a40' }), 0, 0, 0, w); wheels.push(w); }
// backdrop walls for the indoor-style scenes (politicians right, newspapers left)
const wallA = new THREE.Group(); wallA.position.set(80, 0, -24); world.add(wallA);
add(tbox(18, 7, 0.6, 2), M.plaster, 0, 3.5, 0, wallA); add(tbox(18, 1.2, 0.7, 2), M.beamDark, 0, 0.6, 0.05, wallA);
for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), M.wood, s * 6.5, 5, 0.5, wallA); add(box(1.6, 1.0, 0.05), M.red, s * 6.5 + 0.9, 6.5, 0.6, wallA); }
const wallB = new THREE.Group(); wallB.position.set(-80, 0, -24); world.add(wallB);
add(tbox(18, 7, 0.6, 2), M.plaster2, 0, 3.5, 0, wallB); add(tbox(18, 1.2, 0.7, 2), M.beamDark, 0, 0.6, 0.05, wallB);
const desk = add(tbox(7, 0.7, 1.2, 2), M.beam, 80, 0.35, -21, world);

// clouds: painted billboards far away (no fog, no ink)
const clouds = [];
{ const r = P.rng(90);
  for (let i = 0; i < 12; i++) {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400; const pen = new T.Pen(c.getContext('2d')); pen.ol = 0;
    pen.g.translate(300, 200); pen.g.scale(1.4, 1.2); pen.g.translate(-300, -200); T.fxCloud(pen, i + 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.667), new THREE.MeshBasicMaterial({ map: P.tex(c), transparent: true, fog: false, depthWrite: false }));
    const a = r() * Math.PI * 2, d = 650 + r() * 250; m.position.set(Math.cos(a) * d, 120 + r() * 160, Math.sin(a) * d); m.scale.setScalar(160 + r() * 140);
    m.userData.ndSkip = true; m.renderOrder = -1; scene.add(m); clouds.push(m);
  } }
const helmet = new THREE.Group(); scene.add(helmet); helmet.visible = false;


// ---------- cards ----------
const CW = 720, CH = 1200, CM = 2.25; // canvas px, card height in metres (design 600x1000 -> 2.25 m)
const cardGeo = new THREE.PlaneGeometry(CM * 0.6, CM); cardGeo.translate(0, CM / 2 - CM * 0.025, 0);
const blobTex = P.tex(P.radial('20,14,30', 0.6));
class Card {
  constructor(scale = 1) {
    [this.c, this.g] = (() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return [c, c.getContext('2d')]; })();
    this.t = new THREE.CanvasTexture(this.c); this.t.colorSpace = THREE.SRGBColorSpace; this.t.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(cardGeo, this.mat); this.mesh.userData.nd = cardNd(this.t); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.t, alphaTest: 0.5 });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: true }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.userData.ndSkip = true; this.blob.renderOrder = 1;
    scene.add(this.mesh); scene.add(this.blob); this.key = ''; this.mesh.visible = this.blob.visible = false;
  }
  draw(key, fn) {
    if (key === this.key) return; this.key = key;
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH); g.setTransform(CW / 600, 0, 0, CH / 1000, 0, 0);
    const p = new T.Pen(g); fn(p); this.t.needsUpdate = true;
  }
}
const cards = []; const getCard = (i) => cards[i] || (cards[i] = new Card());

// ---------- render targets & post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtNd = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtInk = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsGeo = new THREE.PlaneGeometry(2, 2);
const fs = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(fsGeo, mat)); return s; };
const inkU = { col: { value: rtColor.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, px: { value: 1.6 }, fogCol: { value: new THREE.Color() },
  sat: { value: 1.08 }, lift: { value: new THREE.Color(0, 0, 0) }, gain: { value: new THREE.Color(1, 1, 1) }, vig: { value: 0.22 }, flash: { value: 0 } };
const inkScene = fs(new THREE.ShaderMaterial({ uniforms: inkU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D col, nd; uniform vec2 res; uniform float px, sat, vig, flash; uniform vec3 fogCol, lift, gain; varying vec2 vUv;
  float edgeAt(vec2 uv, float r){
    vec4 c = texture2D(nd, uv); if (dot(c.rgb,c.rgb) < .01) return 0.; float d = c.a; vec3 n = c.rgb*2.-1.;
    float e = 0.; float rr = r * clamp(7./d, .62, 1.25);
    for (int i=0;i<16;i++){ float a = float(i)*.785398 + (i>7 ? .39 : 0.); float k = i>7 ? .5 : 1.;
      vec2 o = vec2(cos(a), sin(a))*rr*k/res; vec4 s = texture2D(nd, uv+o);
      float ds = s.a; bool card = dot(s.rgb,s.rgb) < .01;
      if (card && ds > 0.) continue;            // character cards: never outlined by the world ink
      if (card) ds = 1e4;                        // sky
      vec3 ns = s.rgb*2.-1.;
      e = max(e, smoothstep(.006, .02, (ds - d)/d));                           // depth jump, near side only
      if (!card && abs(ds-d)/d < .06) e = max(e, smoothstep(.88, .72, dot(n, ns)) * .9); // crease
    }
    return e * (1. - smoothstep(140., 520., d)*.8);
  }
  void main(){
    vec3 c = texture2D(col, vUv).rgb;
    float e = edgeAt(vUv, px);
    c = mix(c, vec3(.012,.01,.014), e);
    if (flash < -0.5) c = vec3(e);
    float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, sat);
    c = c*gain + lift;
    vec2 q = vUv-.5; c *= 1. - vig*dot(q*vec2(1.,.75), q*vec2(1.,.75))*2.2;
    c = mix(c, vec3(1.), flash);
    gl_FragColor = vec4(c,1.); }` }));
const dofU = { src: { value: rtInk.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, focus: { value: 5 }, cinf: { value: 0 }, near: { value: 1 } };
const dofScene = fs(new THREE.ShaderMaterial({ uniforms: dofU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D src, nd; uniform vec2 res; uniform float focus, cinf, near; varying vec2 vUv;
  float coc(vec2 uv){ float d = texture2D(nd, uv).a; if (d <= 0.) d = 2000.; float k = 1. - focus/d; return k > 0. ? cinf*k : min(-k*cinf*near, cinf*1.4); }
  void main(){
    float c0 = coc(vUv);
    if (cinf < .5 || c0 < .6) { gl_FragColor = linearToOutputTexel(vec4(texture2D(src, vUv).rgb, 1.)); return; }
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i=0;i<48;i++){ float fi = float(i); float r = sqrt((fi+.5)/48.); float a = fi*2.39996;
      vec2 o = vec2(cos(a), sin(a))*r*c0/res; float cs = coc(vUv+o);
      float w = smoothstep(r*c0-1.5, r*c0+.5, cs + .5);
      acc += texture2D(src, vUv+o).rgb*w; wsum += w; }
    gl_FragColor = linearToOutputTexel(vec4(acc/max(wsum,1e-3), 1.)); }` }));
// final copy with sRGB handled by the renderer output (we render to screen with linear->sRGB in the shader chunk)
dofScene.children[0].material.toneMapped = false;

// ---------- per-frame state ----------
const tmpV = new THREE.Vector3();
function applyLight(L, f) {
  hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemi;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  scene.fog.color.set(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  skyU.top.value.set(L.skyTop); skyU.hor.value.set(L.skyHor); skyU.sunCol.value.set(L.sunDisc || '#000'); skyU.sunSize.value = L.sunSize || 0;
  inkU.sat.value = L.sat; inkU.gain.value.set(L.gain || '#ffffff'); inkU.lift.value.set(L.lift || '#000000');
  waterU.deep.value.set(L.waterDeep); waterU.shal.value.set(L.waterShal); waterU.glint.value.set(L.glint);
}
function placeSun(L, focus) {
  // sun direction from azimuth/elevation in world space
  const az = rx(L.az), el = rx(L.el); tmpV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  skyU.sunDir.value.copy(tmpV);
  sun.position.copy(focus).addScaledVector(tmpV, 80); sun.target.position.copy(focus);
  const ext = L.shadowExt || 30, sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
}

function worldState(S, f) {
  wheat.forEach((m, i) => { const k = (S.trample || [0, 0, 0])[i]; m.scale.y = 1 - 0.85 * k; m.material.color.copy(wheatGold).lerp(wheatDead, k); });
  millHead.rotation.z = -f * 0.07;
  const T_ = S.truck; truck.visible = !!T_;
  if (T_) { truck.position.set(T_.x, T_.y || 0, T_.z); truck.rotation.set(T_.roll || 0, T_.yaw || 0, T_.pitch || 0); wheels.forEach((w) => { w.rotation.z = -(T_.spin || 0); }); }
  waterU.t.value = f / 30;
}

function drawActors(list, cam) {
  cards.forEach((c) => { c.mesh.visible = c.blob.visible = false; });
  list.forEach((a, i) => {
    const c = getCard(i);
    c.draw(a.key, a.draw);
    c.mesh.visible = true; c.mesh.position.set(a.x, a.y, a.z);
    const s = a.s || 1; c.mesh.scale.set(s * (a.flip ? -1 : 1), s, s);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - a.x, cam.position.z - a.z) + (a.yaw || 0), a.roll || 0);
    c.mat.color.set(a.tint || '#ffffff'); c.mat.opacity = a.alpha ?? 1;
    c.mesh.castShadow = a.shadow !== false;
    c.mesh.renderOrder = a.order || 2;
    if (a.blob !== false && a.y < DECK + 0.5) { c.blob.visible = true; c.blob.position.set(a.x, (a.ground ?? DECK) + 0.02, a.z); c.blob.scale.set(0.95 * s, 0.6 * s, 1); }
  });
}

const helmetState = (h) => {
  helmet.visible = !!h; if (!h) return;
  helmet.position.set(h.x, h.y, h.z); helmet.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); helmet.scale.setScalar(h.s || 0.17);
};

const swapForNd = (on) => {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      o.userData.mat0 = o.material;
      if (o.userData.ndSkip) { o.userData.vis0 = o.visible; o.visible = false; return; }
      if (o === sky || o.userData.sky) { o.userData.vis0 = o.visible; o.visible = false; return; }
      o.material = o.userData.nd || ndMat;
    } else {
      o.material = o.userData.mat0; if (o.userData.vis0 !== undefined) { o.visible = o.userData.vis0; delete o.userData.vis0; }
    }
  });
};

window.renderFrame = (f) => {
  const S = shotAt(f), L = lightFor(S, f), C = camAt(f);
  applyLight(L, f);
  camera.position.set(...C.pos); camera.up.set(0, 1, 0); camera.lookAt(...C.look); camera.rotateZ(rx(C.roll || 0));
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const W_ = worldAt(f); worldState(W_, f);
  placeSun(L, new THREE.Vector3(...(C.shadowAt || C.look)));
  drawActors([...actorsAt(f, T), ...fxAt(f, T)], camera);
  helmetState(W_.helmet);
  sky.position.copy(camera.position);
  for (const c of clouds) c.quaternion.copy(camera.quaternion);
  // pass A: colour
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  // pass B: normal + depth
  const fog = scene.fog; scene.fog = null; const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.shadowMap.autoUpdate = false;
  swapForNd(true); renderer.setRenderTarget(rtNd); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera); swapForNd(false);
  scene.fog = fog; renderer.shadowMap.enabled = sm; renderer.shadowMap.autoUpdate = true;
  if (window.DEBUG_ND) { const dm = new THREE.MeshBasicMaterial({ map: rtNd.texture }); const ds = fs(dm); renderer.setRenderTarget(null); renderer.render(ds, fsCam); return true; }
  // ink + grade
  const D = dofAt(f);
  inkU.px.value = 2.5 * RS; inkU.flash.value = window.DEBUG_E ? -1 : (C.flash || 0); inkU.vig.value = L.vig ?? 0.22;
  renderer.setRenderTarget(rtInk); renderer.render(inkScene, fsCam);
  // lens
  dofU.focus.value = D.focus; dofU.cinf.value = D.cinf * RS; dofU.near.value = D.near ?? 1;
  renderer.setRenderTarget(null); renderer.render(dofScene, fsCam);
  return true;
};
window.TOTAL = TOTAL;
window.ready = true;
