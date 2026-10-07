/* 줄넘기 등급 챌린지 — 도전(퀘스트) 화면과 점프 측정
 *
 * 흐름: 퀘스트 창 → 안전 확인(전부 체크해야 다음) → 폰 넣는 법 → 준비(10초 안에 폰 넣기)
 *       → 3·2·1 START → 게임 화면(소리로 알려줌) → 성공/실패
 *
 * 측정: 폰 가속도 센서(중력 포함) 크기만 쓴다.
 *  - 공중에 뜨면 값이 작아지고(LO 아래), 착지하면 크게 튄다(HI 위). 이 짝이 오면 점프 1개.
 *  - 착지 간격이 BREAK_MS를 넘으면 "끊김".
 *  - 감도(HI/LO)는 아직 실제 아이들 데이터로 맞춘 값이 아니다. 뛰어보고 조정해야 한다.
 */
(function () {
  const SENS = {
    low: { hi: 17, lo: 7 },
    mid: { hi: 14.5, lo: 8 },
    high: { hi: 12.5, lo: 8.8 },
  };
  const MIN_GAP_MS = 190;   // 이보다 빨리 오는 착지는 같은 점프의 흔들림으로 본다
  const BREAK_MS = 1300;    // 이만큼 안 뛰면 끊김
  const PREP_SEC = 10;      // START 누르고 폰 넣을 시간

  const $ = (root, s) => root.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };

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

  // ---------- 화면 틀 ----------
  let layer = null, cleanup = [];
  function open() {
    close();
    layer = document.createElement("div");
    layer.className = "quest-layer";
    layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true");
    document.body.appendChild(layer);
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = [];
    if (layer) layer.remove(); layer = null;
    document.documentElement.style.overflow = "";
  }
  function npc(text) {
    return `<div class="npc"><div class="npc-face">${JumpSeals.coachSVG()}</div><div class="npc-talk"><span class="npc-name">콩콩 코치</span><p>${text}</p></div></div>`;
  }
  const ruleText = (g) => ({
    streak: `줄에 안 걸리고 <b>연속 ${g.n}개</b>를 뛰면 성공! 걸려서 끊기면 0부터 다시 세. (${Math.round(g.limit / 60)}분 안에)`,
    speed: `<b>${g.sec}초 동안 ${g.n}개 이상</b> 뛰면 성공! 걸려도 괜찮아, 다시 뛰면 계속 세.`,
    rhythm: `<b>똑같은 박자로 ${g.n}개</b>를 이어서 뛰면 성공! 박자가 흔들리면 콤보가 끊겨. (${Math.round(g.limit / 60)}분 안에)`,
    endure: `<b>${fmt(g.sec)} 동안 안 끊기고</b> 계속 뛰면 성공! 천천히 뛰어도 돼.`,
  }[g.type]);

  // ---------- 1. 퀘스트 창 ----------
  function start(seal, opts = {}) {
    soundOn = opts.sound !== false;
    open();
    const holo = seal.grade > (opts.myGrade || 0);
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">QUEST · ${seal.grade}학년 코스 ${"★".repeat(seal.stage)}</div>
      ${npc(`${esc(opts.nick || "친구")}, 새 퀘스트야! 이번엔 <b>${seal.stageName}</b> 도전이야.`)}
      <div class="quest-body">
        <div class="quest-goal"><span class="tag">목표</span><strong>${esc(seal.mission)}</strong><p>${ruleText(seal.goal)}</p></div>
        <div class="quest-reward"><span class="tag">보상</span><div class="reward-seal">${JumpSeals.sealSVG(seal, { empty: true })}</div><small>${holo ? "✨ 반짝이 씰" : "씰 1장"}</small></div>
      </div>
      <div class="qbtns"><button class="gbtn" data-go="safety">도전할래!</button><button class="gbtn gray" data-go="close">다음에</button></div>
    </div>`;
    wire(seal, opts);
  }
  function wire(seal, opts) {
    layer.onclick = (e) => {
      const b = e.target.closest("[data-go]"); if (!b) return;
      const go = b.dataset.go;
      if (go === "close") close();
      else if (go === "safety") safety(seal, opts);
      else if (go === "place") placement(seal, opts);
      else if (go === "ready") ready(seal, opts);
      else if (go === "retry") start(seal, opts);
      else if (go === "dev-clear") { close(); opts.onClear && opts.onClear({ dev: true }); }
    };
  }

  // ---------- 2. 안전 확인 ----------
  const CHECKS = [
    ["🙆", "주변이 넓어요", "양팔을 벌리고 한 바퀴 돌아도 사람·가구·벽에 안 닿아요. 줄넘기 길이만큼(2m) 비워 줘."],
    ["👟", "운동화를 신었어요", "미끄러운 바닥이나 양말만 신고 뛰면 넘어질 수 있어."],
    ["🔒", "폰을 꽉 잠그는 곳에 넣어요", "허리 파우치·러닝벨트나 지퍼 주머니에 넣고 잠가. 손에 들거나 헐렁한 주머니는 안 돼. 떨어지면 폰이 깨져!"],
    ["🧑‍🍼", "어른이 옆에 있어요", "어른한테 \"줄넘기 도전할게요\" 말하고, 옆에서 봐 달라고 해."],
    ["🏠", "아래층을 생각했어요", "아파트 안에서 뛰면 아래층이 시끄러워. 밖이나 놀이터, 두꺼운 매트 위에서 하자."],
    ["💧", "힘들면 바로 멈출게요", "숨이 너무 차거나 어지러우면 바로 멈추고 쉬어. 씰은 다음에 또 딸 수 있어."],
  ];
  function safety(seal, opts) {
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">도전 전에 꼭 확인!</div>
      ${npc("다치지 않아야 진짜 챔피언이야. 하나씩 눌러서 체크해 줘!")}
      <ul class="checks">${CHECKS.map(([ic, t, d], i) => `<li><button class="check" data-i="${i}" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="ic" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${d}</small></span></button></li>`).join("")}</ul>
      <p class="parent-note">보호자님께: 이 앱은 휴대폰을 몸에 지닌 채 뛰는 방식이에요. 휴대폰 낙하로 인한 파손이나 부딪힘에 주의해 주시고, 아이가 뛰는 동안 곁에서 지켜봐 주세요.</p>
      <div class="qbtns"><button class="gbtn" data-go="place" id="okAll" disabled>모두 확인했어요 (0/${CHECKS.length})</button><button class="gbtn gray" data-go="close">그만두기</button></div>
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

  // ---------- 3. 폰 넣는 법 ----------
  function placement(seal, opts) {
    layer.innerHTML = `<div class="qwin pop">
      <div class="qwin-title">폰은 이렇게 넣어!</div>
      ${npc("폰이 네 몸이랑 같이 콩콩 뛰어야 개수를 셀 수 있어. 화면은 켜 둔 채로 넣어 줘!")}
      <div class="place">
        <div class="place-pic">${kidSVG()}</div>
        <div class="place-cards">
          <div class="pc ok"><b>⭕ 허리 파우치·러닝벨트</b><small>제일 좋아! 배꼽 옆에 오게 꽉 조여.</small></div>
          <div class="pc ok"><b>⭕ 지퍼 잠기는 바지 주머니</b><small>지퍼를 끝까지 잠그고, 흔들어도 안 나오는지 확인.</small></div>
          <div class="pc no"><b>❌ 손에 들고 뛰기</b><small>손은 줄넘기 잡아야 해. 폰 떨어뜨려!</small></div>
          <div class="pc no"><b>❌ 헐렁한 주머니·후드 주머니·목에 걸기</b><small>뛰다가 튀어나오거나 얼굴에 부딪혀.</small></div>
        </div>
      </div>
      <ul class="tips"><li>🔊 소리를 켜 둬. 시작·10개마다·끝을 목소리로 알려 줄게.</li><li>📴 뛰는 동안 화면이 꺼지면 측정이 멈춰. 화면 꺼짐 시간을 길게 해 두면 좋아.</li><li>✋ 멈추고 싶으면 화면을 <b>2초 꾹</b> 눌러.</li></ul>
      <div class="qbtns"><button class="gbtn" data-go="ready">알았어! 준비하기</button><button class="gbtn gray" data-go="safety">뒤로</button></div>
    </div>`;
  }
  function kidSVG() {
    return `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-label="허리 파우치에 폰을 넣은 아이 그림">
      <path d="M14 60 Q60 150 106 60" fill="none" stroke="#ff6f61" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="28" r="17" fill="#ffdcc2" stroke="#4a2c2a" stroke-width="2.4"/>
      <path d="M43 24 Q46 8 60 9 Q75 8 77 24 Q68 16 60 18 Q50 16 43 24Z" fill="#4a2c2a"/>
      <circle cx="54" cy="29" r="2.2" fill="#2b1b1a"/><circle cx="66" cy="29" r="2.2" fill="#2b1b1a"/><path d="M55 36 Q60 40 65 36" fill="none" stroke="#4a2c2a" stroke-width="2" stroke-linecap="round"/>
      <rect x="44" y="45" width="32" height="38" rx="10" fill="#4dabf7" stroke="#4a2c2a" stroke-width="2.4"/>
      <path d="M44 55 L22 66 M76 55 L98 66" stroke="#ffdcc2" stroke-width="7" stroke-linecap="round"/>
      <rect x="15" y="60" width="9" height="15" rx="3" fill="#c2410c" stroke="#4a2c2a" stroke-width="2"/><rect x="96" y="60" width="9" height="15" rx="3" fill="#c2410c" stroke="#4a2c2a" stroke-width="2"/>
      <rect x="44" y="80" width="32" height="8" rx="3" fill="#2d3f73"/>
      <rect x="62" y="76" width="16" height="16" rx="4" fill="#ffd43b" stroke="#4a2c2a" stroke-width="2.2"/><rect x="66" y="79" width="8" height="10" rx="1.5" fill="#2b2f45"/>
      <path d="M50 88 L48 118 M70 88 L72 118" stroke="#2d3f73" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="46" cy="122" rx="8" ry="4.5" fill="#ff8a3d" stroke="#4a2c2a" stroke-width="2"/><ellipse cx="74" cy="122" rx="8" ry="4.5" fill="#ff8a3d" stroke="#4a2c2a" stroke-width="2"/>
      <circle cx="88" cy="84" r="13" fill="none" stroke="#ff5a5f" stroke-width="2.5" stroke-dasharray="4 3"/><path d="M80 88 L98 104" stroke="#ff5a5f" stroke-width="2.5"/>
      <text x="100" y="114" font-size="9" font-family="sans-serif" font-weight="700" fill="#ff5a5f" text-anchor="middle">여기!</text>
    </svg>`;
  }

  // ---------- 4. 준비 ----------
  function ready(seal, opts) {
    layer.innerHTML = `<div class="qwin pop center">
      <div class="qwin-title">준비됐어?</div>
      ${npc(`START를 누르면 <b>${PREP_SEC}초</b> 안에 폰을 넣고 줄을 잡아. "시작!" 소리가 나면 뛰는 거야!`)}
      <button class="startbtn" id="goBtn">START</button>
      <div class="qbtns"><button class="gbtn gray" data-go="place">뒤로</button></div>
    </div>`;
    $(layer, "#goBtn").onclick = async () => {
      unlockAudio();
      const perm = await askMotion();
      if (perm !== "granted") return noSensor(seal, opts, perm === "denied" ? "움직임 센서를 쓰도록 허락해 줘야 개수를 셀 수 있어. 브라우저 설정에서 '동작 및 방향' 접근을 허용해 줘." : "이 기기에서는 움직임 센서를 찾지 못했어.");
      run(seal, opts);
    };
  }
  async function askMotion() {
    if (typeof DeviceMotionEvent === "undefined") return "none";
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try { return (await DeviceMotionEvent.requestPermission()) === "granted" ? "granted" : "denied"; } catch (e) { return "denied"; }
    }
    return "granted";
  }
  function noSensor(seal, opts, msg) {
    layer.innerHTML = `<div class="qwin pop center">
      <div class="qwin-title">앗, 센서가 없어</div>
      ${npc(msg + " 휴대폰으로 열어서 다시 해 볼래?")}
      <div class="qbtns"><button class="gbtn" data-go="ready">다시 해 보기</button><button class="gbtn gray" data-go="close">닫기</button>
      ${opts.dev ? `<button class="gbtn blue" data-go="dev-clear">개발용: 성공 처리</button>` : ""}</div>
    </div>`;
  }

  // ---------- 5. 측정 ----------
  function run(seal, opts) {
    const g = seal.goal, th = SENS.mid;
    layer.innerHTML = `<div class="hud">
      <div class="hud-top"><span class="hud-quest">${esc(seal.mission)}</span><span class="hud-time" id="hTime">--:--</span></div>
      <div class="hud-mid">
        <div class="hud-big" id="hBig">${PREP_SEC}</div>
        <div class="hud-sub" id="hSub">폰을 넣고 줄을 잡아!</div>
        <div class="judge" id="hJudge"></div>
      </div>
      <div class="hud-stats"><div><small>전체</small><b id="hCount">0</b></div><div><small>콤보</small><b id="hCombo">0</b></div><div><small>최고 콤보</small><b id="hBest">0</b></div></div>
      <div class="exp"><i id="hExp"></i><span id="hExpTxt">0 / ${g.n || fmt(g.sec)}</span></div>
      <div class="hold" id="hold"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="none" stroke="#ffffff33" stroke-width="5"/><circle id="holdRing" cx="22" cy="22" r="19" fill="none" stroke="#ffd43b" stroke-width="5" stroke-dasharray="119.4" stroke-dashoffset="119.4" transform="rotate(-90 22 22)"/></svg><span>2초 꾹 누르면 멈춰</span></div>
    </div>`;
    const el = (id) => $(layer, "#" + id);
    let phase = "prep", t0 = 0, raf = 0, lastEvent = 0;
    const S = { count: 0, combo: 0, best: 0, rhythmCombo: 0, bestRhythm: 0, last: 0, streakStart: 0, intervals: [], endureBest: 0, broke: 0 };
    let ms = 9.8, flight = false, peak = 0;

    // 화면 켜짐 유지
    let lock = null;
    (async () => { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} })();
    cleanup.push(() => { try { lock && lock.release(); } catch (e) {} });

    function onMotion(e) {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      lastEvent = performance.now();
      if (phase !== "go") return;
      const m = Math.hypot(a.x, a.y, a.z);
      ms = ms * 0.45 + m * 0.55;
      const now = performance.now();
      if (ms < th.lo) flight = true;
      if (flight && ms > th.hi) peak = Math.max(peak, ms);
      if (peak && ms < peak * 0.82) { // 착지 꼭대기를 지나는 순간
        peak = 0; flight = false;
        if (now - S.last > MIN_GAP_MS) jump(now);
      }
    }
    window.addEventListener("devicemotion", onMotion);
    cleanup.push(() => window.removeEventListener("devicemotion", onMotion));

    const bigVal = () => (g.type === "streak" ? S.combo : g.type === "rhythm" ? S.rhythmCombo : S.count);
    function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
    function jump(now) {
      const dt = S.last ? now - S.last : 0;
      if (!S.last || dt > BREAK_MS) { S.combo = 0; S.rhythmCombo = 0; S.intervals = []; S.streakStart = now; }
      else S.intervals.push(dt);
      S.last = now; S.count++; S.combo++; S.best = Math.max(S.best, S.combo);
      // 박자 판정
      let j = "";
      if (S.intervals.length >= 3) {
        const md = median(S.intervals.slice(-6)), dev = Math.abs(dt - md) / md;
        j = dev <= 0.12 ? "PERFECT" : dev <= 0.25 ? "GOOD" : "흔들!";
      }
      S.rhythmCombo = j === "흔들!" ? 0 : S.rhythmCombo + 1;
      S.bestRhythm = Math.max(S.bestRhythm, S.rhythmCombo);
      beep(S.combo % 10 === 0 ? 1320 : 880, 0.04, 0.08);
      if (S.count % 10 === 0) say(`${S.count}개`);
      if (j) showJudge(j);
      if (g.type !== "endure") el("hBig").textContent = String(bigVal());
      el("hCombo").textContent = S.combo; el("hBest").textContent = S.best; el("hCount").textContent = S.count;
      const big = el("hBig"); big.classList.remove("bump"); void big.offsetWidth; big.classList.add("bump");
    }
    function showJudge(j) {
      const n = el("hJudge"); n.textContent = j; n.className = "judge " + (j === "PERFECT" ? "pf" : j === "GOOD" ? "gd" : "ms");
      void n.offsetWidth; n.classList.add("show");
    }

    function progress(now) {
      const going = S.last && now - S.last <= BREAK_MS;
      const cont = going ? (S.last - S.streakStart) / 1000 : 0;
      S.endureBest = Math.max(S.endureBest, cont);
      switch (g.type) {
        case "streak": return { v: S.combo, max: g.n, txt: `${S.combo} / ${g.n}`, win: S.combo >= g.n };
        case "speed": return { v: S.count, max: g.n, txt: `${S.count} / ${g.n}`, win: S.count >= g.n };
        case "rhythm": return { v: S.rhythmCombo, max: g.n, txt: `${S.rhythmCombo} / ${g.n}`, win: S.rhythmCombo >= g.n };
        default: return { v: cont, max: g.sec, txt: `${fmt(cont)} / ${fmt(g.sec)}`, win: cont >= g.sec };
      }
    }

    // 준비 카운트다운
    say(`${PREP_SEC}초 안에 폰을 넣고 줄을 잡아!`);
    let left = PREP_SEC;
    const prepT = setInterval(() => {
      left--;
      if (left > 3) { el("hBig").textContent = left; return; }
      if (left > 0) { el("hBig").textContent = left; el("hSub").textContent = "곧 시작!"; beep(660, 0.15, 0.22); buzz(80); return; }
      clearInterval(prepT);
      if (!lastEvent) { stop(); return noSensor(seal, opts, "센서 신호가 안 들어와."); }
      phase = "go"; t0 = performance.now();
      el("hBig").textContent = "START!"; el("hBig").classList.add("start"); el("hSub").textContent = "뛰어!";
      beep(990, 0.4, 0.25); buzz([120, 60, 120]); say("시작!");
      setTimeout(() => { el("hBig").classList.remove("start"); if (phase === "go") el("hBig").textContent = g.type === "endure" ? "0:00" : String(bigVal()); }, 700);
      loop();
    }, 1000);
    cleanup.push(() => clearInterval(prepT));

    let brokeShown = false;
    function loop() {
      if (phase !== "go") return;
      const now = performance.now(), el_s = (now - t0) / 1000;
      const limit = g.type === "speed" ? g.sec : g.limit;
      el("hTime").textContent = fmt(limit - el_s);
      const p = progress(now);
      el("hExp").style.width = Math.min(100, (p.v / p.max) * 100) + "%";
      el("hExpTxt").textContent = p.txt;
      if (g.type === "endure" && S.last) el("hBig").textContent = fmt(p.v);
      // 끊김 알림
      if (S.last && now - S.last > BREAK_MS && !brokeShown && S.combo > 0) {
        brokeShown = true; S.broke++;
        showJudge("끊겼어! 다시!"); beep(220, 0.25, 0.18, "sawtooth");
        if (g.type !== "speed") { S.combo = 0; S.rhythmCombo = 0; el("hCombo").textContent = 0; if (g.type !== "endure") el("hBig").textContent = "0"; }
      }
      if (S.last && now - S.last <= BREAK_MS) brokeShown = false;
      // 센서가 멈췄는지
      if (now - lastEvent > 2500) { stop(); return noSensor(seal, opts, "센서 신호가 끊겼어."); }
      if (p.win && g.type !== "speed") return finish(true, p);
      if (el_s >= limit) return finish(p.win, p);
      raf = requestAnimationFrame(loop);
    }
    cleanup.push(() => cancelAnimationFrame(raf));

    function stop() { phase = "done"; cancelAnimationFrame(raf); clearInterval(prepT); window.removeEventListener("devicemotion", onMotion); }

    // 화면이 꺼지거나 다른 앱으로 가면 멈춤
    const vis = () => { if (document.hidden && phase !== "done") { stop(); result(false, null, "화면이 꺼지거나 다른 앱으로 가서 측정이 멈췄어."); } };
    document.addEventListener("visibilitychange", vis);
    cleanup.push(() => document.removeEventListener("visibilitychange", vis));

    // 2초 꾹 눌러 멈추기
    let holdT = 0, holdStart = 0;
    const ring = el("holdRing");
    const down = (e) => {
      e.preventDefault(); holdStart = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - holdStart) / 2000);
        ring.setAttribute("stroke-dashoffset", String(119.4 * (1 - k)));
        if (k >= 1) { stop(); result(false, null, "멈췄어. 쉬었다가 다시 하자!"); return; }
        holdT = requestAnimationFrame(step);
      };
      holdT = requestAnimationFrame(step);
    };
    const up = () => { cancelAnimationFrame(holdT); ring.setAttribute("stroke-dashoffset", "119.4"); };
    const hud = $(layer, ".hud");
    hud.addEventListener("pointerdown", down); hud.addEventListener("pointerup", up); hud.addEventListener("pointercancel", up); hud.addEventListener("pointerleave", up);

    function finish(win, p) { stop(); result(win, p); }
    function result(win, p, why) {
      const stats = `<div class="rstats"><div><small>전체</small><b>${S.count}</b></div><div><small>최고 콤보</small><b>${S.best}</b></div><div><small>${g.type === "rhythm" ? "박자 콤보" : g.type === "endure" ? "최고 연속 시간" : "끊긴 횟수"}</small><b>${g.type === "rhythm" ? S.bestRhythm : g.type === "endure" ? fmt(S.endureBest) : S.broke}</b></div></div>`;
      if (win) {
        fanfare(); buzz([100, 50, 100, 50, 300]); say("퀘스트 클리어!");
        layer.innerHTML = `<div class="clear"><div class="bigtext">QUEST CLEAR!</div>${stats}
          ${npc(`대단해! <b>${esc(seal.mission)}</b> 성공! 씰 봉투가 도착했어!`)}
          <button class="gbtn" id="getSeal">씰 받으러 가기 ▶</button></div>`;
        $(layer, "#getSeal").onclick = () => { close(); opts.onClear && opts.onClear({ count: S.count, best: S.best }); };
      } else {
        sadTone(); say("아쉬워! 다시 도전하자");
        const near = p && p.max ? Math.round((p.v / p.max) * 100) : 0;
        layer.innerHTML = `<div class="qwin pop center"><div class="qwin-title">아쉬워!</div>
          <div class="bigtext fail">TRY AGAIN</div>${stats}
          ${npc(why ? why : near >= 70 ? `목표의 ${near}%까지 왔어! 거의 다 했어, 한 번만 더!` : "괜찮아, 처음엔 다 그래. 조금 쉬었다가 다시 해 보자!")}
          <div class="qbtns"><button class="gbtn" data-go="retry">다시 도전!</button><button class="gbtn gray" data-go="close">그만하기</button></div></div>`;
      }
    }
  }

  window.JumpChallenge = { start, close, _SENS: SENS };
})();
