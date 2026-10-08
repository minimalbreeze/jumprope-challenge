/* 줄넘기 등급 챌린지 — 도감 화면 */
(function () {
  const { SEALS, METAL, metalOf, sealSVG } = window.JumpSeals;
  const SITE_URL = "https://minimalbreeze.github.io/jumprope-challenge/";
  const KEY = "jumprope:state";
  const ADJ = ["날쌘", "통통", "씩씩한", "반짝", "폴짝", "힘찬", "용감한", "신나는", "재빠른", "뽀송"];
  const ANI = ["토끼", "펭귄", "판다", "여우", "돌고래", "다람쥐", "고양이", "강아지", "치타", "개구리"];
  const $ = (s) => document.querySelector(s);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rollNick = () => pick(ADJ) + " " + pick(ANI);
  const pad = (n) => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BASE = /github\.io$|minimalbreeze\.com$|^localhost$|^127\./.test(location.hostname)
    ? location.origin + location.pathname : SITE_URL;

  // ---------- 상태 ----------
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {}
    return { v: 1, nick: "", grade: 0, seals: {}, reps: [], cards: {}, sound: true };
  }
  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  let me = { id: "" };
  let filter = "all", peek = false;

  const has = (no) => !!state.seals[no];
  // 학년 클리어 카드 발급일: 기록이 없으면(예전 기록) 그 코스 마지막 씰 받은 날
  const cardDate = (g) => (state.cards && state.cards[g] && state.cards[g].at) ||
    [1, 2, 3, 4, 5].map((s) => (state.seals[(g - 1) * 5 + s] || {}).at || "").sort().pop();
  const courseDone = (g) => [1, 2, 3, 4, 5].every((s) => has((g - 1) * 5 + s));
  const unlocked = (g) => g === 1 || courseDone(g - 1);
  const available = (s) => !has(s.no) && unlocked(s.grade) && (s.stage === 1 || has(s.no - 1));
  const sealByNo = (no) => SEALS[no - 1];

  function sealHTML(seal, { owned, holo }) {
    const svg = sealSVG(seal, { empty: !owned, holo });
    return holo ? `<span class="holo" style="display:block;width:100%">${svg}</span>` : svg;
  }

  // ---------- 알림 ----------
  let toastT;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2400);
  }

  // ---------- 시트 ----------
  function openSheet(html, onMount) {
    closeSheet();
    const scrim = document.createElement("div");
    scrim.className = "scrim"; scrim.id = "scrim";
    scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    scrim.addEventListener("click", (e) => { if (e.target === scrim || e.target.closest("[data-close]")) closeSheet(); });
    document.body.appendChild(scrim);
    onMount && onMount(scrim.firstElementChild);
    const f = scrim.querySelector("button"); f && f.focus();
  }
  function closeSheet() { const s = $("#scrim"); s && s.remove(); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // ---------- 머리·처음 시작 ----------
  function renderMe() {
    const chip = $("#meChip");
    if (!state.grade) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.innerHTML = `<span class="lv">${state.grade}학년</span><b>${esc(state.nick)}</b>${me.id ? `<span class="idtag">#${me.id}</span>` : ""}`;
  }

  let draft = { grade: 0, nick: rollNick() };
  function renderHello() {
    const box = $("#hello");
    box.hidden = !!state.grade;
    if (state.grade) return;
    const row = $("#gradeChips");
    row.querySelectorAll("button").forEach((b) => b.remove());
    for (let g = 1; g <= 6; g++) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = g + "학년"; b.setAttribute("aria-pressed", draft.grade === g);
      b.onclick = () => { draft.grade = g; renderHello(); };
      row.appendChild(b);
    }
    $("#nickPreview").textContent = draft.nick;
    $("#startBtn").disabled = !draft.grade;
  }
  $("#reroll").onclick = () => { draft.nick = rollNick(); renderHello(); };
  $("#startBtn").onclick = () => {
    state.grade = draft.grade; state.nick = draft.nick; save(); renderAll();
    toast("1학년 코스 1단계부터 시작! 하나씩 깨면 다음 단계가 열려");
  };

  // ---------- 요약 ----------
  function stats(seals) {
    const nos = Object.keys(seals).map(Number);
    const holo = nos.filter((n) => seals[n] && seals[n].holo).length;
    let done = 0;
    for (let g = 1; g <= 6; g++) if ([1, 2, 3, 4, 5].every((s) => seals[(g - 1) * 5 + s])) done++;
    return { n: nos.length, holo, done };
  }
  function repsList() {
    const r = state.reps.filter(has);
    return r.length ? r : Object.keys(state.seals).map(Number).sort((a, b) => b - a).slice(0, 3);
  }
  function renderSummary() {
    const show = !!state.grade;
    $("#summary").hidden = !show; $("#settings").hidden = !show;
    if (!show) return;
    const st = stats(state.seals);
    $("#cnt").textContent = st.n;
    $("#barFill").style.width = (st.n / 30) * 100 + "%";
    $("#facts").innerHTML = `<span>반짝이 ${st.holo}장</span><span>시크릿 카드 ${st.done} / 6</span>${state.master ? "<span>👑 마스터</span>" : ""}`;
    const slots = $("#slots"); slots.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const no = state.reps[i];
      const b = document.createElement("button");
      if (no && has(no)) {
        b.className = "slot filled"; b.innerHTML = sealHTML(sealByNo(no), { owned: true, holo: state.seals[no].holo });
        b.setAttribute("aria-label", `대표 씰 ${i + 1}: ${sealByNo(no).name}`);
        b.onclick = () => openSeal(no);
      } else {
        b.className = "slot"; b.textContent = "비어 있어";
        b.onclick = () => toast("도감에서 씰을 누르고 '대표 씰로 걸기'를 눌러");
      }
      slots.appendChild(b);
    }
  }

  // ---------- 도감 ----------
  function renderAlbum() {
    const box = $("#album"); let html = "";
    for (let g = 1; g <= 6; g++) {
      const open = unlocked(g), done = courseDone(g);
      const n = [1, 2, 3, 4, 5].filter((s) => has((g - 1) * 5 + s)).length;
      const state_ = done ? "완주! 코스 씰 5장 다 모음" : open ? `${n} / 5` : `🔒 ${g - 1}학년 코스를 다 깨면 열려`;
      let cells = "", visible = 0;
      for (let s = 1; s <= 5; s++) {
        const seal = SEALS[(g - 1) * 5 + s - 1], own = has(seal.no);
        const show = filter === "all" || (filter === "have" ? own : !own);
        if (show) visible++;
        const art = own || peek;
        cells += `<button class="cell ${available(seal) && state.grade ? "next" : ""} ${show ? "" : "hide"}" data-no="${seal.no}" aria-label="No.${seal.no} ${own ? seal.name : "아직 못 모은 씰"}">
          ${sealHTML(seal, { owned: art, holo: own && state.seals[seal.no].holo })}
          <small>${own ? esc(seal.name) : seal.stageName}</small></button>`;
      }
      if (!visible) continue;
      html += `<article class="panel course ${open ? "" : "locked"} ${done ? "done" : ""}">
        <header><h3>${g}학년 코스<span class="metal ${metalOf(g)}">${METAL[metalOf(g)].label}</span></h3><span class="state">${state_}</span></header>
        <div class="cells">${cells}</div></article>`;
    }
    if (filter !== "need") {
      const cards = [1, 2, 3, 4, 5, 6].map((g) => { const own = courseDone(g);
        return `<button class="cell card-cell" data-card="${g}" aria-label="${own ? `${g}학년 클리어 카드 보기` : `${g}학년 시크릿 카드: 아직 잠김`}"><span class="${own ? "holo-card" : ""}" style="display:block;width:100%">${window.JumpSeals.courseCardSVG(g, own ? cardInfo(g) : {}, !own)}</span><small>${own ? `${g}학년 클리어` : "???"}</small></button>`; }).join("");
      html += `<article class="panel course secret"><span class="wtitle">🔒 시크릿 카드 ${stats(state.seals).done} / 6</span>
        <p class="muted" style="margin:4px 0 0;font-size:13px;text-align:center">학년 코스 씰 5장을 다 모으면 그 학년의 시크릿 카드가 열려.</p>
        <div class="card-grid">${cards}</div>
        <button class="cell secret-cell" id="masterCell" aria-label="${state.master ? "마스터 카드 보기" : "마스터 카드: 아직 잠김"}">
          <span class="${state.master ? "holo-card" : ""}" style="display:block;width:100%">${window.JumpSeals.masterSVG(state.master ? masterInfo() : {}, !state.master)}</span>
          <small>${state.master ? "👑 마스터 카드" : "마지막 카드: 30장을 모두 모으면 열려"}</small>
        </button></article>`;
    }
    box.innerHTML = html || `<p class="panel muted" style="margin:0">${filter === "have" ? "아직 모은 씰이 없어. 1단계부터 도전해 봐!" : "30장 다 모았어! 도감 완성 🎉"}</p>`;
    const mc = $("#masterCell"); mc && (mc.onclick = openMaster);
    box.querySelectorAll("[data-card]").forEach((b) => (b.onclick = () => openCard(+b.dataset.card)));
    box.querySelectorAll(".cell").forEach((b) => (b.onclick = () => openSeal(+b.dataset.no)));
  }
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    filter = b.dataset.f;
    $("#tabs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderAlbum();
  });

  // ---------- 씰 상세 ----------
  function openSeal(no) {
    const seal = sealByNo(no), own = has(no), rec = state.seals[no];
    const metal = METAL[metalOf(seal.grade)].label;
    let body, actions;
    if (own) {
      const isRep = state.reps.includes(no);
      body = `<div class="big">${sealHTML(seal, { owned: true, holo: rec.holo })}</div>
        <h2>${esc(seal.name)}</h2>
        <div class="muted">No.${pad(no)} · ${seal.animal} · ${seal.grade}학년 코스 ${seal.stage}단계 ${seal.stageName}</div>
        <div><span class="pill">${metal} 씰</span> ${rec.holo ? '<span class="pill">✨ 반짝이</span>' : ""} <span class="pill">받은 날 ${rec.at}</span></div>
        <div class="mission">${seal.mission}</div>`;
      actions = `<button class="btn" id="repBtn">${isRep ? "대표 씰에서 내리기" : "대표 씰로 걸기"}</button><button class="btn ghost" data-close>닫기</button>`;
    } else {
      body = `<div class="big">${sealHTML(seal, { owned: peek, holo: false })}</div>
        <h2>No.${pad(no)} ${peek ? esc(seal.name) : "???"}</h2>
        <div class="muted">${seal.grade}학년 코스 ${seal.stage}단계 ${seal.stageName} · ${metal} 씰</div>
        <div class="mission">${seal.mission}</div>`;
      if (!state.grade) {
        body += `<p class="note">먼저 위에서 학년을 고르고 도감을 시작해 줘.</p>`;
        actions = `<button class="btn ghost" data-close>닫기</button>`;
      } else if (available(seal)) {
        body += `<p class="note">퀘스트를 깨면 이 씰을 받아. 어른이나 친구가 폰으로 찍으면서 심판을 봐 줘야 해.</p>`;
        actions = `<button class="btn" id="questBtn">퀘스트 도전! ⚔️</button>${peek ? '<button class="btn ghost" id="winBtn">시험용 성공</button>' : ""}<button class="btn ghost" data-close>닫기</button>`;
      } else if (!unlocked(seal.grade)) {
        body += `<p class="note">🔒 ${seal.grade - 1}학년 코스 씰 5장을 다 모으면 열려.${seal.grade > state.grade ? " 내 학년보다 높은 코스라 반짝이 씰로 나와!" : ""}</p>`;
        actions = `<button class="btn ghost" data-close>닫기</button>`;
      } else {
        body += `<p class="note">앞 단계 씰(${seal.stage - 1}단계)을 먼저 모아야 도전할 수 있어.</p>`;
        actions = `<button class="btn ghost" data-close>닫기</button>`;
      }
    }
    openSheet(`${body}<div class="actions">${actions}</div>`, (el) => {
      const rep = el.querySelector("#repBtn");
      rep && (rep.onclick = () => {
        const i = state.reps.indexOf(no);
        if (i >= 0) state.reps.splice(i, 1);
        else { state.reps = state.reps.filter(has); if (state.reps.length >= 3) state.reps.shift(); state.reps.push(no); }
        save(); closeSheet(); renderSummary(); toast(i >= 0 ? "대표 씰에서 내렸어" : "대표 씰로 걸었어");
      });
      const q = el.querySelector("#questBtn");
      q && (q.onclick = () => {
        closeSheet();
        JumpChallenge.start(seal, { sound: state.sound !== false, dev: peek, nick: state.nick, myGrade: state.grade, onClear: () => award(no) });
      });
      const win = el.querySelector("#winBtn");
      win && (win.onclick = () => { closeSheet(); award(no); });
    });
  }

  // ---------- 새 씰 받기 ----------
  function award(no) {
    const seal = sealByNo(no);
    const wasOpen = [1, 2, 3, 4, 5, 6].map(unlocked);
    const wasDone = courseDone(seal.grade);
    state.seals[no] = { at: today(), holo: seal.grade > state.grade };
    save();
    const msgs = [];
    if (courseDone(seal.grade)) msgs.push(`${seal.grade}학년 코스 완주! 🎉`);
    [1, 2, 3, 4, 5, 6].forEach((g, i) => { if (!wasOpen[i] && unlocked(g)) msgs.push(`${g}학년 코스가 열렸어!${g > state.grade ? " 여기서 따는 씰은 전부 반짝이야 ✨" : ""}`); });
    const chain = [];
    if (!wasDone && courseDone(seal.grade)) {
      state.cards = state.cards || {}; state.cards[seal.grade] = { at: today() }; save();
      msgs.push("어? 씰 봉투 뒤에 뭔가 숨어 있어… 👀");
      chain.push(() => showCardReveal(seal.grade, next));
    }
    if (Object.keys(state.seals).length === 30 && !state.master) {
      state.master = { at: today() }; save();
      chain.push(() => showMasterReveal(next));
    }
    function next() { const f = chain.shift(); f ? f() : renderAll(); }
    reveal(seal, state.seals[no].holo, msgs, next);
    renderAll();
  }
  function reveal(seal, holo, msgs, after) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ov = document.createElement("div");
    ov.className = "reveal"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "새 씰");
    ov.innerHTML = `<div class="stage"><h2>새 씰이 왔어!</h2><button class="pack" id="pack" aria-label="씰 봉투 뜯기">톡! 뜯기</button><p>눌러서 뜯어봐</p></div>`;
    document.body.appendChild(ov);
    const show = () => {
      ov.querySelector(".stage").innerHTML = `<h2>${holo ? "✨ 반짝이 " : ""}${esc(seal.name)}!</h2>
        <div class="card">${sealHTML(seal, { owned: true, holo })}</div>
        <p>No.${pad(seal.no)} ${seal.animal} · ${seal.grade}학년 코스 ${seal.stage}단계</p>
        ${msgs.map((m) => `<p><b>${m}</b></p>`).join("")}
        <button class="btn" id="okBtn">도감에 붙이기</button>`;
      ov.querySelector("#okBtn").onclick = () => { ov.remove(); after && after(); };
      ov.querySelector("#okBtn").focus();
      if (!reduce) confetti();
    };
    const pack = ov.querySelector("#pack");
    pack.focus();
    pack.onclick = show;
    setTimeout(() => { if (ov.querySelector("#pack")) show(); }, 1800);
  }
  const masterInfo = () => ({ nick: state.nick, id: me.id, date: state.master && state.master.at });
  function secretReveal({ locked, opened, title, text, keep }, done) {
    const ov = document.createElement("div");
    ov.className = "reveal"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", title);
    ov.innerHTML = `<div class="stage"><h2>시크릿 카드 발견!</h2><button class="pack master-pack" id="pack" aria-label="시크릿 카드 열기">${locked}</button><p>눌러서 열어 봐!</p></div>`;
    document.body.appendChild(ov);
    ov.querySelector("#pack").focus();
    ov.querySelector("#pack").onclick = () => {
      ov.querySelector(".stage").innerHTML = `<h2>${title}</h2><div class="card master-card holo-card">${opened}</div><p>${text}</p><button class="btn" id="okBtn">${keep}</button>`;
      ov.querySelector("#okBtn").onclick = () => { ov.remove(); done && done(); };
      ov.querySelector("#okBtn").focus();
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { confetti(); setTimeout(confetti, 600); }
    };
  }
  const cardInfo = (g) => ({ nick: state.nick, id: me.id, date: cardDate(g) });
  function showCardReveal(g, done) {
    secretReveal({
      locked: window.JumpSeals.courseCardSVG(g, {}, true),
      opened: window.JumpSeals.courseCardSVG(g, cardInfo(g)),
      title: `🎉 ${g}학년 클리어 카드!`,
      text: g < 6 ? `${g}학년 코스를 다 깼어! 시크릿 카드 ${g} / 6장. 이제 ${g + 1}학년 코스로 가자!` : "6학년 코스까지 다 깼어! 시크릿 카드 6장을 모두 모았어.",
      keep: "카드 보관하기",
    }, done);
  }
  function showMasterReveal(done) {
    secretReveal({
      locked: window.JumpSeals.masterSVG({}, true),
      opened: window.JumpSeals.masterSVG(masterInfo()),
      title: "👑 마스터 카드 발급!",
      text: `${esc(state.nick)}, 넌 이제 진짜 줄넘기왕이야! 씰 30장과 시크릿 카드 6장을 다 모은 사람만 받는 카드야.`,
      keep: "도감에 보관하기",
    }, done);
  }
  function openCard(g) {
    const own = courseDone(g);
    openSheet(`<div class="big master-big ${own ? "holo-card" : ""}">${window.JumpSeals.courseCardSVG(g, own ? cardInfo(g) : {}, !own)}</div>
      <h2>${own ? `${g}학년 클리어 카드` : `${g}학년 시크릿 카드`}</h2>
      <p class="note">${own ? `${g}학년 코스 씰 5장을 모두 모아서 받은 카드야. 별명과 도감 번호가 새겨져 있어.` : `${g}학년 코스 씰 5장을 모두 모으면 열려. 어떤 카드인지는 비밀!`}</p>
      <div class="actions"><button class="btn ghost" data-close>닫기</button></div>`);
  }
  function openMaster() {
    if (!state.master) {
      openSheet(`<div class="big master-big">${window.JumpSeals.masterSVG({}, true)}</div><h2>시크릿 카드</h2>
        <p class="note">씰 30장(시크릿 카드 6장)을 모두 모으면 열리는 마지막 카드야. 무슨 카드인지는 비밀! (지금 씰 ${Object.keys(state.seals).length} / 30장)</p>
        <div class="actions"><button class="btn ghost" data-close>닫기</button></div>`);
      return;
    }
    openSheet(`<div class="big master-big holo-card">${window.JumpSeals.masterSVG(masterInfo())}</div><h2>마스터 카드</h2>
      <div><span class="pill">👑 줄넘기왕</span> <span class="pill">발급일 ${state.master.at}</span></div>
      <p class="note">자랑 카드와 공유 링크에도 마스터 표시가 붙어. 링크를 연 친구도 이 카드를 볼 수 있어.</p>
      <div class="actions"><button class="btn" id="mShare">자랑하기 📣</button><button class="btn ghost" data-close>닫기</button></div>`,
      (el) => { el.querySelector("#mShare").onclick = () => { closeSheet(); share(); }; });
  }
  function confetti() {
    const c = document.createElement("div"); c.className = "confetti";
    const cols = ["#ff6f61", "#ffd36b", "#7dd3a8", "#6bc6ff", "#c39bff", "#ff9ad5"];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length];
      p.style.animationDelay = Math.random() * 0.5 + "s"; p.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.appendChild(p);
    }
    document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
  }

  // ---------- 자랑하기 ----------
  function payloadOf() {
    let c = "";
    for (let i = 1; i <= 30; i++) c += state.seals[i] ? (state.seals[i].holo ? "2" : "1") : "0";
    return { v: 1, n: state.nick, g: state.grade, c, r: repsList(), t: today(), ...(state.master ? { m: state.master.at } : {}) };
  }
  const decodeSeals = (c) => { const o = {}; [...c].forEach((ch, i) => { if (ch !== "0") o[i + 1] = { holo: ch === "2" }; }); return o; };

  function svgImage(svg) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  async function makeCard(p, id, url) {
    const W = 1080, H = 1500;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    try { await document.fonts.load("40px Jua"); } catch (e) {}
    const F = (s) => `${s}px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    // 바탕
    const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#5ebcff"); sky.addColorStop(0.5, "#bfe7ff"); sky.addColorStop(1, "#eaf8ff");
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    x.fillStyle = "#fffdf5"; roundRect(x, 30, 30, W - 60, H - 60, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = "#2d3f73"; x.stroke(); x.lineWidth = 5; x.strokeStyle = "#f7c948"; roundRect(x, 40, 40, W - 80, H - 80, 28); x.stroke();
    // 글자
    x.fillStyle = "#ff7a2f"; x.font = F(40); x.fillText("줄넘기 등급 챌린지 · 씰 도감", 70, 104);
    if (p.m) { x.fillStyle = "#2d3f73"; roundRect(x, 760, 66, 250, 56, 28); x.fill(); x.fillStyle = "#ffd84a"; x.font = F(34); x.fillText("👑 MASTER", 790, 106); }
    x.fillStyle = "#2d3f73"; x.font = F(86); x.fillText(p.n, 70, 200);
    const seals = decodeSeals(p.c), st = stats(seals);
    x.fillStyle = "#5f7a84"; x.font = F(34);
    x.fillText(`${p.g}학년 · 도감 번호 #${id || "----"}`, 70, 254);
    x.fillStyle = "#1d3640"; x.font = F(36);
    x.fillText(`${st.n} / 30장  ·  반짝이 ${st.holo}장  ·  완주 ${st.done}코스`, 70, 310);
    // 대표 씰
    const reps = p.r.filter((n) => seals[n]).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const cx = 75 + i * 320;
      if (reps[i]) x.drawImage(await svgImage(sealSVG(sealByNo(reps[i]), { holo: seals[reps[i]].holo })), cx, 340, 290, 290);
      else { x.strokeStyle = "#cfe0e5"; x.setLineDash([12, 12]); x.lineWidth = 4; x.beginPath(); x.arc(cx + 150, 490, 140, 0, 7); x.stroke(); x.setLineDash([]); }
    }
    // 30장 미니 도감
    const S = 104, GAP = 10, X0 = 70, Y0 = 680;
    for (const seal of SEALS) {
      const r = seal.grade - 1, c = seal.stage - 1, own = !!seals[seal.no];
      x.drawImage(await svgImage(sealSVG(seal, { empty: !own, holo: own && seals[seal.no].holo })), X0 + c * (S + GAP), Y0 + r * (S + GAP), S, S);
    }
    // 무늬(별명 + 도감 번호)를 카드 전체에 비스듬히 깐다 — 사진만 잘라 써도 원래 주인 이름이 따라간다
    x.save(); x.translate(W / 2, H / 2); x.rotate(-0.42);
    x.font = F(34); x.fillStyle = "rgba(29,54,64,0.085)";
    const mark = `${p.n} #${id || "----"}`, mw = x.measureText(mark).width + 70;
    for (let yy = -1500, k = 0; yy < 1500; yy += 110, k++) for (let xx = -1500 + (k % 2) * (mw / 2); xx < 1500; xx += mw) x.fillText(mark, xx, yy);
    x.restore();
    // QR (진짜 주인 확인 링크)
    const QX = 680, QY = 700, QS = 340;
    x.fillStyle = "#ffffff"; roundRect(x, QX, QY, QS, QS, 24); x.fill();
    try {
      const qr = qrcode(0, "L"); qr.addData(url, "Byte"); qr.make();
      const n = qr.getModuleCount(), cell = Math.floor((QS - 36) / n), off = (QS - cell * n) / 2;
      x.fillStyle = "#1d3640";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect(QX + off + c * cell, QY + off + r * cell, cell, cell);
    } catch (e) { x.fillStyle = "#5f7a84"; x.font = F(26); x.fillText("QR을 못 만들었어", QX + 60, QY + 180); }
    x.fillStyle = "#1d3640"; x.font = F(32);
    x.fillText("QR을 찍으면", QX, QY + QS + 56);
    x.fillText("진짜 주인이 나와요", QX, QY + QS + 98);
    x.fillStyle = "#5f7a84"; x.font = F(26);
    x.fillText(`${p.t} 발급`, QX, QY + QS + 146);
    x.fillStyle = "#ff6f61"; x.font = F(38);
    x.fillText(`#${id || "----"}`, QX, QY + QS + 200);
    x.fillStyle = "#6b7290"; x.font = F(28); x.textAlign = "center";
    x.fillText("링크를 열었을 때 '✔ 진짜 도감'이 떠야 진짜야", W / 2, H - 70);
    return cv;
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  async function share() {
    if (!Object.keys(state.seals).length) { toast("씰을 한 장이라도 모으면 자랑할 수 있어!"); return; }
    openSheet(`<h2>자랑 카드 만드는 중…</h2><p class="muted">잠깐만!</p>`);
    const p = payloadOf();
    const token = await JumpID.seal(p);
    const url = BASE + "?d=" + token;
    const cv = await makeCard(p, me.id, url);
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    const imgURL = URL.createObjectURL(blob);
    const file = new File([blob], `줄넘기도감_${state.nick.replace(/\s/g, "")}.png`, { type: "image/png" });
    openSheet(`<h2>자랑 카드 완성!</h2>
      <img class="cardimg" src="${imgURL}" alt="${esc(state.nick)}의 씰 도감 카드">
      <div class="actions">
        <button class="btn" id="saveImg">이미지 저장·보내기</button>
        <button class="btn ghost" id="copyLink">링크 복사</button>
        ${navigator.share ? '<button class="btn ghost" id="shareLink">링크 보내기</button>' : ""}
      </div>
      <div class="guard">
        <b>🔐 남이 내 도감을 자기 거라고 못 하게</b>
        <span>· 카드 전체에 <b style="font-size:inherit">${esc(state.nick)} #${me.id || "----"}</b> 무늬가 새겨져 있어. 잘라 써도 따라가.</span>
        <span>· QR이나 링크를 열면 이 폰에서 만든 도감인지 확인해서 "✔ 진짜 도감"을 띄워 줘.</span>
        <span>· 링크 내용을 고치면 바로 "⚠ 확인 안 된 도감"으로 바뀌어.</span>
        <span>· 친구가 "진짜 네 거야?" 하면 네 폰으로 링크를 열어 봐. 👑 내 도감 표시는 네 폰에서만 떠.</span>
      </div>
      <input id="linkBox" readonly value="${esc(url)}" aria-label="공유 링크" style="width:100%;font:inherit;font-size:12px;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--soft);color:var(--ink)">
      <div class="actions"><button class="btn ghost small" id="previewBtn">받는 친구 화면 미리보기</button><button class="btn ghost small" data-close>닫기</button></div>`,
      (el) => {
        el.querySelector("#saveImg").onclick = async () => {
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "줄넘기 씰 도감" }); return; }
          } catch (e) { if (e && e.name === "AbortError") return; }
          const a = document.createElement("a"); a.href = imgURL; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
          toast("저장이 안 되면 카드 그림을 길게 눌러서 저장해");
        };
        el.querySelector("#copyLink").onclick = () => {
          navigator.clipboard.writeText(url).then(() => toast("링크를 복사했어")).catch(() => { const i = el.querySelector("#linkBox"); i.focus(); i.select(); toast("링크를 선택해 뒀어. 복사해서 보내 줘"); });
        };
        const sl = el.querySelector("#shareLink");
        sl && (sl.onclick = () => navigator.share({ title: `${state.nick}의 줄넘기 씰 도감`, text: `나 줄넘기 씰 ${stats(state.seals).n}장 모았다! 진짜인지 확인해 봐 👀`, url }).catch(() => {}));
        el.querySelector("#previewBtn").onclick = async () => { closeSheet(); showViewer(await JumpID.open(token), true); };
      });
  }
  $("#shareBtn").onclick = share;

  // ---------- 공유 링크로 들어온 화면 ----------
  let clockT;
  function showViewer(res, preview) {
    ["#hello", "#summary", "#tabs", "#album", "#settings"].forEach((s) => ($(s).hidden = true));
    const v = $("#viewer"); v.hidden = false;
    const p = res.payload, seals = decodeSeals(p.c || ""), st = stats(seals);
    const verify = res.status === "ok"
      ? `<div class="verify ok"><b>✔ 진짜 도감</b><span>도감 번호 #${res.id} · 이 별명의 주인 폰에서 만든 링크야</span><span class="live" id="clock"></span></div>`
      : res.status === "bad"
        ? `<div class="verify bad"><b>⚠ 확인 안 된 도감</b><span>누가 내용을 고친 링크야. 믿으면 안 돼!</span></div>`
        : `<div class="verify unsigned"><b>? 주인 확인 불가</b><span>서명이 없는 링크라 누구 건지 확인할 수 없어.</span></div>`;
    const reps = (p.r || []).filter((n) => seals[n]).slice(0, 3);
    let grid = "";
    for (let g = 1; g <= 6; g++) {
      let cells = "";
      for (let s = 1; s <= 5; s++) {
        const seal = SEALS[(g - 1) * 5 + s - 1], own = !!seals[seal.no];
        cells += `<div class="cell" style="cursor:default">${sealHTML(seal, { owned: own, holo: own && seals[seal.no].holo })}<small>${own ? esc(seal.name) : seal.stageName}</small></div>`;
      }
      grid += `<article class="panel course"><header><h3>${g}학년 코스<span class="metal ${metalOf(g)}">${METAL[metalOf(g)].label}</span></h3></header><div class="cells">${cells}</div></article>`;
    }
    v.innerHTML = `<div class="wrap" style="padding:0">
      ${verify}
      ${res.mine ? `<div class="crown">👑 이 폰에서 만든 내 도감이야</div>` : ""}
      <section class="panel owner" style="${res.status === "bad" ? "opacity:.6" : ""}">
        <span class="muted">${res.mine ? "내" : "친구의"} 줄넘기 씰 도감</span>
        <h2>${esc(p.n || "이름 없음")}</h2>
        <div class="muted">${p.g}학년 · 씰 ${st.n} / 30장 · 반짝이 ${st.holo}장 · 완주 ${st.done}코스 · ${esc(p.t || "")} 발급</div>
        ${reps.length ? `<div class="cells" style="grid-template-columns:repeat(3,minmax(0,1fr));max-width:420px">${reps.map((n) => `<div>${sealHTML(sealByNo(n), { owned: true, holo: seals[n].holo })}</div>`).join("")}</div>` : ""}
      </section>
      ${st.done ? `<section class="panel course secret"><span class="wtitle">시크릿 카드 ${st.done} / 6</span><div class="card-grid">${[1, 2, 3, 4, 5, 6].filter((g) => [1, 2, 3, 4, 5].every((k) => seals[(g - 1) * 5 + k])).map((g) => `<div class="cell" style="cursor:default"><span class="holo-card" style="display:block;width:100%">${window.JumpSeals.courseCardSVG(g, { nick: p.n, id: res.id })}</span><small>${g}학년 클리어</small></div>`).join("")}</div></section>` : ""}
      ${p.m && st.n === 30 ? `<section class="panel owner" style="justify-items:center;text-align:center"><span class="wtitle">👑 마스터 카드</span><div class="holo-card" style="width:min(300px,80vw)">${window.JumpSeals.masterSVG({ nick: p.n, id: res.id, date: p.m })}</div><span class="muted" style="font-size:13px">씰 30장을 모두 모은 사람만 가진 시크릿 카드</span></section>` : ""}
      ${grid}
      <p class="muted" style="margin:0;font-size:13px">사진은 누구나 저장할 수 있지만, 이 화면은 링크를 열어야만 나와. 초록 점과 시계가 움직이면 지금 열어 본 진짜 화면이야.</p>
      <div>${preview ? `<button class="btn ghost" id="backBtn">← 내 도감으로 돌아가기</button>` : `<a class="btn" href="${esc(BASE)}" style="text-decoration:none;display:inline-block">나도 씰 모으기 시작</a>`}</div>
    </div>`;
    clearInterval(clockT);
    const tick = () => { const c = $("#clock"); if (!c) return; const d = new Date(); c.textContent = `지금 확인 중 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
    tick(); clockT = setInterval(tick, 1000);
    const back = $("#backBtn");
    back && (back.onclick = () => { clearInterval(clockT); v.hidden = true; v.innerHTML = ""; $("#tabs").hidden = false; $("#album").hidden = false; renderAll(); scrollTo(0, 0); });
    scrollTo(0, 0);
  }

  // ---------- 관리 ----------
  function renderSettings() {
    if (!state.grade) return;
    $("#setNick").textContent = state.nick;
    const row = $("#setGrade"); row.querySelectorAll("button").forEach((b) => b.remove());
    for (let g = 1; g <= 6; g++) {
      const b = document.createElement("button"); b.className = "chip"; b.textContent = g + "학년";
      b.setAttribute("aria-pressed", state.grade === g);
      b.onclick = () => { state.grade = g; save(); renderAll(); toast(`${g}학년으로 바꿨어`); };
      row.appendChild(b);
    }
  }
  function renderPrefs() {
    const snd = $("#setSound"); const on = state.sound !== false;
    snd.setAttribute("aria-pressed", on); snd.textContent = on ? "켜짐 🔊" : "꺼짐 🔇";
  }
  $("#setSound").onclick = () => { state.sound = state.sound === false; save(); renderPrefs(); };
  $("#setReroll").onclick = () => { state.nick = rollNick(); save(); renderAll(); };
  $("#resetBtn").onclick = () => {
    $("#resetBox").innerHTML = `<span class="confirm">씰 ${Object.keys(state.seals).length}장이 전부 사라져. 정말 지울까? <button class="btn small" id="resetYes">지우기</button><button class="btn small ghost" id="resetNo">그만두기</button></span>`;
    $("#resetYes").onclick = () => { state.seals = {}; state.reps = []; save(); $("#resetBox").innerHTML = ""; renderAll(); toast("기록을 지웠어"); };
    $("#resetNo").onclick = () => ($("#resetBox").innerHTML = "");
  };
  $("#peek").onchange = (e) => { peek = e.target.checked; renderAlbum(); };

  function renderAll() { renderMe(); renderHello(); renderSummary(); renderAlbum(); renderSettings(); renderPrefs(); }

  // ---------- 시작 화면 ----------
  function jingle() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
        const t = ac.currentTime + i * 0.09, o = ac.createOscillator(), g = ac.createGain();
        o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.18);
      });
    } catch (e) {}
  }
  function showTitle() {
    const box = $("#title");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cast = [[SEALS[5], 0.72, 0.1], [SEALS[11], 0.86, 0.45], [window.JumpSeals.COACH, 0.8, 0], [SEALS[22], 0.76, 0.3], [SEALS[29], 0.9, 0.6]];
    $("#tStage").innerHTML = cast.map(([c, dur, delay], i) =>
      `<div class="jm${i === 2 ? " coach" : ""}">${window.JumpSeals.jumperSVG(c, { dur, delay, still })}</div>`).join("");
    const save = $("#tSave");
    if (state.grade) {
      $("#tStart").innerHTML = "이어<br>하기";
      save.hidden = false;
      save.textContent = `${state.nick} · ${state.grade}학년 · 씰 ${Object.keys(state.seals).length}/30장`;
    }
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    const btn = $("#tStart");
    btn.focus();
    btn.onclick = () => {
      if (state.sound !== false) jingle();
      box.classList.add("leave");
      document.documentElement.style.overflow = "";
      setTimeout(() => { box.hidden = true; box.classList.remove("leave"); $("#tStage").innerHTML = ""; }, 460);
      if (!state.grade) setTimeout(() => $("#hello").scrollIntoView({ block: "start" }), 50);
    };
  }

  // ---------- 시작 ----------
  async function boot() {
    const d = new URLSearchParams(location.search).get("d");
    renderAll();
    if (!d) showTitle();
    me = await JumpID.init();
    renderMe();
    if (d) {
      try { showViewer(await JumpID.open(d), false); }
      catch (e) { toast("링크가 깨져서 도감을 못 열었어"); }
    }
  }
  boot();
})();
