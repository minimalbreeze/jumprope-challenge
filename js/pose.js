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

  // 개발용 가짜 사람: window.__simJump = true 면 1초에 2번 뛰고, false 면 가만히 서 있다.
  function simulate(onFrame) {
    const t0 = performance.now();
    const iv = setInterval(() => {
      const t = performance.now(), ph = ((t - t0) % 500) / 500;
      const lift = window.__simJump ? Math.max(0, Math.sin(ph * Math.PI * 2)) * 0.05 : 0;
      const n = () => (Math.random() - 0.5) * 0.004;
      const P = (x, y) => ({ x: x + n(), y: y - lift + n(), z: 0, visibility: 0.99 });
      const lm = [];
      for (let i = 0; i < 33; i++) lm[i] = P(0.5, 0.2);
      lm[0] = P(0.5, 0.18); lm[11] = P(0.45, 0.3); lm[12] = P(0.55, 0.3);
      lm[13] = P(0.42, 0.42); lm[14] = P(0.58, 0.42); lm[15] = P(0.4, 0.52); lm[16] = P(0.6, 0.52);
      lm[23] = P(0.47, 0.55); lm[24] = P(0.53, 0.55); lm[25] = P(0.47, 0.7); lm[26] = P(0.53, 0.7);
      lm[27] = P(0.47, 0.85); lm[28] = P(0.53, 0.85);
      onFrame(t, lm);
    }, 33);
    return () => clearInterval(iv);
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

  window.JumpPose = { load, track, JumpDetector, analyze, SIM };
})();
