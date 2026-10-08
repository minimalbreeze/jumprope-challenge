/* 줄넘기 등급 챌린지 — 도전(퀘스트) 화면: "촬영 심판" 방식
 *
 * 뛰는 아이는 폰을 몸에 지니지 않는다. 다른 사람(어른·친구)이 폰으로 촬영하면서 심판을 본다.
 *  - 뛸 때마다 심판이 화면을 "콩!" 탭 → 개수
 *  - 줄에 걸리거나 멈추면 "걸렸어" → 연속 기록이 0부터 다시
 *  - 끝나면 방금 찍은 영상을 다시 보고 심판이 "성공 인정"을 눌러야 씰을 준다
 * 영상은 이 폰 안에서만 재생하고 어디에도 올리지 않으며, 창을 닫으면 지운다.
 *
 * 흐름: 퀘스트 창 → 안전 확인(전부 체크) → 촬영 심판 안내 → 카메라 준비 → 3·2·1 START → 심판 화면 → 영상 확인 → 결과
 */
(function () {
  const $ = (root, s) => root.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const fmtLong = (s) => (s >= 60 ? `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ""}` : `${s}초`);

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
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- 카메라 ----------
  let stream = null, recorder = null, chunks = [], videoURL = "";
  function stopCamera() {
    try { recorder && recorder.state !== "inactive" && recorder.stop(); } catch (e) {}
    recorder = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  function dropVideo() { if (videoURL) URL.revokeObjectURL(videoURL); videoURL = ""; chunks = []; }
  async function openCamera() {
    if (stream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      return true;
    } catch (e) { stream = null; return false; }
  }
  function startRecording() {
    dropVideo();
    if (!stream || typeof MediaRecorder === "undefined") return;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    try {
      recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      recorder.start(1000);
    } catch (e) { recorder = null; }
  }
  function stopRecording() {
    return new Promise((res) => {
      if (!recorder || recorder.state === "inactive") return res("");
      recorder.onstop = () => { videoURL = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "video/webm" })) : ""; res(videoURL); };
      try { recorder.stop(); } catch (e) { res(""); }
    });
  }

  // ---------- 화면 틀 ----------
  let layer = null, cleanup = [];
  function open() {
    if (layer) { cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = []; layer.remove(); }
    layer = document.createElement("div");
    layer.className = "quest-layer";
    layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true");
    document.body.appendChild(layer);
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = [];
    stopCamera(); dropVideo();
    if (layer) layer.remove(); layer = null;
    document.documentElement.style.overflow = "";
  }
  function npc(text) {
    return `<div class="npc"><div class="npc-face">${JumpSeals.coachSVG()}</div><div class="npc-talk"><span class="npc-name">콩콩 코치</span><p>${text}</p></div></div>`;
  }
  const ruleText = (g) => ({
    streak: `줄에 안 걸리고 <b>연속 ${g.n}개</b>를 뛰면 성공! 걸리면 0부터 다시 세.`,
    speed: `<b>${g.sec}초 동안 ${g.n}개 이상</b> 뛰면 성공! 걸려도 괜찮아, 다시 뛰면 이어서 세.`,
    beat: `"콩, 콩" 소리가 날 때마다 한 번씩 뛰어. 소리에 맞춰 <b>${g.n}개</b>를 이어서 뛰면 성공!`,
    endure: `<b>${fmtLong(g.sec)} 동안</b> 안 걸리고 계속 뛰면 성공! 천천히 뛰어도 돼.`,
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
      <p class="parent-note" style="text-align:center">📹 이 퀘스트는 <b>다른 사람이 폰으로 찍어 주면서 심판</b>을 봐 줘야 해. 뛰는 사람은 폰을 들지 않아!</p>
      <div class="qbtns"><button class="gbtn" data-go="safety">도전할래!</button><button class="gbtn gray" data-go="close">다음에</button></div>
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
      else if (go === "retry") { stopCamera(); dropVideo(); start(cur.seal, cur.opts); }
      else if (go === "dev-clear") { close(); cur.opts.onClear && cur.opts.onClear({ dev: true }); }
    };
  }

  // ---------- 2. 안전 확인 ----------
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
      <div class="qwin-title">도전 전에 꼭 확인!</div>
      ${npc("다치지 않아야 진짜 챔피언이야. 하나씩 눌러서 체크해 줘!")}
      <ul class="checks">${CHECKS.map(([ic, t, d], i) => `<li><button class="check" data-i="${i}" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="ic" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${d}</small></span></button></li>`).join("")}</ul>
      <p class="parent-note">보호자님께: 촬영한 영상은 이 폰 안에서 성공 확인에만 쓰이고 어디에도 올라가지 않아요. 확인 화면을 닫으면 지워져요.</p>
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

  // ---------- 3. 촬영 심판 안내 ----------
  function guide() {
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">촬영 심판은 이렇게!</div>
      ${npc("오늘의 심판님, 잘 부탁해요! 찍으면서 뛸 때마다 화면을 톡 눌러 주세요.")}
      <div class="place">
        <div class="place-pic">${filmSVG()}</div>
        <div class="place-cards">
          <div class="pc ok"><b>① 3걸음 떨어져서 찍기</b><small>머리부터 발끝, 줄까지 화면에 다 나오게.</small></div>
          <div class="pc ok"><b>② 뛸 때마다 "콩!" 누르기</b><small>줄이 발밑을 지나갈 때마다 화면 아래 큰 버튼을 톡.</small></div>
          <div class="pc no"><b>③ 걸리면 "걸렸어" 누르기</b><small>줄에 걸리거나 멈추면 눌러. 연속 기록이 0부터 다시 시작해.</small></div>
          <div class="pc ok"><b>④ 끝나면 영상 보고 인정!</b><small>찍은 영상을 다시 보고, 진짜 성공이면 "성공 인정"을 눌러.</small></div>
        </div>
      </div>
      <div class="qbtns"><button class="gbtn" data-go="camera">카메라 켜기 📹</button><button class="gbtn gray" data-go="safety">뒤로</button></div>
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

  // ---------- 4. 카메라 준비 ----------
  async function camera() {
    unlockAudio();
    layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">카메라 켜는 중…</div>${npc("카메라를 써도 되는지 물어보면 <b>허용</b>을 눌러 줘!")}</div>`;
    const ok = await openCamera();
    ready(ok);
  }
  function ready(camOk) {
    layer.innerHTML = `<div class="stage-cam">
      ${camOk ? `<video class="cam" id="cam" autoplay playsinline muted></video>` : `<div class="cam nocam"><p>📷 카메라를 못 켰어.<br>그래도 괜찮아! 눈으로 보면서 심판할 수 있어.<br><small>(영상 다시 보기는 안 돼)</small></p></div>`}
      <div class="cam-guide" aria-hidden="true"><span>머리부터 발끝까지<br>이 안에 들어오게!</span></div>
      <div class="cam-bottom">
        <div class="cam-tip">${esc(cur.seal.mission)} · 준비되면 START!</div>
        <button class="startbtn" id="goBtn">START</button>
        <div class="qbtns"><button class="gbtn gray" data-go="guide">뒤로</button>${cur.opts.dev ? `<button class="gbtn blue" data-go="dev-clear">개발용: 성공 처리</button>` : ""}</div>
      </div>
    </div>`;
    const v = $(layer, "#cam");
    if (v && stream) { v.srcObject = stream; v.play && v.play().catch(() => {}); }
    $(layer, "#goBtn").onclick = () => run(camOk);
  }

  // ---------- 5. 심판 화면 ----------
  function run(camOk) {
    const seal = cur.seal, g = seal.goal;
    const limit = g.type === "speed" ? g.sec : g.limit;
    layer.innerHTML = `<div class="hud judge-hud">
      ${camOk ? `<video class="cam" id="cam" autoplay playsinline muted></video>` : ""}
      <div class="hud-shade"></div>
      <div class="hud-top"><span class="hud-quest">${esc(seal.mission)}</span><span class="hud-time" id="hTime">${fmt(limit)}</span></div>
      <div class="hud-mid">
        <div class="hud-big" id="hBig">3</div>
        <div class="hud-sub" id="hSub">준비…</div>
        <div class="judge" id="hJudge"></div>
        ${g.type === "beat" ? `<div class="beat" id="hBeat" aria-hidden="true"></div>` : ""}
      </div>
      <div class="exp"><i id="hExp"></i><span id="hExpTxt">0 / ${g.n || fmtLong(g.sec)}</span></div>
      <button class="tapzone" id="tap" disabled>콩! <small>뛸 때마다 톡</small></button>
      <div class="judge-row"><button class="gbtn blue" id="trip" disabled>✋ 걸렸어</button><button class="gbtn gray" id="quit">■ 그만</button></div>
    </div>`;
    const el = (id) => $(layer, "#" + id);
    const v = el("cam");
    if (v && stream) { v.srcObject = stream; v.play && v.play().catch(() => {}); }

    const S = { count: 0, combo: 0, best: 0, trips: 0, contStart: 0, endureBest: 0 };
    let phase = "count", t0 = 0, raf = 0, beatT = 0;

    let lock = null;
    (async () => { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} })();
    cleanup.push(() => { try { lock && lock.release(); } catch (e) {} });

    const bigVal = () => (g.type === "speed" ? S.count : S.combo);
    function bump() { const b = el("hBig"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    function showJudge(j, cls) { const n = el("hJudge"); n.textContent = j; n.className = "judge " + cls; void n.offsetWidth; n.classList.add("show"); }

    function tap() {
      if (phase !== "go") return;
      S.count++; S.combo++; S.best = Math.max(S.best, S.combo);
      beep(S.combo % 10 === 0 ? 1320 : 880, 0.04, 0.1); buzz(12);
      if (g.type !== "endure") el("hBig").textContent = String(bigVal());
      el("hCount") && (el("hCount").textContent = S.count);
      bump();
      if (S.combo > 0 && S.combo % 10 === 0) showJudge(`${S.combo} 콤보!`, "pf");
    }
    function trip() {
      if (phase !== "go") return;
      S.trips++;
      if (g.type !== "speed") { S.combo = 0; if (g.type !== "endure") el("hBig").textContent = "0"; }
      S.contStart = performance.now();
      showJudge("걸렸어! 다시!", "ms"); beep(220, 0.25, 0.18, "sawtooth"); buzz([60, 40, 60]);
    }
    el("tap").addEventListener("pointerdown", (e) => { e.preventDefault(); tap(); });
    el("trip").onclick = trip;
    el("quit").onclick = () => finish(false, true);

    function progress(now) {
      const cont = (now - S.contStart) / 1000;
      S.endureBest = Math.max(S.endureBest, cont);
      switch (g.type) {
        case "speed": return { v: S.count, max: g.n, txt: `${S.count} / ${g.n}`, win: S.count >= g.n };
        case "endure": return { v: cont, max: g.sec, txt: `${fmt(cont)} / ${fmt(g.sec)}`, win: cont >= g.sec };
        default: return { v: S.combo, max: g.n, txt: `${S.combo} / ${g.n}`, win: S.combo >= g.n };
      }
    }

    // 3·2·1
    let left = 3;
    beep(660, 0.15, 0.22); say("3");
    const cd = setInterval(() => {
      left--;
      if (left > 0) { el("hBig").textContent = left; beep(660, 0.15, 0.22); say(String(left)); return; }
      clearInterval(cd);
      phase = "go"; t0 = S.contStart = performance.now();
      el("tap").disabled = false; el("trip").disabled = false;
      el("hBig").textContent = "START!"; el("hBig").classList.add("start");
      el("hSub").textContent = g.type === "beat" ? "소리에 맞춰 뛰어!" : g.type === "endure" ? "계속 뛰어!" : "뛰어!";
      beep(990, 0.4, 0.25); say("시작!");
      startRecording();
      setTimeout(() => { el("hBig").classList.remove("start"); if (phase === "go") el("hBig").textContent = g.type === "endure" ? "0:00" : String(bigVal()); }, 700);
      if (g.type === "beat") {
        const tick = () => { if (phase !== "go") return; beep(1046, 0.07, 0.22, "square"); const b = el("hBeat"); b && (b.classList.remove("on"), void b.offsetWidth, b.classList.add("on")); };
        setTimeout(() => { tick(); beatT = setInterval(tick, g.beat); }, 400);
      }
      loop();
    }, 1000);
    cleanup.push(() => { clearInterval(cd); clearInterval(beatT); cancelAnimationFrame(raf); });

    function loop() {
      if (phase !== "go") return;
      const now = performance.now(), el_s = (now - t0) / 1000;
      el("hTime").textContent = fmt(limit - el_s);
      const p = progress(now);
      el("hExp").style.width = Math.min(100, (p.v / p.max) * 100) + "%";
      el("hExpTxt").textContent = p.txt;
      if (g.type === "endure") el("hBig").textContent = fmt(p.v);
      if (p.win && g.type !== "speed") return finish(true);
      if (el_s >= limit) return finish(p.win);
      raf = requestAnimationFrame(loop);
    }

    const vis = () => { if (document.hidden && phase === "go") finish(false, true, "화면이 꺼지거나 다른 앱으로 가서 멈췄어."); };
    document.addEventListener("visibilitychange", vis);
    cleanup.push(() => document.removeEventListener("visibilitychange", vis));

    async function finish(win, stopped, why) {
      if (phase === "done") return;
      phase = "done"; cancelAnimationFrame(raf); clearInterval(beatT); clearInterval(cd);
      if (win) { beep(1320, 0.2, 0.2); say("목표 달성!"); }
      const url = await stopRecording();
      review({ win, stopped, why, url, S, g });
    }
  }

  // ---------- 6. 영상 확인 (심판 인정) ----------
  function review({ win, stopped, why, url, S, g }) {
    stopCamera();
    const stats = `<div class="rstats"><div><small>전체</small><b>${S.count}</b></div><div><small>${g.type === "endure" ? "최고 연속 시간" : "최고 연속"}</small><b>${g.type === "endure" ? fmt(S.endureBest) : S.best}</b></div><div><small>걸린 횟수</small><b>${S.trips}</b></div></div>`;
    const vid = url ? `<video class="replay" src="${url}" controls playsinline></video>` : "";
    if (!win) {
      sadTone(); if (!stopped) say("아쉬워! 다시 도전하자");
      layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">아쉬워!</div>
        <div class="bigtext fail">TRY AGAIN</div>${stats}
        ${npc(why || (stopped ? "멈췄어. 쉬었다가 다시 하자!" : "괜찮아, 처음엔 다 그래. 조금 쉬었다가 다시 해 보자!"))}
        <div class="qbtns"><button class="gbtn" data-go="retry">다시 도전!</button><button class="gbtn gray" data-go="close">그만하기</button></div></div>`;
      return;
    }
    layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">심판님, 확인해 주세요!</div>
      ${vid}${stats}
      ${npc(url ? `방금 찍은 영상을 보고 <b>${esc(cur.seal.mission)}</b>를 진짜 해냈는지 확인해 줘!` : `<b>${esc(cur.seal.mission)}</b>를 진짜 해냈어? 심판님이 확인해 줘!`)}
      <div class="qbtns"><button class="gbtn" id="approve">✔ 성공 인정!</button><button class="gbtn gray" data-go="retry">다시 도전</button></div>
      <p class="parent-note">영상은 이 폰 안에서만 보여 주고, 이 창을 닫으면 지워져요.</p></div>`;
    $(layer, "#approve").onclick = () => clear(S, g);
  }
  function clear(S, g) {
    dropVideo();
    fanfare(); buzz([100, 50, 100, 50, 300]); say("퀘스트 클리어!");
    layer.innerHTML = `<div class="clear"><div class="bigtext">QUEST CLEAR!</div>
      <div class="rstats"><div><small>전체</small><b>${S.count}</b></div><div><small>최고 연속</small><b>${g.type === "endure" ? fmt(S.endureBest) : S.best}</b></div><div><small>걸린 횟수</small><b>${S.trips}</b></div></div>
      ${npc(`대단해! <b>${esc(cur.seal.mission)}</b> 성공! 씰 봉투가 도착했어!`)}
      <button class="gbtn" id="getSeal">씰 받으러 가기 ▶</button></div>`;
    $(layer, "#getSeal").onclick = () => { const o = cur.opts; close(); o.onClear && o.onClear({ count: S.count, best: S.best }); };
  }

  window.JumpChallenge = { start, close };
})();
