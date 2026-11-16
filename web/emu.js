// ---------------- Emu War cast (appended after toonbase.js + roman.js, same module scope) ----------------
Object.assign(OUTFITS, {
  soldier: { tunic: "#8f8a52", skin: "#f5c9a0", cap: "#6f6a3a" },
  soldierB: { tunic: "#86834b", skin: "#e8c3a0", cap: "#625d34", moustache: "#5a3b22" },
  major: { tunic: "#7e7a45", skin: "#f3c69c", cap: "#4f4a2a", moustache: "#7a4a22", stout: true },
  farmer: { tunic: "#a8633f", skin: "#f1c29a", cap: "#c9a45a" },
  farmerB: { tunic: "#4f6f8f", skin: "#e8c3a0", cap: "#d8c9a6", moustache: "#c9b08a" },
  farmerC: { tunic: "#d9a441", skin: "#f5c9a0", hair: "#6a3b22", dress: "#b4506f" },
  pol: { tunic: "#2f3550", skin: "#f5c9a0", hair: "#b9b9bd", stout: true },
  polB: { tunic: "#4a2f3f", skin: "#ecc19c", hair: "#2b211c", moustache: "#2b211c" },
  reader: { tunic: "#5d8a6a", skin: "#f5c9a0", cap: "#3a3a44" },
});

const txt = (p, s, x, y, size, fill = "#ffffff", ol = 10, rot = 0) => {
  const g = p.g; g.save(); g.translate(x, y); g.rotate(rot); g.font = `900 ${size}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (ol) { g.lineWidth = ol; g.strokeStyle = INK; g.strokeText(s, 0, 0); }
  g.fillStyle = fill; g.fillText(s, 0, 0); g.restore();
};

/** Emu, side view facing right (mirror with flip). step 0 = standing, else 0..1 gait phase. */
export const emuCard = (p, o = {}) => {
  const { step = 0, mood = "calm", bob = 0, blink = 0, neck = 0, medal = false, mouth = 0, head = 0 } = o;
  const FUR = "#8c6b4e", FUR2 = "#6a4e38", FUR3 = "#a98763", NECK = "#9db7c2", LEG = "#c8b08a";
  const by = 585 - bob * 600, sw = (ph) => Math.sin(ph * Math.PI * 2);
  const leg = (ph, hx, col) => {
    const mv = step ? 1 : 0, lift = mv * Math.max(0, Math.cos(ph * Math.PI * 2)) * 70;
    const fx = hx + 62 * sw(ph) * mv, fy = 968 - lift, kx = hx + 30 + 20 * sw(ph + 0.25) * mv, ky = (by + 100 + fy) / 2;
    p.band(curve([hx, by + 90], [kx, ky], [fx, fy - 10]), col, 24, 7, "round");
    for (const d of [-6, 16, 38]) p.band([[fx, fy - 10], [fx + 26 + d, fy + 2]], col, 11, 5, "round");
  };
  leg((step + 0.5) % 1, 285, "#a8916c");
  p.ell(200, by + 6, 88, 102, FUR2, 11, 0, 360, -12);
  p.ell(305, by, 162, 112, FUR, 12);
  p.ell(335, by - 34, 105, 46, FUR3, 0);
  for (let i = 0; i < 9; i++) p.stroke(curve([170 + i * 38, by - 50 + (i % 3) * 22], [176 + i * 38, by - 20 + (i % 3) * 22], [168 + i * 38, by + 4 + (i % 3) * 22]), 6, FUR2);
  p.ell(300, by + 14, 46, 24, FUR2, 6, 0, 360, -14);
  leg(step, 335, LEG);
  const nx = neck * 30 + head * 14;
  p.ell(410, by - 40, 52, 46, FUR, 0);
  p.band(curve([408, by - 48], [452 + neck * 22, by - 190], [440 + nx, by - 322]), NECK, 36, 8, "round");
  const hx = 450 + nx, hy = by - 350;
  p.ell(hx, hy, 40, 31, NECK, 9);
  const bo = mouth * 16;
  p.poly([[hx + 30, hy - 14], [hx + 104, hy + 2 - bo * 0.3], [hx + 32, hy + 4]], "#6a5a46", 8);
  p.poly([[hx + 30, hy + 5], [hx + 92, hy + 8 + bo], [hx + 30, hy + 20]], "#594a38", 8);
  for (const d of [-14, 0, 14]) p.stroke([[hx + d - 6, hy - 26], [hx + d - 2, hy - 46 - Math.abs(d) * 0.3]], 6, FUR2);
  const ex = hx + 14, ey = hy - 8;
  p.ell(ex, ey, 14, 15, "#ffffff", 5); p.dot(ex + 5, ey + 1, mood === "alert" ? 4 : 6);
  if (blink || mood === "smug") { p.poly([[ex - 17, ey - 17], [ex + 17, ey - 17], [ex + 17, ey + (blink ? 2 : -4)], [ex - 17, ey + (blink ? 2 : -4)]], NECK, 0); p.stroke([[ex - 16, ey + (blink ? 2 : -4)], [ex + 16, ey + (blink ? 2 : -4)]], 6); }
  if (mood === "mad") p.stroke([[ex - 18, ey - 20], [ex + 18, ey - 8]], 8);
  if (mood === "alert") p.stroke([[ex - 16, ey - 22], [ex + 16, ey - 26]], 6);
  if (medal) {
    p.poly([[386, by - 96], [420, by - 96], [440, by - 20], [412, by - 14]], "#c0302c", 6);
    p.poly([[420, by - 96], [446, by - 96], [466, by - 22], [440, by - 20]], "#2f5fb8", 6);
    p.ell(436, by + 10, 36, 36, "#f2c640", 7); p.ell(436, by + 10, 20, 20, "#ffe58a", 4);
  }
};

/** Lewis-style machine gun pointing right. flash 0..1 = muzzle flash. */
export const gunCard = (p, o = {}) => {
  const { flash = 0, legs = true } = o;
  if (legs) { p.band([[250, 700], [180, 960]], "#4a3a2a", 12, 5, "round"); p.band([[270, 700], [350, 960]], "#4a3a2a", 12, 5, "round"); }
  p.band([[100, 700], [50, 760]], "#7a4a2a", 30, 6, "round");
  p.band([[110, 700], [470, 690]], "#3a3a3e", 20, 6, "round");
  p.band([[190, 698], [390, 692]], "#6a6a72", 34, 7, "round");
  p.ell(240, 640, 52, 52, "#4a4a50", 8); p.ell(240, 640, 24, 24, "#6a6a72", 5);
  if (flash > 0) {
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = (i % 2 ? 26 : 70 + 40 * flash); pts.push([500 + Math.cos(a) * r * 1.3, 690 + Math.sin(a) * r]); }
    p.poly(pts, "#ffd84a", 6); p.ell(500, 690, 22, 18, "#ffffff", 0);
  }
};

export const crateCard = (p, o = {}) => {
  const { pop = 1 } = o, g = p.g; g.save(); g.translate(300, 960); g.scale(pop, pop); g.translate(-300, -960);
  p.poly(rrect(90, 640, 510, 960, 8), "#b98a52", 11);
  for (const y of [720, 800, 880]) p.stroke([[94, y], [506, y]], 5, "#8a6238");
  p.band([[90, 650], [510, 650]], "#8a6238", 26, 5); p.band([[90, 950], [510, 950]], "#8a6238", 26, 5);
  p.poly(rrect(150, 730, 450, 870, 10), "#f0e4c0", 7);
  txt(p, "10,000", 300, 782, 70, "#c0302c", 10); txt(p, "BULLETS", 300, 842, 40, "#3a2614", 6);
  for (let i = 0; i < 5; i++) { p.poly(rrect(150 + i * 62, 590, 190 + i * 62, 650, 14), "#d9a845", 6); p.poly([[150 + i * 62, 596], [170 + i * 62, 556], [190 + i * 62, 596]], "#b87a3a", 6); }
  g.restore();
};

/** wooden board on a post. lines: [{t,size,col,dy}] */
export const signCard = (p, o = {}) => {
  const { lines = [], w = 480, top = 150, bot = 520, col = "#d8c08a" } = o;
  p.band([[300, bot - 20], [300, 972]], "#6a4a2e", 34, 7, "butt");
  p.poly(rrect(300 - w / 2, top, 300 + w / 2, bot, 14), col, 12);
  p.poly(rrect(300 - w / 2 + 16, top + 16, 300 + w / 2 - 16, bot - 16, 8), null, 5);
  let y = top + (bot - top) / (lines.length + 1);
  for (const l of lines) { txt(p, l.t, 300, y, l.size || 70, l.col || "#3a2614", l.ol ?? 0); y += (bot - top) / (lines.length + 1); }
};

/** wall calendar on a post: crossed = how many days are struck out */
export const calCard = (p, o = {}) => {
  const { crossed = 0, title = "DAYS", red = "#c0302c" } = o;
  p.band([[300, 640], [300, 972]], "#6a4a2e", 34, 7, "butt");
  p.poly(rrect(40, 120, 560, 660, 12), "#f6f0dc", 11);
  p.poly(rrect(40, 120, 560, 210, 12), red, 11);
  txt(p, title, 300, 166, 56, "#ffffff", 8);
  for (let i = 0; i < 28; i++) {
    const c = i % 7, r = Math.floor(i / 7), x = 85 + c * 72, y = 262 + r * 98;
    txt(p, String(i + 1), x, y, 34, "#3a3a44", 0);
    if (i < crossed) { p.stroke([[x - 28, y - 28], [x + 28, y + 28]], 9, red); p.stroke([[x + 28, y - 28], [x - 28, y + 28]], 9, red); }
  }
};

export const newsCard = (p, o = {}) => {
  const { head = "EMUS WIN!", sub = "ARMY BEATEN BY BIRDS", ang = 0 } = o, g = p.g;
  g.save(); g.translate(300, 600); g.rotate(rad(ang)); g.translate(-300, -600);
  p.poly(rrect(80, 230, 520, 770, 10), "#f4ecd2", 11);
  txt(p, "THE DAILY NEWS", 300, 280, 36, "#2a2a30", 0);
  p.stroke([[100, 308], [500, 308]], 5);
  txt(p, head, 300, 362, head.length > 11 ? 46 : 62, "#c0302c", 9);
  txt(p, sub, 300, 412, 25, "#2a2a30", 0);
  p.poly(rrect(110, 440, 340, 640, 6), "#cfe3f2", 6);
  p.ell(230, 600, 100, 40, "#9a7a3a", 0);
  p.ell(210, 560, 40, 30, "#8c6b4e", 5); p.band([[236, 548], [262, 500], [258, 470]], "#9db7c2", 14, 5, "round"); p.ell(262, 466, 16, 12, "#9db7c2", 5); p.dot(266, 464, 4);
  for (let i = 0; i < 6; i++) p.stroke([[360, 456 + i * 30], [490, 456 + i * 30]], 7, "#8a8a94");
  for (let i = 0; i < 5; i++) p.stroke([[110, 664 + i * 20], [490, 664 + i * 20]], 6, "#8a8a94");
  g.restore();
};

// ---- effects ----
export const fxQ = (p, t) => { const k = 0.8 + 0.2 * Math.sin(t * 20); txt(p, "?", 300, 560 - 40 * Math.min(1, t * 3), 220 * k, "#ffd84a", 18, Math.sin(t * 12) * 0.2); };
export const fxHaha = (p, t) => { txt(p, "HA!", 220 + 30 * Math.sin(t * 25), 520, 150, "#fff3b0", 16, -0.2 + 0.1 * Math.sin(t * 30)); txt(p, "HA!", 390, 640 + 20 * Math.sin(t * 25 + 2), 120, "#fff3b0", 14, 0.2); };
export const fxBang = (p, t) => {
  const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = (i % 2 ? 90 : 190) * (0.7 + 0.5 * Math.min(1, t * 3)); pts.push([300 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.8]); }
  p.poly(pts, "#ffd84a", 9); txt(p, "BANG!", 300, 520, 84, "#c0302c", 12, -0.12);
};
export const fxBullet = (p) => { p.ell(300, 500, 36, 14, "#ffd84a", 6); };
export const fxSweat = (p) => { p.ell(300, 500, 30, 48, "#bfe4ff", 7); };
export const fxFeather = (p, col = "#8c6b4e") => { p.ell(300, 500, 70, 22, col, 8, 0, 360, -30); p.stroke([[240, 520], [360, 480]], 5, FUR_DARK); };
const FUR_DARK = "#5a4030";
export const fxGrain = (p) => { p.ell(300, 500, 20, 10, "#f2c24a", 5, 0, 360, 30); };
export const fxSpeed = (p, t) => { for (let i = 0; i < 4; i++) p.stroke([[60 + ((t * 300 + i * 90) % 400), 440 + i * 50], [200 + ((t * 300 + i * 90) % 400), 440 + i * 50]], 9, "#ffffffcc"); };
export const fxSmoke = (p, t) => { const g = p.g; g.save(); g.globalAlpha = Math.max(0, 1 - t); for (let i = 0; i < 4; i++) p.ell(260 + i * 20 + 30 * t, 660 - i * 60 - 120 * t, 50 + 40 * t, 44 + 36 * t, "#6a6a70", 0); g.restore(); };
