/* 줄넘기 등급 챌린지 — AI 코치: 카메라 영상으로 자동 점프 세기 + 자세 분석
 *
 * 1) 자세 인식: Google MediaPipe Pose Landmarker(lite) — js/vendor/mediapipe 에 함께 넣어 둠 (Apache-2.0).
 *    영상은 폰 안에서만 분석하고 어디로도 보내지 않는다.
 * 2) 점프 세기(JumpDetector): 엉덩이 높이가 "서 있을 때 높이"보다 몸길이의 UP 비율 이상 올라갔다가
 *    다시 DOWN 아래로 내려오면 점프 1개. 몸길이(어깨~발목)로 나눠서 멀리서 찍든 가까이서 찍든 같은 기준.
 * 3) 분석(analyze): 끊김, 박자, 높이, 이동, 팔 벌림, 무릎, 후반 지침을 보고 잘한 점·고칠 점·연습법을 고른다.
 * 기준값은 모두 초기값이다. 실제 아이들 영상으로 맞춰야 한다.
 */
(function () {
  const BASE = new URL("js/vendor/mediapipe/", document.baseURI).href;
  const SIM = new URLSearchParams(location.search).has("sim"); // 개발용: 가짜 사람 데이터로 흐름 확인

  // ---------- 모델 불러오기 ----------
  let landmarker = null, loading = null;
  async function load() {
    if (SIM) return "sim";
    if (landmarker) return landmarker;
    if (!loading) loading = (async () => {
      const vision = await import(BASE + "vision_bundle.mjs");
      const files = await vision.FilesetResolver.forVisionTasks(BASE + "wasm");
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: BASE + "pose_landmarker_lite.task", delegate },
        runningMode: "VIDEO", numPoses: 1,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      try { landmarker = await vision.PoseLandmarker.createFromOptions(files, opts("GPU")); }
      catch (e) { landmarker = await vision.PoseLandmarker.createFromOptions(files, opts("CPU")); }
      return landmarker;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }

  /** 영상에서 매 프레임 자세를 읽어 onFrame(t, landmarks|null) 로 넘긴다. 멈출 함수를 돌려준다. */
  function track(video, onFrame) {
    let stop = false, raf = 0, lastT = -1;
    if (SIM) return simulate(onFrame);
    const step = () => {
      if (stop) return;
      if (video.readyState >= 2 && video.currentTime !== lastT) {
        lastT = video.currentTime;
        const t = performance.now();
        let lm = null;
        try { const r = landmarker.detectForVideo(video, t); lm = (r.landmarks && r.landmarks[0]) || null; } catch (e) {}
        onFrame(t, lm);
      }
      raf = requestAnimationFrame(step);
    };
    step();
    return () => { stop = true; cancelAnimationFrame(raf); };
  }

  // 개발용 가짜 사람 영상: window.__simJump = true 면 1초에 2번 뛰고, window.__simRope = true 면 줄도 돌린다.
  // 화면(캔버스)에 실제로 그려서 카메라 대신 쓰므로, 줄 감지·녹화까지 그대로 확인할 수 있다.
  let simCanvas = null, simLm = null;
  function simStream() {
    if (!simCanvas) { simCanvas = document.createElement("canvas"); simCanvas.width = 360; simCanvas.height = 640; drawSim(0); }
    return simCanvas.captureStream(30);
  }
  let noise = null;
  function drawSim(t) {
    if (!simCanvas) return;
    const ph = (t % 500) / 500, jumping = !!window.__simJump;
    const lift = jumping ? Math.max(0, Math.sin(ph * Math.PI * 2)) * 0.05 : 0;
    const n = () => (Math.random() - 0.5) * 0.004;
    const P = (x, y) => ({ x: x + n(), y: y - lift + n(), z: 0, visibility: 0.99 });
    const lm = [];
    for (let i = 0; i < 33; i++) lm[i] = P(0.5, 0.3);
    lm[0] = P(0.5, 0.28); lm[11] = P(0.44, 0.4); lm[12] = P(0.56, 0.4);
    lm[13] = P(0.38, 0.52); lm[14] = P(0.62, 0.52); lm[15] = P(0.33, 0.62); lm[16] = P(0.67, 0.62);
    lm[23] = P(0.47, 0.65); lm[24] = P(0.53, 0.65); lm[25] = P(0.47, 0.8); lm[26] = P(0.53, 0.8);
    lm[27] = P(0.47, 0.95); lm[28] = P(0.53, 0.95);
    simLm = lm;
    const W = simCanvas.width, H = simCanvas.height, x = simCanvas.getContext("2d");
    if (!noise) { // 바닥·벽 무늬 (고정)
      noise = document.createElement("canvas"); noise.width = W; noise.height = H;
      const c = noise.getContext("2d"), g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#9fb8c9"); g.addColorStop(0.75, "#c8d3d9"); g.addColorStop(0.76, "#8a7a66"); g.addColorStop(1, "#6f604f");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    }
    x.drawImage(noise, 0, 0);
    const X = (p) => p.x * W, Y = (p) => p.y * H;
    x.strokeStyle = "#2b2f45"; x.lineCap = "round"; x.lineWidth = 14;
    [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]].forEach(([a, b]) => { x.beginPath(); x.moveTo(X(lm[a]), Y(lm[a])); x.lineTo(X(lm[b]), Y(lm[b])); x.stroke(); });
    x.fillStyle = "#f2c9a8"; x.beginPath(); x.arc(X(lm[0]), Y(lm[0]), 26, 0, 7); x.fill();
    if (window.__simRope) { // 줄: 몸이 떠 있을 때 발밑, 내려올 때 머리 위
      const cy = (Y(lm[15]) + Y(lm[16])) / 2 + Math.cos((ph - 0.25) * Math.PI * 2) * H * 1.0;
      x.strokeStyle = "#e8484a"; x.lineWidth = 4; x.beginPath(); x.moveTo(X(lm[15]), Y(lm[15])); x.quadraticCurveTo(W / 2, cy, X(lm[16]), Y(lm[16])); x.stroke();
    }
  }
  function simulate(onFrame) {
    if (!simCanvas) simStream();
    const iv = setInterval(() => { const t = performance.now(); drawSim(t); onFrame(t, simLm); }, 33);
    return () => clearInterval(iv);
  }

  // ---------- 줄 감지 ----------
  // 줄을 돌리면 "다리 양옆 아래"와 "머리 위"에 줄이 지나가며 화면이 바뀐다. 줄 없이 뛰면 그 자리는 그대로다.
  // 프레임끼리 그 자리의 밝기 차이를 보고, 시작 전 가만히 있을 때(기준값)보다 확실히 크면 "줄이 지나갔다"로 본다.
  // 화면 끝의 빈 곳(C)도 같이 재서 폰이 흔들려 생긴 변화는 뺀다. 기준값은 초기값이다.
  class RopeSensor {
    constructor() { this.cvs = {}; this.prev = {}; this.hist = []; this.base = []; this.anchor = null; }
    energy(k, video, rx, ry, rw, rh, vw, vh) {
      const x0 = Math.max(0, rx), y0 = Math.max(0, ry), x1 = Math.min(vw, rx + rw), y1 = Math.min(vh, ry + rh);
      const w = x1 - x0, h = y1 - y0;
      if (w < 6 || h < 6) return 0;
      const sw = Math.max(8, Math.round(Math.min(w, 80))), sh = Math.max(8, Math.min(120, Math.round((h * sw) / w)));
      const cv = this.cvs[k] || (this.cvs[k] = document.createElement("canvas"));
      if (cv.width !== sw || cv.height !== sh) { cv.width = sw; cv.height = sh; this.prev[k] = null; }
      const c = cv.getContext("2d", { willReadFrequently: true });
      c.drawImage(video, x0, y0, w, h, 0, 0, sw, sh);
      const d = c.getImageData(0, 0, sw, sh).data, g = new Uint8Array(sw * sh);
      for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10;
      const p = this.prev[k]; this.prev[k] = g;
      if (!p || p.length !== g.length) return 0;
      let n = 0;
      for (let j = 0; j < g.length; j++) if (Math.abs(g[j] - p[j]) > 22) n++;
      return n / g.length;
    }
    /** 프레임마다 호출. calibrate=true 면 시작 전 기준값으로 모은다. */
    feed(t, lm, video, calibrate) {
      if (!video || !video.videoWidth || !JumpDetector.fullBody(lm)) return;
      const vw = video.videoWidth, vh = video.videoHeight;
      const sy = ((lm[11].y + lm[12].y) / 2) * vh, ay = Math.max(lm[27].y, lm[28].y) * vh;
      const cur = { axL: Math.min(lm[27].x, lm[28].x) * vw, axR: Math.max(lm[27].x, lm[28].x) * vw, ky: Math.min(lm[25].y, lm[26].y) * vh, ay, nx: lm[0].x * vw, ny: lm[0].y * vh, S: Math.max(40, ay - sy) };
      if (!this.anchor) this.anchor = { ...cur };
      else for (const k in cur) this.anchor[k] += (cur[k] - this.anchor[k]) * 0.08; // 천천히 따라가서 뛰는 동안 자리가 흔들리지 않게
      const A = this.anchor;
      const bands = {
        L: [A.axL - 0.42 * A.S, A.ky, 0.3 * A.S, A.ay - A.ky + 0.1 * A.S],
        R: [A.axR + 0.12 * A.S, A.ky, 0.3 * A.S, A.ay - A.ky + 0.1 * A.S],
        T: [A.nx - 0.35 * A.S, A.ny - 0.5 * A.S, 0.7 * A.S, 0.32 * A.S],
        C: [0, vh * 0.35, vw * 0.1, vh * 0.3],
      };
      const e = {};
      for (const k in bands) { const [x, y, w, h] = bands[k]; e[k] = this.energy(k, video, x, y, w, h, vw, vh); }
      const v = Math.max(0, Math.max(e.L, e.R, e.T) - e.C);
      this.hist.push({ t, v }); while (this.hist.length && t - this.hist[0].t > 6000) this.hist.shift();
      if (calibrate) { this.base.push(v); if (this.base.length > 120) this.base.shift(); }
    }
    threshold() { return Math.max(0.012, median(this.base) * 3 + 0.006); }
    /** t1~t2 사이에 줄이 지나간 흔적이 있었나 */
    passed(t1, t2) { const th = this.threshold(); return this.hist.some((h) => h.t >= t1 - 150 && h.t <= t2 + 80 && h.v > th); }
  }

  // ---------- 점프 세기 ----------
  const UP = 0.035, DOWN = 0.015, MIN_GAP = 200, WINDOW = 2500;
  const BODY = [11, 12, 23, 24, 25, 26, 27, 28];
  const vis = (p) => p && (p.visibility == null || p.visibility > 0.45);
  const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  function angle(a, b, c) {
    const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y];
    const d = Math.hypot(...v1) * Math.hypot(...v2) || 1;
    return (Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180) / Math.PI;
  }

  class JumpDetector {
    constructor() { this.hist = []; this.scales = []; this.air = false; this.peak = 0; this.lastLand = 0; this.jumps = []; this.knee = 180; }
    static fullBody(lm) { return !!lm && BODY.every((i) => vis(lm[i])); }
    /** 프레임 하나 → { visible, h, jump? } */
    feed(t, lm) {
      if (!JumpDetector.fullBody(lm)) return { visible: false };
      const sy = (lm[11].y + lm[12].y) / 2, hy = (lm[23].y + lm[24].y) / 2, ay = (lm[27].y + lm[28].y) / 2;
      this.scales.push(Math.max(0.05, ay - sy)); if (this.scales.length > 90) this.scales.shift();
      const S = median(this.scales);
      this.hist.push({ t, hy }); while (this.hist.length && t - this.hist[0].t > WINDOW) this.hist.shift();
      const ys = this.hist.map((p) => p.hy).sort((a, b) => a - b);
      const ground = ys[Math.floor(ys.length * 0.9)] || hy; // 땅에 서 있을 때(가장 낮은 자세) 엉덩이 높이
      const h = (ground - hy) / S;
      const kneeNow = (angle(lm[23], lm[25], lm[27]) + angle(lm[24], lm[26], lm[28])) / 2;
      if (!this.air) {
        if (h > UP) { this.air = true; this.peak = h; }
      } else {
        this.peak = Math.max(this.peak, h);
        if (h < DOWN) {
          this.air = false;
          if (t - this.lastLand > MIN_GAP) {
            const sw = Math.abs(lm[11].x - lm[12].x) || 0.01;
            const jump = {
              t, height: this.peak, interval: this.lastLand ? t - this.lastLand : 0,
              x: ((lm[23].x + lm[24].x) / 2) / S,
              spread: Math.abs(lm[15].x - lm[16].x) / sw,
              knee: kneeNow,
            };
            this.lastLand = t; this.jumps.push(jump);
            return { visible: true, h, jump };
          }
        }
      }
      return { visible: true, h };
    }
  }

  // ---------- 분석과 연습법 ----------
  const DRILLS = {
    breaks: { name: "줄 없이 콩콩", how: "줄 없이 손목만 빙빙 돌리면서 제자리에서 콩콩 20번. 3번 반복해." },
    timing: { name: "한 번씩 넘기", how: "줄을 머리 위로 넘기고, 줄이 발 앞 바닥에 닿을 때 '콩!' 하고 한 번만 넘기. 10번 해 봐." },
    rhythm: { name: "손뼉 박자", how: "어른이 '짝, 짝' 손뼉을 칠 때마다 한 번씩 콩. 줄 없이 20번, 익숙해지면 줄 들고 해 봐." },
    high: { name: "낮게 콩콩", how: "발뒤꿈치를 살짝 들고 앞꿈치로 낮게, 종이 한 장 높이만 뛰어. 줄 없이 30번." },
    uneven: { name: "같은 높이로", how: "벽에 손을 대고 같은 높이로만 콩콩 20번. 높이가 같으면 줄에 덜 걸려." },
    drift: { name: "X표 지키기", how: "바닥에 테이프로 X를 붙이고 그 위에서만 뛰기 20번. 앞으로 나가면 줄에 걸려." },
    arms: { name: "팔꿈치 붙이기", how: "팔꿈치를 옆구리에 딱 붙이고 손목으로만 줄 돌리기. 거울 보면서 10번." },
    knees: { name: "사뿐 착지", how: "무릎을 살짝 굽혀서 소리 안 나게 착지하기. 줄 없이 20번. 무릎이 다치지 않아." },
    stamina: { name: "30초 뛰고 30초 쉬기", how: "30초 뛰고 30초 쉬기를 3번. 이틀에 한 번 하면 점점 오래 뛸 수 있어." },
    start: { name: "첫 점프 성공하기", how: "줄을 뒤에 두고, 머리 위로 넘겨서 발 앞에 오면 두 발로 콩! 한 개씩 성공하는 연습부터 해." },
  };

  /** jumps: 점프 목록, breaks: 끊긴 시각 목록(ms), dur: 도전 시간(ms) → { metrics, good[], issues[] } */
  function analyze(jumps, breaks, dur) {
    const n = jumps.length, issues = [], good = [];
    const m = { count: n, breaks: breaks.length, tempo: 0, cv: 0, height: 0, heightCv: 0, drift: 0, spread: 0, knee: 180, fade: 0 };
    if (n < 3) {
      issues.push({ key: "start", title: "아직 점프가 거의 안 잡혔어", detail: `점프를 ${n}개 셌어. 줄을 넘는 타이밍을 먼저 익혀 보자.`, drill: DRILLS.start });
      return { metrics: m, good, issues };
    }
    const ints = jumps.map((j) => j.interval).filter((v) => v > 0 && v < 1500);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
    const sd = (a) => { const mu = mean(a); return Math.sqrt(mean(a.map((v) => (v - mu) ** 2))); };
    const hs = jumps.map((j) => j.height);
    m.tempo = ints.length ? Math.round(60000 / mean(ints)) : 0;
    m.cv = ints.length > 2 ? sd(ints) / mean(ints) : 0;
    m.height = mean(hs); m.heightCv = sd(hs) / (m.height || 1);
    m.drift = Math.max(...jumps.map((j) => j.x)) - Math.min(...jumps.map((j) => j.x));
    m.spread = median(jumps.map((j) => j.spread));
    m.knee = median(jumps.map((j) => j.knee));
    if (n >= 12 && ints.length >= 9) {
      const k = Math.floor(ints.length / 3), early = mean(ints.slice(0, k)), late = mean(ints.slice(-k));
      m.fade = late / early - 1;
    }
    const perMin = breaks.length / Math.max(dur / 60000, 0.25);
    if (breaks.length >= 2 && perMin >= 2) issues.push({ key: "breaks", score: perMin, title: "자주 끊겼어", detail: `${breaks.length}번 멈췄어. 줄을 넘는 타이밍이 아직 흔들려.`, drill: breaks.length >= 4 ? DRILLS.timing : DRILLS.breaks });
    if (m.cv > 0.25) issues.push({ key: "rhythm", score: m.cv * 4, title: "박자가 들쭉날쭉해", detail: "빨라졌다 느려졌다 해. 일정한 박자로 뛰면 훨씬 덜 걸려.", drill: DRILLS.rhythm });
    if (m.height > 0.11) issues.push({ key: "high", score: m.height * 10, title: "너무 높이 뛰어", detail: "높이 뛰면 금방 힘들어져. 줄이 지나갈 만큼만 낮게 뛰자.", drill: DRILLS.high });
    else if (m.heightCv > 0.4) issues.push({ key: "uneven", score: m.heightCv * 2, title: "높이가 매번 달라", detail: "어떤 땐 높고 어떤 땐 낮아. 같은 높이로 뛰는 연습을 해 보자.", drill: DRILLS.uneven });
    if (m.drift > 0.45) issues.push({ key: "drift", score: m.drift * 2, title: "자리에서 자꾸 움직여", detail: "뛰다 보니 옆이나 앞으로 이동했어. 제자리에서 뛰어야 줄에 안 걸려.", drill: DRILLS.drift });
    if (m.spread > 3.2) issues.push({ key: "arms", score: m.spread / 3, title: "팔을 너무 크게 벌려", detail: "팔을 크게 돌리면 줄이 짧아져서 걸리기 쉬워.", drill: DRILLS.arms });
    if (m.knee > 172) issues.push({ key: "knees", score: (m.knee - 165) / 6, title: "무릎이 뻣뻣해", detail: "무릎을 쭉 편 채로 착지했어. 살짝 굽혀야 사뿐하고 안 다쳐.", drill: DRILLS.knees });
    if (m.fade > 0.2) issues.push({ key: "stamina", score: m.fade * 4, title: "뒤로 갈수록 느려졌어", detail: "처음보다 끝에 많이 느려졌어. 체력을 조금씩 키워 보자.", drill: DRILLS.stamina });
    issues.sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!breaks.length && n >= 5) good.push("한 번도 안 끊기고 뛰었어!");
    if (ints.length > 4 && m.cv <= 0.15) good.push("박자가 아주 일정해. 메트로놈 같아!");
    if (m.height > 0 && m.height <= 0.08 && m.heightCv <= 0.35) good.push("낮고 가볍게, 같은 높이로 잘 뛰었어.");
    if (m.drift <= 0.25) good.push("제자리를 잘 지켰어.");
    if (m.knee <= 168) good.push("무릎을 살짝 굽혀서 사뿐하게 착지했어.");
    if (m.tempo >= 100) good.push(`1분에 ${m.tempo}개 빠르기로 뛰었어!`);
    if (!good.length) good.push("끝까지 도전한 게 제일 멋져!");
    return { metrics: m, good: good.slice(0, 3), issues: issues.slice(0, 3) };
  }

  window.JumpPose = { load, track, JumpDetector, RopeSensor, analyze, simStream, SIM };
})();
