/* 줄넘기 등급 챌린지 — 도전(퀘스트) 화면: AI 코치 자동 판정
 *
 * 뛰는 아이는 폰을 들지 않는다. 다른 사람이 폰을 들고 찍기만 하면 AI 코치(js/pose.js)가
 * 영상 속 자세를 보고 점프를 자동으로 세고, 끊김·박자를 판정하고, 끝나면 자세를 분석해 연습법을 알려 준다.
 * 사람이 누르는 건 START(와 필요하면 그만) 하나뿐이다.
 * 영상과 분석 결과는 이 폰의 "내 영상"(js/clips.js)에만 저장한다.
 *
 * 흐름: 퀘스트 창 → (처음 한 번만) 안전 확인·촬영 안내 → 카메라와 AI 코치 준비 → START
 *       → 아이가 화면에 다 보이면 3·2·1 → 자동 측정 → 결과(영상·분석·연습법) → 씰
 */
(function () {
  const $ = (root, s) => root.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const fmtLong = (s) => (s >= 60 ? `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ""}` : `${s}초`);
  const BREAK_MS = 1500;   // 이만큼 점프가 없으면 끊김
  const LOST_MS = 1200;    // 이만큼 몸이 안 보이면 끊김

  // ---------- 소리 ----------
  let ac = null, soundOn = true;
  function unlockAudio() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume && ac.resume(); } catch (e) { ac = null; }
  }
  function beep(freq, dur = 0.08, vol = 0.18, type = "square", when = 0) {
    if (!soundOn || !ac) return;
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 0.2, "square", i * 0.12));
  const sadTone = () => [392, 330, 262].forEach((f, i) => beep(f, 0.22, 0.16, "triangle", i * 0.18));
  function say(text) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    try { const u = new SpeechSynthesisUtterance(text); u.lang = "ko-KR"; u.rate = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }

  // ---------- 카메라·녹화 ----------
  let stream = null, recorder = null, chunks = [];
  function stopCamera() {
    try { recorder && recorder.state !== "inactive" && recorder.stop(); } catch (e) {}
    recorder = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  async function openCamera() {
    if (stream) return true;
    if (JumpPose.SIM) { stream = JumpPose.simStream(); return true; } // 개발용 가짜 영상
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      return true;
    } catch (e) { stream = null; return false; }
  }
  function startRecording() {
    chunks = [];
    if (!stream || typeof MediaRecorder === "undefined") return;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    try {
      recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 1200000 });
      recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      recorder.start(1000);
    } catch (e) { recorder = null; }
  }
  function stopRecording() {
    return new Promise((res) => {
      if (!recorder || recorder.state === "inactive") return res(null);
      const mime = recorder.mimeType || "video/webm";
      recorder.onstop = () => res(chunks.length ? new Blob(chunks, { type: mime }) : null);
      try { recorder.stop(); } catch (e) { res(null); }
    });
  }

  // ---------- 화면 틀 ----------
  let layer = null, cleanup = [];
  function runCleanup() { cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = []; }
  function open() {
    runCleanup();
    if (layer) layer.remove();
    layer = document.createElement("div");
    layer.className = "quest-layer";
    layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true");
    document.body.appendChild(layer);
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    runCleanup(); stopCamera();
    if (layer) layer.remove(); layer = null;
    document.documentElement.style.overflow = "";
  }
  function npc(text) {
    return `<div class="npc"><div class="npc-face">${JumpSeals.coachSVG()}</div><div class="npc-talk"><span class="npc-name">콩콩 코치</span><p>${text}</p></div></div>`;
  }
  const ruleText = (g) => ({
    streak: `줄에 안 걸리고 <b>연속 ${g.n}개</b>를 뛰면 성공! 줄에 걸리거나 멈추면 <b>탈락</b>이야.`,
    speed: `<b>${g.sec}초 동안 ${g.n}개 이상</b> 뛰면 성공! 걸려도 다시 뛰면 이어서 세. 줄을 넘은 것만 세.`,
    beat: `"콩, 콩" 소리가 날 때마다 한 번씩 뛰어. 소리에 맞춰 <b>${g.n}개</b>를 이어서 뛰면 성공! 걸리거나 멈추면 <b>탈락</b>.`,
    endure: `<b>${fmtLong(g.sec)} 동안</b> 안 걸리고 계속 뛰면 성공! 줄에 걸리거나 멈추면 <b>탈락</b>.`,
  }[g.type]);

  // ---------- 1. 퀘스트 창 ----------
  let cur = null;
  function start(seal, opts = {}) {
    cur = { seal, opts };
    soundOn = opts.sound !== false;
    open();
    const holo = seal.grade > (opts.myGrade || 0);
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">QUEST · ${seal.grade}학년 코스 ${"★".repeat(seal.stage)}</div>
      ${npc(`${esc(opts.nick || "친구")}, 새 퀘스트야! 이번엔 <b>${seal.stageName}</b>이야.`)}
      <div class="quest-body">
        <div class="quest-goal"><span class="tag">목표</span><strong>${esc(seal.mission)}</strong><p>${ruleText(seal.goal)}</p></div>
        <div class="quest-reward"><span class="tag">보상</span><div class="reward-seal">${JumpSeals.sealSVG(seal, { empty: true })}</div><small>${holo ? "✨ 반짝이 씰" : "씰 1장"}</small></div>
      </div>
      <p class="parent-note" style="text-align:center">📹 누군가 폰으로 찍어 주기만 하면 <b>AI 코치가 자동으로 세고 판정</b>해. <b>줄을 넘은 점프만</b> 세니까 줄 없이 뛰면 안 돼!</p>
      <div class="qbtns"><button class="gbtn" data-go="${opts.firstTime ? "safety" : "camera"}">도전할래!</button><button class="gbtn gray" data-go="close">다음에</button></div>
    </div>`;
    wire();
  }
  function wire() {
    layer.onclick = (e) => {
      const b = e.target.closest("[data-go]"); if (!b) return;
      const go = b.dataset.go;
      if (go === "close") close();
      else if (go === "safety") safety();
      else if (go === "guide") guide();
      else if (go === "camera") camera();
      else if (go === "retry") { stopCamera(); start(cur.seal, { ...cur.opts, firstTime: false }); }
      else if (go === "dev-clear") { const o = cur.opts; close(); o.onClear && o.onClear({ dev: true }); }
    };
  }

  // ---------- 2. 안전 확인 (처음 한 번만) ----------
  const CHECKS = [
    ["🙆", "주변이 넓어요", "양팔을 벌리고 한 바퀴 돌아도 사람·가구·벽에 안 닿아요. 줄넘기 길이만큼(2m) 비워 줘."],
    ["👟", "운동화를 신었어요", "미끄러운 바닥이나 양말만 신고 뛰면 넘어질 수 있어."],
    ["📏", "찍는 사람은 멀리 서요", "찍는 사람은 뛰는 사람에게서 큰 걸음으로 3걸음 이상 떨어져. 줄에 맞으면 아파!"],
    ["🧑‍🍼", "어른이 함께해요", "찍는 사람이 어른이거나, 어른이 옆에서 봐 줘야 해."],
    ["🏠", "아래층을 생각했어요", "아파트 안에서 뛰면 아래층이 시끄러워. 밖이나 놀이터, 두꺼운 매트 위에서 하자."],
    ["💧", "힘들면 바로 멈출게요", "숨이 너무 차거나 어지러우면 바로 멈추고 쉬어. 씰은 다음에 또 딸 수 있어."],
  ];
  function safety() {
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">첫 도전 전에 꼭 확인!</div>
      ${npc("처음 한 번만 보여 줄게. 다치지 않아야 진짜 챔피언이야. 하나씩 눌러서 체크해 줘!")}
      <ul class="checks">${CHECKS.map(([ic, t, d], i) => `<li><button class="check" data-i="${i}" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="ic" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${d}</small></span></button></li>`).join("")}</ul>
      <p class="parent-note">보호자님께: 촬영한 영상은 이 폰의 "내 영상"에만 저장되고 어디에도 올라가지 않아요. 언제든 지울 수 있어요.</p>
      <div class="qbtns"><button class="gbtn" data-go="guide" id="okAll" disabled>모두 확인했어요 (0/${CHECKS.length})</button><button class="gbtn gray" data-go="close">그만두기</button></div>
    </div>`;
    const done = new Set();
    layer.querySelectorAll(".check").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      done.has(i) ? done.delete(i) : done.add(i);
      b.setAttribute("aria-pressed", done.has(i)); beep(done.has(i) ? 880 : 440, 0.05, 0.1);
      const ok = $(layer, "#okAll");
      ok.disabled = done.size < CHECKS.length;
      ok.textContent = ok.disabled ? `모두 확인했어요 (${done.size}/${CHECKS.length})` : "모두 확인했어요 ✔";
    }));
    unlockAudio();
  }
  function guide() {
    cur.opts.onSafetyDone && cur.opts.onSafetyDone();
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">찍는 사람은 이렇게!</div>
      ${npc("찍는 분은 폰을 들고 있기만 하면 돼요. 개수 세기와 판정은 제가 할게요!")}
      <div class="place">
        <div class="place-pic">${filmSVG()}</div>
        <div class="place-cards">
          <div class="pc ok"><b>① 3걸음 떨어져서 세로로 찍기</b><small>머리부터 발끝까지 화면에 다 나오게. 폰은 흔들리지 않게 잡아 줘.</small></div>
          <div class="pc ok"><b>② START 한 번만 누르기</b><small>아이가 화면에 다 보이면 3·2·1 하고 자동으로 시작해.</small></div>
          <div class="pc ok"><b>③ 끝나면 결과를 같이 보기</b><small>영상, 잘한 점, 고칠 점, 연습 방법이 나와. 영상은 "내 영상"에 저장돼.</small></div>
          <div class="pc no"><b>❌ 역광·어두운 곳은 피하기</b><small>해를 등지고 서 있거나 너무 어두우면 AI 코치가 몸을 잘 못 봐.</small></div>
        </div>
      </div>
      <div class="qbtns"><button class="gbtn" data-go="camera">카메라 켜기 📹</button></div>
    </div>`;
  }
  function filmSVG() {
    return `<svg viewBox="0 0 150 130" xmlns="http://www.w3.org/2000/svg" aria-label="한 사람이 폰으로 찍고 아이가 줄넘기하는 그림">
      <path d="M44 52 L104 22 L104 112 Z" fill="#ffd43b" opacity=".25"/>
      <circle cx="26" cy="34" r="12" fill="#ffdcc2" stroke="#4a2c2a" stroke-width="2.2"/><path d="M15 31 Q18 19 26 20 Q35 19 37 31 Q31 26 26 27 Q20 26 15 31Z" fill="#6b4a2a"/>
      <rect x="13" y="47" width="26" height="40" rx="9" fill="#2f9e44" stroke="#4a2c2a" stroke-width="2.2"/>
      <path d="M38 56 L48 50" stroke="#ffdcc2" stroke-width="6" stroke-linecap="round"/>
      <rect x="44" y="42" width="9" height="15" rx="2" fill="#2b2f45" stroke="#4a2c2a" stroke-width="1.6"/>
      <path d="M20 87 L19 110 M32 87 L33 110" stroke="#2d3f73" stroke-width="8" stroke-linecap="round"/>
      <path d="M108 66 Q125 128 142 66" fill="none" stroke="#ff6f61" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="125" cy="44" r="10" fill="#ffdcc2" stroke="#4a2c2a" stroke-width="2.2"/><path d="M115 41 Q118 31 125 32 Q133 31 135 41 Q130 37 125 38 Q119 37 115 41Z" fill="#4a2c2a"/>
      <rect x="114" y="55" width="22" height="28" rx="8" fill="#4dabf7" stroke="#4a2c2a" stroke-width="2.2"/>
      <path d="M114 62 L106 68 M136 62 L144 68" stroke="#ffdcc2" stroke-width="5" stroke-linecap="round"/>
      <path d="M119 83 L117 98 M131 83 L133 98" stroke="#2d3f73" stroke-width="7" stroke-linecap="round"/>
      <path d="M100 112 L150 112" stroke="#4fa83d" stroke-width="3"/>
      <text x="75" y="126" font-size="9" font-family="sans-serif" font-weight="700" fill="#2d3f73" text-anchor="middle">3걸음 떨어져서!</text>
    </svg>`;
  }

  // ---------- 3. 카메라 + AI 코치 준비 ----------
  async function camera() {
    unlockAudio();
    layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">AI 코치 준비 중…</div>${npc("카메라를 써도 되는지 물어보면 <b>허용</b>을 눌러 줘! 처음엔 준비하는 데 조금 걸려.")}<div class="loader" aria-hidden="true"></div></div>`;
    const [camOk, model] = await Promise.all([openCamera(), JumpPose.load().catch(() => null)]);
    if (!model || !camOk) {
      layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">앗, 준비가 안 됐어</div>
        ${npc(!model ? "AI 코치를 불러오지 못했어. 인터넷 연결을 확인하고 다시 해 볼래?" : "카메라를 못 켰어. 카메라 권한을 <b>허용</b>했는지 확인해 줘. (브라우저 주소창 옆 설정에서 바꿀 수 있어)")}
        <div class="qbtns"><button class="gbtn" data-go="camera">다시 해 보기</button><button class="gbtn gray" data-go="close">닫기</button>${cur.opts.dev ? `<button class="gbtn blue" data-go="dev-clear">개발용: 성공 처리</button>` : ""}</div></div>`;
      return;
    }
    run(camOk);
  }

  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
  function drawPose(cv, video, lm, ok) {
    const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    if (!lm) return;
    let sc = 1, dx = 0, dy = 0, vw = w, vh = h;
    if (video && video.videoWidth) { vw = video.videoWidth; vh = video.videoHeight; sc = Math.max(w / vw, h / vh); dx = (w - vw * sc) / 2; dy = (h - vh * sc) / 2; }
    const P = (p) => [p.x * vw * sc + dx, p.y * vh * sc + dy];
    x.lineWidth = 5; x.lineCap = "round"; x.strokeStyle = ok ? "#7dffb0cc" : "#ffd43bcc";
    BONES.forEach(([a, b]) => { if (lm[a] && lm[b]) { const [x1, y1] = P(lm[a]), [x2, y2] = P(lm[b]); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); } });
    x.fillStyle = "#fff";
    [0, 15, 16, 27, 28].forEach((i) => { if (lm[i]) { const [px, py] = P(lm[i]); x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); } });
  }

  // ---------- 4. 측정 (자동) ----------
  function run(camOk) {
    const seal = cur.seal, g = seal.goal;
    const limit = g.type === "speed" ? g.sec : g.limit;
    layer.innerHTML = `<div class="hud judge-hud">
      ${camOk ? `<video class="cam" id="cam" autoplay playsinline muted></video>` : `<div class="cam sim-bg"></div>`}
      <canvas class="cam pose" id="pose"></canvas>
      <div class="hud-shade"></div>
      <div class="hud-top"><span class="hud-quest">${esc(seal.mission)}</span><span class="hud-time" id="hTime">${fmt(limit)}</span></div>
      <div class="hud-mid">
        <div class="hud-big" id="hBig"></div>
        <div class="hud-sub" id="hSub"></div>
        <div class="judge" id="hJudge"></div>
        ${g.type === "beat" ? `<div class="beat" id="hBeat" aria-hidden="true"></div>` : ""}
      </div>
      <div class="exp" id="hExpBox" hidden><i id="hExp"></i><span id="hExpTxt">0 / ${g.n || fmtLong(g.sec)}</span></div>
      <div class="judge-row"><span class="body-chip" id="hBody">몸을 찾는 중…</span><button class="startbtn mini" id="goBtn">START</button><button class="gbtn gray" id="quit" hidden>■ 그만</button></div>
    </div>`;
    const el = (id) => $(layer, "#" + id);
    const v = el("cam"), cv = el("pose");
    if (v && stream) { v.srcObject = stream; v.play && v.play().catch(() => {}); }
    el("hBig").textContent = "";
    el("hSub").textContent = "아이가 머리부터 발끝까지 보이게 찍어 줘";

    const det = new JumpPose.JumpDetector(), rope = new JumpPose.RopeSensor();
    const S = { count: 0, combo: 0, best: 0, breaks: [], contStart: 0, endureBest: 0, lastJump: 0, lastSeen: 0, beatK: -1, lastTry: 0, ropeOk: 0, ropeMiss: 0, noRope: 0 };
    let phase = "ready", t0 = 0, seenSince = 0, beatT = 0, beatStart = 0, raf = 0;

    let lock = null;
    (async () => { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} })();
    cleanup.push(() => { try { lock && lock.release(); } catch (e) {} });

    const showJudge = (j, cls) => { const n = el("hJudge"); n.textContent = j; n.className = "judge " + cls; void n.offsetWidth; n.classList.add("show"); };
    const bump = () => { const b = el("hBig"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); };
    const bigVal = () => (g.type === "speed" ? S.count : S.combo);

    function onJump(j) {
      // 줄 확인: 이번 점프 사이에 줄이 지나간 흔적이 있어야 센다. 줄이 한 번 확인된 뒤 한 번 놓친 건 봐준다.
      const seen = rope.passed(S.lastTry || j.t - 900, j.t);
      S.lastTry = j.t;
      if (seen) { S.ropeMiss = 0; S.ropeOk++; } else S.ropeMiss++;
      if (!(seen || (S.ropeMiss === 1 && S.ropeOk > 0))) {
        S.noRope++;
        if (g.type === "speed") { showJudge("줄이 안 보여!", "ms"); beep(220, 0.15, 0.15, "sawtooth"); return; }
        return finish(false, "줄넘기 줄이 안 보였어. 줄을 돌려서 넘어야 인정돼!");
      }
      S.count++;
      if (g.type === "beat") {
        const k = Math.round((j.t - beatStart) / g.beat), diff = Math.abs(j.t - (beatStart + k * g.beat));
        if (k >= 0 && diff <= g.beat * 0.3 && k !== S.beatK) { S.combo++; S.beatK = k; showJudge(diff <= g.beat * 0.12 ? "PERFECT" : "GOOD", diff <= g.beat * 0.12 ? "pf" : "gd"); }
        else { S.combo = 0; showJudge("박자!", "ms"); }
      } else S.combo++;
      S.best = Math.max(S.best, S.combo);
      if (!S.contStart) S.contStart = j.t;
      S.lastJump = j.t;
      beep(S.combo && S.combo % 10 === 0 ? 1320 : 880, 0.04, 0.1);
      if (S.count % 10 === 0) say(`${S.count}개`);
      if (g.type !== "endure") el("hBig").textContent = String(bigVal());
      bump();
    }
    function onBreak(t, why) {
      S.breaks.push(t - t0);
      // 연속·박자·오래 뛰기는 걸리거나 멈추면 바로 탈락. 30초·1분 도전은 개수 미션이라 이어서 센다.
      if (g.type !== "speed") { beep(220, 0.25, 0.18, "sawtooth"); return finish(false, why === "화면 밖으로 나갔어!" ? "화면 밖으로 나갔어. 머리부터 발끝까지 보이는 자리에서 뛰어 줘!" : "줄에 걸렸거나 멈췄어. 탈락! 다시 도전해 보자"); }
      if (g.type !== "speed") { S.combo = 0; if (g.type !== "endure") el("hBig").textContent = "0"; }
      S.contStart = 0; S.beatK = -1;
      showJudge(why, "ms"); beep(220, 0.25, 0.18, "sawtooth");
    }

    let broke = false;
    const stopTrack = JumpPose.track(v, (t, lm) => {
      const r = det.feed(t, lm);
      rope.feed(t, lm, v, phase === "wait" || phase === "count");
      drawPose(cv, v, lm, r.visible);
      const chip = el("hBody");
      if (r.visible) { S.lastSeen = t; if (!seenSince) seenSince = t; chip.textContent = "✔ 몸이 다 보여요"; chip.className = "body-chip ok"; }
      else { seenSince = 0; chip.textContent = lm ? "발끝까지 보이게 해 줘" : "사람을 찾는 중…"; chip.className = "body-chip"; }
      if (phase === "wait" && seenSince && t - seenSince > 700) countdown();
      if (phase !== "go") return;
      if (r.jump && r.jump.t >= t0) { onJump(r.jump); broke = false; }
      const now = t;
      if (!broke && S.lastJump && now - S.lastJump > BREAK_MS) { broke = true; onBreak(now, "멈췄어! 다시!"); }
      if (!broke && S.lastSeen && now - S.lastSeen > LOST_MS) { broke = true; onBreak(now, "화면 밖으로 나갔어!"); }
    });
    cleanup.push(stopTrack);

    el("goBtn").onclick = () => {
      unlockAudio();
      el("goBtn").hidden = true; el("quit").hidden = false;
      phase = "wait";
      el("hSub").textContent = "아이가 화면에 다 보이면 시작해!";
      say("화면에 서 주세요");
    };
    el("quit").onclick = () => finish(false, "멈췄어. 쉬었다가 다시 하자!");

    function countdown() {
      phase = "count";
      let left = 3;
      el("hBig").textContent = "3"; el("hSub").textContent = "준비…"; beep(660, 0.15, 0.22); say("3");
      const cd = setInterval(() => {
        left--;
        if (left > 0) { el("hBig").textContent = left; beep(660, 0.15, 0.22); say(String(left)); return; }
        clearInterval(cd);
        phase = "go"; t0 = performance.now(); S.lastSeen = t0;
        el("hExpBox").hidden = false;
        el("hBig").textContent = "START!"; el("hBig").classList.add("start");
        el("hSub").textContent = g.type === "beat" ? "소리에 맞춰 뛰어!" : g.type === "endure" ? "계속 뛰어!" : "뛰어!";
        beep(990, 0.4, 0.25); say("시작!");
        startRecording();
        setTimeout(() => { el("hBig").classList.remove("start"); if (phase === "go") el("hBig").textContent = g.type === "endure" ? "0:00" : String(bigVal()); }, 700);
        if (g.type === "beat") {
          beatStart = t0 + 600;
          const tick = () => { if (phase !== "go") return; beep(1046, 0.07, 0.22); const b = el("hBeat"); b && (b.classList.remove("on"), void b.offsetWidth, b.classList.add("on")); };
          setTimeout(() => { tick(); beatT = setInterval(tick, g.beat); }, 600);
        }
        loop();
      }, 1000);
      cleanup.push(() => clearInterval(cd));
    }
    cleanup.push(() => { clearInterval(beatT); cancelAnimationFrame(raf); });

    function progress(now) {
      const cont = S.contStart && now - S.lastJump <= BREAK_MS ? (now - S.contStart) / 1000 : 0;
      S.endureBest = Math.max(S.endureBest, cont);
      switch (g.type) {
        case "speed": return { v: S.count, max: g.n, txt: `${S.count} / ${g.n}`, win: S.count >= g.n };
        case "endure": return { v: cont, max: g.sec, txt: `${fmt(cont)} / ${fmt(g.sec)}`, win: cont >= g.sec };
        default: return { v: S.combo, max: g.n, txt: `${S.combo} / ${g.n}`, win: S.combo >= g.n };
      }
    }
    function loop() {
      if (phase !== "go") return;
      const now = performance.now(), es = (now - t0) / 1000;
      el("hTime").textContent = fmt(limit - es);
      const p = progress(now);
      el("hExp").style.width = Math.min(100, (p.v / p.max) * 100) + "%";
      el("hExpTxt").textContent = p.txt;
      if (g.type === "endure") el("hBig").textContent = fmt(p.v);
      if (p.win && g.type !== "speed") return finish(true);
      if (es >= limit) return finish(p.win, p.win ? "" : "시간이 끝났어!");
      raf = requestAnimationFrame(loop);
    }

    const vis = () => { if (document.hidden && phase === "go") finish(false, "화면이 꺼지거나 다른 앱으로 가서 멈췄어."); };
    document.addEventListener("visibilitychange", vis);
    cleanup.push(() => document.removeEventListener("visibilitychange", vis));

    async function finish(win, why) {
      if (phase === "done") return;
      const wasGo = phase === "go";
      phase = "done"; cancelAnimationFrame(raf); clearInterval(beatT); stopTrack();
      if (!wasGo) { close(); return; }
      if (win) { beep(1320, 0.2, 0.2); say("목표 달성!"); }
      const blob = await stopRecording();
      const dur = performance.now() - t0;
      const jumps = det.jumps.filter((j) => j.t >= t0);
      const analysis = JumpPose.analyze(jumps, S.breaks, dur);
      if (S.noRope >= Math.max(2, (S.count + S.noRope) * 0.15)) analysis.issues.unshift({ key: "rope", title: "줄이 안 보였어", detail: `줄을 넘지 않은 점프가 ${S.noRope}번 있었어. 줄 없이 뛰었거나, 줄이 화면에 잘 안 잡혔어.`, drill: { name: "줄 잘 보이게 찍기", how: "밝은 곳에서, 바닥·벽과 색이 다른 줄로 해 봐. 머리 위와 발밑까지 화면에 다 나오게 찍어 줘." } });
      const stats = { count: S.count, best: S.best, breaks: S.breaks.length, endure: Math.round(S.endureBest), dur: Math.round(dur / 1000) };
      let saved = false;
      try {
        await JumpClips.save({ pid: cur.opts.pid, at: new Date().toISOString(), sealNo: seal.no, mission: seal.mission, stage: seal.stageName, grade: seal.grade, win, stats, analysis, goal: g.type, blob, mime: blob ? blob.type : "" });
        saved = true;
      } catch (e) {}
      cur.opts.onSaved && cur.opts.onSaved();
      result({ win, why, blob, stats, analysis, saved });
    }
  }

  // ---------- 5. 결과: 영상 + 분석 + 연습법 ----------
  function feedbackHTML(a) {
    if (!a) return "";
    return `<div class="feedback">
      <div class="fb good"><b>👍 잘한 점</b><ul>${a.good.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      ${a.issues.length ? `<div class="fb fix"><b>🔧 고칠 점과 연습 방법</b>${a.issues.map((it) => `<div class="fb-item"><strong>${esc(it.title)}</strong><p>${esc(it.detail)}</p><div class="drill"><span>연습</span><b>${esc(it.drill.name)}</b><p>${esc(it.drill.how)}</p></div></div>`).join("")}</div>`
        : `<div class="fb fix"><b>🔧 고칠 점</b><p>눈에 띄게 고칠 점이 없어! 다음 단계에 도전해 봐.</p></div>`}
    </div>`;
  }
  function statsHTML(st, goal) {
    return `<div class="rstats"><div><small>전체</small><b>${st.count}</b></div><div><small>${goal === "endure" ? "최고 연속 시간" : "최고 연속"}</small><b>${goal === "endure" ? fmt(st.endure) : st.best}</b></div><div><small>멈춘 횟수</small><b>${st.breaks}</b></div></div>`;
  }
  function result({ win, why, blob, stats, analysis, saved }) {
    stopCamera();
    const url = blob ? URL.createObjectURL(blob) : "";
    cleanup.push(() => url && URL.revokeObjectURL(url));
    const g = cur.seal.goal;
    if (win) { fanfare(); say("퀘스트 클리어!"); } else { sadTone(); say("아쉬워! 다시 도전하자"); }
    layer.innerHTML = `<div class="qwin pop center result-win">
      <div class="qwin-title">${win ? "퀘스트 성공!" : "아쉬워!"}</div>
      <div class="bigtext ${win ? "" : "fail"}">${win ? "QUEST CLEAR!" : "TRY AGAIN"}</div>
      ${url ? `<video class="replay" src="${url}" controls playsinline></video>` : ""}
      ${statsHTML(stats, g.type)}
      ${npc(win ? `대단해! <b>${esc(cur.seal.mission)}</b> 성공! 아래 코치 노트도 꼭 읽어 봐.` : `${esc(why || "괜찮아, 처음엔 다 그래.")} 코치 노트를 보고 연습하면 금방 할 수 있어!`)}
      ${feedbackHTML(analysis)}
      <p class="parent-note">${saved ? "📼 영상과 코치 노트는 도감 아래 <b>내 영상</b>에 저장했어요. 이 폰에만 있어요." : "영상을 저장하지 못했어요. 폰 저장 공간을 확인해 주세요."}</p>
      <div class="qbtns">${win ? `<button class="gbtn" id="getSeal">씰 받으러 가기 ▶</button>` : `<button class="gbtn" data-go="retry">다시 도전!</button><button class="gbtn gray" data-go="close">닫기</button>`}</div>
    </div>`;
    const gs = $(layer, "#getSeal");
    gs && (gs.onclick = () => { const o = cur.opts; close(); o.onClear && o.onClear({ count: stats.count, best: stats.best }); });
    layer.scrollTop = 0;
  }

  window.JumpChallenge = { start, close, feedbackHTML, statsHTML };
})();
