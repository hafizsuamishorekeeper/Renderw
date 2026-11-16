"""Synthesized music bed + SFX for the soldier short, mixed under voice.mp3."""
import numpy as np, subprocess, wave

SR = 48000
DUR = 1897 / 30
N = int(DUR * SR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def load_voice():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "voice.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    v = np.frombuffer(raw, np.float32).copy()
    out = np.zeros(N, np.float32); out[:min(N, len(v))] = v[:N]; return out

def env(n, a=0.005, r=0.2, sus=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e

def lp(x, k):  # one-pole low-pass, k in (0,1)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y

def lp_fast(x, cutoff):
    # FFT brick-ish low-pass (fast, fine for beds)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)

def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)

def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < N and j > i: buf[i:j] += sig[: j - i] * gain

midi = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- music ----------------
music = np.zeros(N, np.float32)
BPM = 104; beat = 60 / BPM
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (55, [55, 59, 62]), (52, [52, 56, 59])]  # Am F G E
def pluck(f, dur=0.35, bright=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((bright ** k) * np.sin(2 * np.pi * f * (k + 1) * t) / (k + 1) for k in range(6))
    return (s * env(n, 0.003, dur * 0.35)).astype(np.float32)
def brass(fs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in fs:
        ph = 2 * np.pi * f * t + 0.003 * np.sin(2 * np.pi * 5 * t)
        s += sum(np.sin((k + 1) * ph) / (k + 1) ** 1.3 for k in range(8))
    a = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15).clip(0)
    return lp_fast((s * a).astype(np.float32), 1800) / len(fs)
def drum(kind):
    if kind == "kick":
        n = int(0.35 * SR); t = np.arange(n) / SR; f = 50 + 90 * np.exp(-t * 30)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)).astype(np.float32)
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = rng.standard_normal(n) * np.exp(-t * 28) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 20) * 0.5
    return hp_fast(s.astype(np.float32), 300)


F = lambda f: f / 30
# ---------------- music: jaunty outback march, then sad, then triumphant ----------------
music = np.zeros(N, np.float32)
BPM = 112; beat = 60 / BPM
prog = [(48, [48, 52, 55]), (53, [53, 57, 60]), (55, [55, 59, 62]), (48, [48, 52, 55])]  # C F G C
def tuba(f, dur=0.3): return pluck(f, dur, 0.35)
def march(t0, t1, vol=1.0, drums=True):
    bar = 0; tt = t0
    while tt < t1 - 0.05:
        root, ch = prog[bar % 4]
        for b in range(4):
            tb = tt + b * beat
            if tb >= t1: break
            if b % 2 == 0: place(music, tuba(midi(root - 12), 0.28), tb, 0.55 * vol)
            else: place(music, brass([midi(m) for m in ch], beat * 0.4), tb, 0.10 * vol)
            if drums:
                place(music, drum("snare"), tb + (0 if b % 2 else beat * 0.5), 0.22 * vol)
                if b % 2 == 0: place(music, drum("kick"), tb, 0.4 * vol)
            place(music, pluck(midi(ch[(b + bar) % 3] + 12), 0.18, 0.55), tb + beat / 2, 0.10 * vol)
        if bar % 2 == 1:
            for k, m in enumerate([ch[0] + 12, ch[2] + 12, ch[1] + 24]):
                place(music, brass([midi(m)], beat * 0.4), tt + 2 * beat + k * beat * 0.5, 0.06 * vol)
        bar += 1; tt += beat * 4
march(0.0, F(1413))
march(F(1451), F(1578), 0.9)
def wah(f0, d, vib=5):
    n = int(d * SR); t = np.arange(n) / SR; fr = f0 * (1 - 0.06 * t / d) * (1 + 0.012 * np.sin(2 * np.pi * vib * t))
    ph = np.cumsum(fr) / SR * 2 * np.pi; s = sum(np.sin((k + 1) * ph) / (k + 1) for k in range(6))
    return lp_fast((s * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1).clip(0)).astype(np.float32), 1100)
for k, m in enumerate([62, 61, 60, 58]):      # sad trombone: "went home"
    place(music, wah(midi(m), 0.55 if k < 3 else 1.3), F(1580) + k * 0.62, 0.22)
for k, m in enumerate([60, 64, 67, 64, 60, 64, 67, 72]):  # gentle pluck, "impressed"
    place(music, pluck(midi(m), 0.3, 0.5), F(1690) + k * 0.4, 0.22)
# triumphant fanfare for the score
fan = [(F(1756), 67, 0.25), (F(1756) + 0.28, 67, 0.25), (F(1756) + 0.56, 72, 0.5)]
for tf, m, d in fan: place(music, brass([midi(m), midi(m - 5), midi(m - 12)], d), tf, 0.16)
march(F(1840), F(1897), 1.1)
for m in (60, 64, 67, 72): place(music, brass([midi(m), midi(m - 12)], DUR - F(1868)), F(1868), 0.09)
place(music, drum("kick"), F(1868), 0.9)

# ---------------- sfx ----------------
sfx = np.zeros(N, np.float32)
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)
def thunk(f0=90, d=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 14) + lp_fast(noise(d), 1200) * np.exp(-t * 30) * 0.5).astype(np.float32)
def rumble(d):
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 160) * 3 * np.minimum(1, t / 0.15) * np.exp(-t / (d * 0.45))
    return s.astype(np.float32)
def crash(d=1.2):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n, np.float32)
    for k in range(14):
        tk = rng.uniform(0, d * 0.6); i = int(tk * SR); g = thunk(rng.uniform(60, 160), 0.35) * rng.uniform(0.3, 0.9)
        s[i:i + len(g)] += g[: n - i]
    s += lp_fast(noise(d), 2500) * np.exp(-t * 3) * 0.25
    return s
def cuckoo():
    out = []
    for f, d in [(740, 0.16), (587, 0.24)]:
        n = int(d * SR); t = np.arange(n) / SR
        out.append(np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.01) * np.exp(-t * 6)); out.append(np.zeros(int(0.06 * SR)))
    return np.concatenate(out).astype(np.float32)
def scrape(d=0.8):
    n = int(d * SR); t = np.arange(n) / SR
    s = noise(d) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) * np.sin(np.pi * t / d)
    s = hp_fast(lp_fast(s, 5000), 1500)
    ring = np.sin(2 * np.pi * 1870 * t) * np.exp(-t * 3) * 0.2
    return (s * 0.6 + ring).astype(np.float32)
def ting():
    n = int(1.2 * SR); t = np.arange(n) / SR
    return (sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(2093, 4), (3136, 6), (4186, 8)]) * 0.3).astype(np.float32)
def sting():
    n = int(2.0 * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * 41 * t) * np.exp(-t * 1.5) * 1.2
    hit = lp_fast(noise(2.0), 900) * np.exp(-t * 6) * 0.8
    stab = brass([midi(45), midi(48), midi(51)], 1.4); s = low + hit; s[: len(stab)] += stab * 2.2 * np.exp(-np.arange(len(stab)) / SR * 2)
    return s.astype(np.float32)
def creak(d=0.6, f0=140):
    n = int(d * SR); t = np.arange(n) / SR
    rate = f0 * (1 + 0.35 * np.sin(2 * np.pi * 1.3 * t / d))
    ph = np.cumsum(rate) / SR; pulses = (np.mod(ph, 1) < 0.08).astype(np.float32)
    s = lp_fast(pulses * (0.6 + 0.4 * rng.random(n).astype(np.float32)), 2200) * np.sin(np.pi * t / d)
    return hp_fast(s, 200) * 2.5
def snap():
    d = 0.5; n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(noise(d), 800) * np.exp(-t * 18) * 1.4 + np.pad(thunk(120, 0.4), (0, n - int(0.4 * SR))) * 0.6).astype(np.float32)
def splash(d=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 4000) * (np.exp(-t * 4) * np.minimum(1, t / 0.01)) + lp_fast(noise(d), 400) * np.exp(-t * 7) * 1.5
    return s.astype(np.float32)
def whoosh(d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 1500) * np.sin(np.pi * t / d) ** 2 * 0.6).astype(np.float32)
def snore(d=1.1):
    n = int(d * SR); t = np.arange(n) / SR
    buzz = (np.mod(np.cumsum(60 + 25 * np.sin(np.pi * t / d)) / SR, 1) < 0.3).astype(np.float32)
    return (lp_fast(buzz * 0.5 + noise(d) * 0.15, 700) * np.sin(np.pi * t / d) ** 2).astype(np.float32)
def leaves(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(lp_fast(noise(d), 6000), 2500) * (0.3 + 0.3 * np.sin(2 * np.pi * 0.7 * t) ** 2) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)).astype(np.float32)
def water(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 900) * 0.5 + hp_fast(lp_fast(noise(d), 3000), 1200) * 0.15 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))).astype(np.float32)


def blip(f0=520, d=0.12, up=1.6):
    n = int(d * SR); t = np.arange(n) / SR; fr = f0 * (1 + (up - 1) * t / d)
    return (np.sin(2 * np.cumsum(fr) / SR * np.pi) * np.exp(-t * 18) * 0.7).astype(np.float32)
def click(f0=900, d=0.05):
    n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(noise(d), 700) * np.exp(-t * 90) * 0.9 + np.sin(2 * np.pi * f0 * t) * np.exp(-t * 120) * 0.3).astype(np.float32)
def squawk(d=0.35, f0=420):
    n = int(d * SR); t = np.arange(n) / SR; fr = f0 * (1 + 0.5 * np.sin(2 * np.pi * 9 * t)) * (1 - 0.3 * t / d)
    ph = np.cumsum(fr) / SR * 2 * np.pi; s = sum(np.sin((k + 1) * ph) / (k + 1) for k in range(5))
    return (lp_fast(s.astype(np.float32), 2500) * np.minimum(1, t / 0.02) * np.exp(-t * 4)).astype(np.float32)
def ha(d=0.14, f0=300):
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f0 * (k + 1) * t) / (k + 1) for k in range(6)) * np.exp(-t * 14) + noise(d) * 0.1 * np.exp(-t * 20)
    return (lp_fast(s.astype(np.float32), 1800) * 0.5).astype(np.float32)
def engine(d, f0=40, rough=1.0):
    n = int(d * SR); t = np.arange(n) / SR; ph = np.cumsum(f0 * (1 + 0.15 * np.sin(2 * np.pi * 3 * t))) / SR
    s = (np.mod(ph, 1) < 0.35).astype(np.float32) * 2 - 1
    return (lp_fast(s * 0.5 + noise(d) * 0.1 * rough, 500) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.2).clip(0)).astype(np.float32)
def cheer(d=1.4):
    n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(lp_fast(noise(d), 3500), 500) * np.minimum(1, t / 0.1) * np.exp(-t / 0.9) * 0.9).astype(np.float32)
wind = (lp_fast(noise(DUR), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * np.arange(N) / SR)) * 0.25).astype(np.float32)
place(sfx, wind, 0, 0.25)
place(sfx, whoosh(0.6), F(30), 0.4)
place(sfx, squawk(0.4, 380), F(100), 0.5)
place(sfx, ha(0.4, 160), F(146), 0.0)
for k, m in enumerate([55, 54, 53, 51]): place(sfx, wah(midi(m), 0.3 if k < 3 else 0.7), F(146) + k * 0.28, 0.3)  # "and lost" womp
place(sfx, whoosh(0.8), F(212), 0.45)
for k in range(24): place(sfx, thunk(70 + (k % 3) * 8, 0.18), F(372) + k * 0.36, 0.28 + 0.1 * (k % 2))     # emus march in
for k in range(6): place(sfx, squawk(0.25, 360 + 40 * k), F(430) + k * 0.7, 0.18)
for k in range(5): place(sfx, ha(0.25, 200), F(540) + k * 0.12, 0.0)
place(sfx, brass([midi(60), midi(64), midi(67)], 0.5), F(600), 0.3)
for fr_ in (672, 686): place(sfx, blip(480, 0.14, 1.8), F(fr_), 0.45)
for fr_ in (702, 716): place(sfx, thunk(160, 0.25), F(fr_), 0.9); place(sfx, click(1500, 0.06), F(fr_), 0.8)
for fr_ in (732, 740, 748, 756, 764, 772): place(sfx, thunk(110, 0.22), F(fr_), 0.8)
place(sfx, ting(), F(790), 0.25)
for fr_ in (830, 846, 862): place(sfx, click(700, 0.07), F(fr_), 0.9)
for k in range(int((F(938) - F(892)) * 14)): place(sfx, click(1100 + 200 * (k % 3), 0.05), F(892) + k / 14, 0.7)     # machine guns
place(sfx, thunk(60, 0.5), F(892), 0.9)
for k in range(10): place(sfx, squawk(0.22, 440 + 25 * (k % 4)), F(945) + k * 0.16, 0.16)
for k in range(int(3.4 * 9)): place(sfx, thunk(75, 0.12), F(952) + k / 9, 0.18 * (1 - k / 32))                 # scatter footfalls
place(sfx, whoosh(0.5), F(1085), 0.45); place(sfx, whoosh(0.5), F(1128), 0.6)
for k in range(int(1.7 * 6)): place(sfx, thunk(95, 0.1), F(1082) + k / 6, 0.25)
place(sfx, wah(midi(52), 0.9, 6), F(1140), 0.25)
place(sfx, thunk(120, 0.3), F(1190), 0.8); place(sfx, engine(F(1262) - F(1196), 38), F(1196), 0.5)
for fr_ in (1282, 1300, 1318, 1334): place(sfx, thunk(100, 0.25), F(fr_), 0.9)
place(sfx, engine(F(1352) - F(1262), 55, 1.6), F(1262), 0.6)
for k in range(int(1.5 * 12)): place(sfx, click(1300, 0.05), F(1266) + k / 12, 0.5)
for fr_ in (1358, 1372, 1384): place(sfx, whoosh(0.4), F(fr_), 0.5)
place(sfx, engine(F(1405) - F(1353), 45, 1.4), F(1353), 0.4)
place(sfx, hp_fast(lp_fast(noise(1.0), 5000), 2000) * np.exp(-np.arange(SR) / SR * 2) * 0.6, F(1395), 0.6)   # steam
place(sfx, whoosh(0.5), F(1413), 0.6)
for k in range(28): place(sfx, click(1800 if k % 2 else 1400, 0.04), F(1416) + k * (F(1447) - F(1416)) / 28, 0.55)
for i_ in range(4): place(sfx, whoosh(0.3), F(1451 + i_ * 7), 0.3)
for k in range(10): place(sfx, ha(0.16, 260 + 40 * (k % 3)), F(1462) + k * 0.19, 0.45)
for k in range(5): place(sfx, blip(420 + 90 * (k % 3), 0.2, 1.7), F(1510) + k * 14 / 30, 0.4)
place(sfx, whoosh(0.4), F(1578), 0.5); place(sfx, engine(F(1682) - F(1580), 36), F(1580), 0.35)
place(sfx, ting(), F(1712), 0.35)
place(sfx, thunk(130, 0.3), F(1789), 0.8); place(sfx, wah(midi(50), 0.8), F(1792), 0.25)
place(sfx, cheer(1.6), F(1838), 0.6); place(sfx, ting(), F(1838), 0.4)
place(sfx, brass([midi(72), midi(64)], 0.5), F(1868), 0.0)
place(sfx, cheer(1.2), F(1870), 0.45)

voice = load_voice()
vm = np.abs(voice) > 0.02; vrms = float(np.sqrt(np.mean(voice[vm] ** 2))) if vm.any() else 0.1
ve = np.abs(voice); k = int(0.05 * SR)
ve = np.convolve(ve, np.ones(k) / k, "same"); duck = 1 - 0.4 * np.clip(ve / (ve.max() * 0.25), 0, 1)
bed = music * duck * 1.0 + sfx * 0.9
brms = float(np.sqrt(np.mean(bed[vm] ** 2))) if vm.any() else 0.1
bed *= (0.5 * vrms / max(brms, 1e-6))          # music + sfx at half the voice level
mix = voice + bed
mix = np.tanh(mix * 0.95) / np.tanh(0.95)
fade = int(0.04 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open("mix_raw.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", len(pcm) / SR, "voice_rms", vrms, "bed_rms_scaled", 0.5 * vrms)
