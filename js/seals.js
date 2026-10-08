/* 줄넘기 등급 챌린지 — 씰 데이터와 그림
 * 씰 30장 = 학년 코스(1~6) × 단계(1~5). 30장 모두 캐릭터·배경 무늬·테두리 장식 조합이 다르다.
 *  - 배경 금속: 1·2학년 동 / 3·4학년 은 / 5·6학년 금
 *  - 테두리 별: 단계 수만큼 금별 (★1~★5)
 *  - 테두리 장식: 단계가 높을수록 화려해진다 (구슬 → 톱니 → 물결 → 보석 → 햇살·월계수)
 * 그림은 전부 SVG라서 오프라인에서도, 자랑 카드(canvas)에서도 똑같이 나온다.
 */
(function () {
  const STAGES = ["연속", "30초 도전", "박자 맞추기", "1분 도전", "오래 뛰기"];
  // 목표 숫자: 7살·1학년도 처음 몇 단계는 깰 수 있게 낮게 시작해서 학년마다 천천히 올린다. 아직 임시값.
  const STREAK = [3, 5, 10, 20, 30, 40];      // 안 걸리고 연속
  const SPEED30 = [5, 10, 20, 30, 40, 50];    // 30초 안에 (걸려도 이어서 셈)
  const BEAT = [3, 5, 10, 15, 20, 30];        // 박자 소리에 맞춰 연속
  const BEAT_MS = [1100, 1000, 900, 800, 700, 650];
  const SPEED60 = [10, 20, 40, 60, 80, 100];  // 1분 안에
  const ENDURE = [10, 20, 30, 60, 90, 120];   // 안 끊기고 오래 (초)
  const mmss = (s) => (s >= 60 ? `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ""}` : `${s}초`);
  function goalOf(g, s) {
    const i = g - 1;
    switch (s) {
      case 1: return { type: "streak", n: STREAK[i], limit: 120, text: `안 걸리고 연속 ${STREAK[i]}개` };
      case 2: return { type: "speed", sec: 30, n: SPEED30[i], text: `30초 안에 ${SPEED30[i]}개` };
      case 3: return { type: "beat", n: BEAT[i], beat: BEAT_MS[i], limit: 120, text: `"콩" 소리에 맞춰 ${BEAT[i]}개` };
      case 4: return { type: "speed", sec: 60, n: SPEED60[i], text: `1분 안에 ${SPEED60[i]}개` };
      default: return { type: "endure", sec: ENDURE[i], limit: ENDURE[i] + 120, text: `${mmss(ENDURE[i])} 동안 안 끊기고` };
    }
  }

  // kind: 그림 종류 / body·belly: 몸 색 / eyes·mouth: 표정 / acc: 소품 / rope: 줄 색 / bg: 배경 무늬
  const CHARS = [
    // 1학년 · 동
    { name: "콩콩이", animal: "토끼", kind: "rabbit", body: "#fff7f2", eyes: "dot", mouth: "w", rope: "#ff6f61", bg: "hearts" },
    { name: "삐약이", animal: "병아리", kind: "chick", body: "#ffe45c", eyes: "sparkle", mouth: "none", rope: "#4dabf7", bg: "dots" },
    { name: "도토리", animal: "다람쥐", kind: "squirrel", body: "#dd8a4b", belly: "#ffe8cc", eyes: "dot", mouth: "smile", rope: "#51cf66", bg: "leaves" },
    { name: "볼볼이", animal: "햄스터", kind: "hamster", body: "#f7c48d", belly: "#fff4e0", eyes: "sparkle", mouth: "open", rope: "#cc5de8", bg: "stars" },
    { name: "뭉치", animal: "아기곰", kind: "bear", body: "#b07a52", belly: "#f3d6b6", eyes: "dot", mouth: "smile", acc: ["headband"], rope: "#ffd43b", bg: "rays" },
    // 2학년 · 동
    { name: "개굴", animal: "개구리", kind: "frog", body: "#7fd88d", belly: "#dcf7a8", eyes: "dot", mouth: "wide", rope: "#ff922b", bg: "bubbles" },
    { name: "뒤뚱", animal: "펭귄", kind: "penguin", body: "#3a4766", eyes: "sparkle", mouth: "none", acc: ["bow"], rope: "#ff6b9a", bg: "snow" },
    { name: "냥냥", animal: "고양이", kind: "cat", body: "#ffc27d", eyes: "happy", mouth: "w", rope: "#5c7cfa", bg: "paws" },
    { name: "멍멍", animal: "강아지", kind: "dog", body: "#f5dfc3", eyes: "sparkle", mouth: "tongue", rope: "#20c997", bg: "bones" },
    { name: "꽥꽥", animal: "오리", kind: "duck", body: "#ffffff", eyes: "dot", mouth: "none", acc: ["cap"], rope: "#fa5252", bg: "waves" },
    // 3학년 · 은
    { name: "깡총", animal: "캥거루", kind: "kangaroo", body: "#d9a877", belly: "#f7e3c6", eyes: "dot", mouth: "smile", rope: "#339af0", bg: "zigzag" },
    { name: "대롱", animal: "판다", kind: "panda", body: "#ffffff", eyes: "dot", mouth: "w", rope: "#40c057", bg: "bamboo" },
    { name: "꼬리", animal: "여우", kind: "fox", body: "#ff8f45", eyes: "wink", mouth: "smile", rope: "#845ef7", bg: "flowers" },
    { name: "부엉", animal: "부엉이", kind: "owl", body: "#a16f50", belly: "#ecd6b8", eyes: "big", mouth: "none", rope: "#fcc419", bg: "night" },
    { name: "유칼", animal: "코알라", kind: "koala", body: "#aab2bd", belly: "#e8ebf0", eyes: "dot", mouth: "smile", acc: ["headband"], rope: "#ff8787", bg: "leaves" },
    // 4학년 · 은
    { name: "꿀꿀", animal: "돼지", kind: "pig", body: "#ffb8c9", eyes: "happy", mouth: "smile", rope: "#22b8cf", bg: "hearts" },
    { name: "몽실", animal: "양", kind: "sheep", body: "#fff3e0", eyes: "dot", mouth: "w", rope: "#f06595", bg: "clouds" },
    { name: "끽끽", animal: "원숭이", kind: "monkey", body: "#a06e48", belly: "#f4d8b9", eyes: "sparkle", mouth: "open", rope: "#94d82d", bg: "crescents" },
    { name: "가시", animal: "고슴도치", kind: "hedgehog", body: "#f3dcc1", eyes: "dot", mouth: "smile", rope: "#4c6ef5", bg: "dots" },
    { name: "찍찍", animal: "생쥐", kind: "mouse", body: "#c6cbd4", belly: "#eff1f5", eyes: "sparkle", mouth: "w", acc: ["medal"], rope: "#ff922b", bg: "cheese" },
    // 5학년 · 금
    { name: "폴짝", animal: "메뚜기", kind: "grasshopper", body: "#8fe89c", belly: "#d6fadb", eyes: "big", mouth: "smile", rope: "#e64980", bg: "grass" },
    { name: "어흥", animal: "호랑이", kind: "tiger", body: "#ffab52", eyes: "dot", mouth: "w", rope: "#1c7ed6", bg: "stripes" },
    { name: "갈기", animal: "사자", kind: "lion", body: "#ffd36b", eyes: "happy", mouth: "smile", acc: ["medal"], rope: "#d6336c", bg: "rays" },
    { name: "퐁당", animal: "돌고래", kind: "dolphin", body: "#78c2fc", belly: "#e7f5ff", eyes: "sparkle", mouth: "smile", rope: "#fab005", bg: "waves" },
    { name: "티노", animal: "공룡", kind: "dino", body: "#66c8b8", belly: "#d6f5ee", eyes: "dot", mouth: "open", rope: "#ff6b6b", bg: "zigzag" },
    // 6학년 · 금
    { name: "번개", animal: "치타", kind: "cheetah", body: "#ffd94a", eyes: "cool", mouth: "smile", rope: "#7048e8", bg: "bolts" },
    { name: "눈송이", animal: "북극곰", kind: "polarbear", body: "#f4f8ff", belly: "#ffffff", eyes: "sparkle", mouth: "smile", acc: ["scarf"], rope: "#4dabf7", bg: "snow" },
    { name: "하늘", animal: "독수리", kind: "eagle", body: "#8f5d40", eyes: "dot", mouth: "none", rope: "#12b886", bg: "clouds" },
    { name: "반짝", animal: "유니콘", kind: "unicorn", body: "#ffffff", eyes: "sparkle", mouth: "smile", rope: "#f783ac", bg: "rainbow" },
    { name: "용용", animal: "아기용", kind: "dragon", body: "#9a7bff", belly: "#e8dfff", eyes: "sparkle", mouth: "open", acc: ["crown"], rope: "#ff922b", bg: "flames" },
  ];

  const SEALS = CHARS.map((c, i) => {
    const grade = Math.floor(i / 5) + 1, stage = (i % 5) + 1;
    const goal = goalOf(grade, stage);
    return { ...c, no: i + 1, grade, stage, stageName: STAGES[stage - 1], goal, mission: goal.text };
  });

  const METAL = {
    bronze: { a: "#ffd2ad", b: "#c9763f", c: "#8a4a25", ring1: "#e09a64", ring2: "#7a3f1d", label: "동" },
    silver: { a: "#ffffff", b: "#aeb9c4", c: "#5d6874", ring1: "#e6ecf2", ring2: "#5b6672", label: "은" },
    gold: { a: "#fff6c4", b: "#f0b829", c: "#a06d00", ring1: "#ffe27a", ring2: "#9a6400", label: "금" },
    grey: { a: "#eef1f3", b: "#c7cdd2", c: "#9aa3aa", ring1: "#dfe4e8", ring2: "#a3abb2", label: "" },
  };
  const metalOf = (g) => (g <= 2 ? "bronze" : g <= 4 ? "silver" : "gold");

  // ---- 도우미 ----
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f1 = (v) => v.toFixed(1);

  const OL = "#4a2c2a";
  const SW = `stroke="${OL}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const SWt = `stroke="${OL}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
  const PINK = "#ffb3c6";
  const STAR = "M0 -7 L2.06 -2.84 L6.66 -2.16 L3.33 1.08 L4.11 5.66 L0 3.5 L-4.11 5.66 L-3.33 1.08 L-6.66 -2.16 L-2.06 -2.84 Z";

  // ---- 표정 ----
  function eye(x, y, style, side) {
    if (style === "happy" || (style === "wink" && side > 0))
      return `<path d="M${x - 4.4} ${y + 1.4} Q${x} ${y - 4.6} ${x + 4.4} ${y + 1.4}" fill="none" stroke="${OL}" stroke-width="2.8" stroke-linecap="round"/>`;
    if (style === "cool") return "";
    const big = style === "big" ? 1.05 : 1;
    const rx = 4.4 * big, ry = 5.2 * big;
    let s = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2b1b1a"/>` +
      `<ellipse cx="${x}" cy="${y + ry * 0.45}" rx="${rx * 0.72}" ry="${ry * 0.38}" fill="#6b4a8f" opacity=".55"/>` +
      `<circle cx="${x + 1.5}" cy="${y - 2}" r="${1.9 * big}" fill="#fff"/>` +
      `<circle cx="${x - 1.5}" cy="${y + 2.1}" r=".95" fill="#fff"/>`;
    if (style === "sparkle") s += `<path d="M${x + 2.4} ${y + 1.2} l.5 1 1 .5 -1 .5 -.5 1 -.5 -1 -1 -.5 1 -.5z" fill="#fff"/>`;
    return s;
  }
  function mouth(type, y) {
    switch (type) {
      case "w": return `<path d="M-4.6 ${y} Q-2.3 ${y + 3.6} 0 ${y} Q2.3 ${y + 3.6} 4.6 ${y}" fill="none" ${SW}/>`;
      case "smile": return `<path d="M-3.6 ${y} Q0 ${y + 4.4} 3.6 ${y}" fill="none" ${SW}/>`;
      case "open": return `<path d="M-3.4 ${y} Q0 ${y + 8} 3.4 ${y} Z" fill="#9b2c3c" ${SW}/><path d="M-1.8 ${y + 3.3} Q0 ${y + 2} 1.8 ${y + 3.3} Q0 ${y + 5.5} -1.8 ${y + 3.3}Z" fill="#ff8fa3"/>`;
      case "tongue": return `<path d="M-2.6 ${y + 2} Q0 ${y + 8.5} 2.6 ${y + 2} Z" fill="#ff8fa3" ${SWt}/><path d="M-4.6 ${y} Q0 ${y + 4} 4.6 ${y}" fill="none" ${SW}/>`;
      case "wide": return `<path d="M-11 ${y - 1} Q0 ${y + 9} 11 ${y - 1}" fill="none" ${SW}/>`;
      default: return "";
    }
  }

  // ---- 소품 ----
  function accessory(a) {
    switch (a) {
      case "headband": return `<path d="M-29 -10 Q0 -24 29 -10" fill="none" stroke="${OL}" stroke-width="8.5" stroke-linecap="round"/><path d="M-29 -10 Q0 -24 29 -10" fill="none" stroke="#ff4d6d" stroke-width="5.5" stroke-linecap="round"/><path d="M-12 -17.5 Q0 -21 12 -17.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
      case "crown": return `<path d="M-14 -24 L-15 -40 L-6.5 -31 L0 -44 L6.5 -31 L15 -40 L14 -24 Z" fill="#ffd43b" ${SW}/><path d="M-12 -27 L12 -27" stroke="#e8a800" stroke-width="2"/><circle cx="0" cy="-31" r="2.6" fill="#ff6b6b" ${SWt}/><circle cx="-15" cy="-41" r="1.8" fill="#fff"/><circle cx="15" cy="-41" r="1.8" fill="#fff"/>`;
      case "cap": return `<path d="M-23 -12 Q-22 -35 0 -35 Q22 -35 23 -12 Z" fill="#4dabf7" ${SW}/><path d="M-10 -32 Q-8 -20 -10 -13" stroke="#1c7ed6" stroke-width="1.6" fill="none"/><path d="M5 -13 Q24 -17 35 -9 Q22 -6 5 -10 Z" fill="#1c7ed6" ${SW}/><circle cx="0" cy="-35" r="2.6" fill="#fff" ${SWt}/>`;
      case "coachcap": return `<path d="M-23 -12 Q-22 -35 0 -35 Q22 -35 23 -12 Z" fill="#ff6f61" ${SW}/><path d="M-6 -27 L6 -27" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M-5 -13 Q-24 -17 -35 -9 Q-22 -6 -5 -10 Z" fill="#e8484a" ${SW}/>`;
      case "whistle": return `<path d="M-8 14 Q0 22 8 14" fill="none" stroke="#4dabf7" stroke-width="2"/><rect x="2" y="18" width="11" height="6" rx="3" fill="#ced4da" ${SWt}/><circle cx="5" cy="21" r="1.4" fill="${OL}"/>`;
      case "scarf": return `<path d="M-25 17 Q0 28 25 17 L26 24 Q0 35 -26 24 Z" fill="#ff6b6b" ${SW}/><path d="M-18 21 L-16 27 M-8 23 L-7 30 M2 24 L2 31 M12 23 L11 30" stroke="#fff" stroke-width="1.6" opacity=".7"/><path d="M12 25 L17 41 L25 38 L20 23 Z" fill="#ff6b6b" ${SW}/>`;
      case "bow": return `<path d="M14 -24 L3 -31 L3 -17 Z M14 -24 L25 -31 L25 -17 Z" fill="#ff6b9a" ${SW}/><circle cx="14" cy="-24" r="3" fill="#ff8fb3" ${SWt}/>`;
      case "medal": return `<path d="M-5 13 L0 21 L5 13" fill="none" stroke="#4dabf7" stroke-width="3.2"/><circle cx="0" cy="24.5" r="5.6" fill="#ffd43b" ${SWt}/><path d="M0 21.5 l.9 1.9 2 .3 -1.5 1.4 .4 2 -1.8 -1 -1.8 1 .4 -2 -1.5 -1.4 2 -.3z" fill="#fff8d6"/>`;
      default: return "";
    }
  }

  // ---- 캐릭터 한 마리 (중심 0,0 · 몸 반지름 약 30) ----
  function character(c, uid, noRope) {
    const B = c.body, D = shade(B, -0.24), L = c.belly || shade(B, 0.5);
    const behind = [], over = [], face = [], top = [];
    let eyeY = 1, eyeX = 11, mouthY = 9.5, eyeStyle = c.eyes, cheeks = true;
    const orangeFeet = ["penguin", "duck", "chick", "eagle"].includes(c.kind);

    switch (c.kind) {
      case "rabbit":
        behind.push(`<ellipse cx="-11" cy="-36" rx="7.5" ry="18" transform="rotate(-12 -11 -36)" fill="${B}" ${SW}/><ellipse cx="-11" cy="-34" rx="3.6" ry="12" transform="rotate(-12 -11 -34)" fill="${PINK}"/>`,
          `<ellipse cx="12" cy="-35" rx="7.5" ry="18" transform="rotate(16 12 -35)" fill="${B}" ${SW}/><ellipse cx="12" cy="-33" rx="3.6" ry="12" transform="rotate(16 12 -33)" fill="${PINK}"/>`);
        face.push(`<path d="M-1.6 5.6 L1.6 5.6 L0 7.4 Z" fill="#ff7f9f" ${SWt}/>`);
        break;
      case "chick":
        top.push(`<path d="M-2 -25 Q-8 -37 -1 -40 Q-2 -32 1 -26 M2 -25 Q9 -35 5 -39" fill="${B}" ${SW}/>`);
        face.push(`<path d="M-5 5 Q0 3 5 5 L0 11 Z" fill="#ff9f1c" ${SW}/>`);
        behind.push(`<ellipse cx="-30" cy="4" rx="6" ry="9" transform="rotate(30 -30 4)" fill="${D}" ${SW}/><ellipse cx="30" cy="4" rx="6" ry="9" transform="rotate(-30 30 4)" fill="${D}" ${SW}/>`);
        break;
      case "squirrel":
        behind.push(`<path d="M18 26 C54 24 58 -24 36 -38 C20 -47 8 -28 24 -21 C38 -14 32 10 16 14 Z" fill="${shade(B, 0.14)}" ${SW}/><path d="M30 -28 C40 -20 42 0 30 14" fill="none" stroke="${shade(B, 0.4)}" stroke-width="3" stroke-linecap="round"/>`);
        behind.push(earTri(-17, -21, B, PINK, 0.85), earTri(17, -21, B, PINK, 0.85, true));
        face.push(`<ellipse cx="0" cy="6" rx="2.4" ry="1.7" fill="${OL}"/>`);
        break;
      case "hamster":
        behind.push(`<circle cx="-19" cy="-23" r="7" fill="${B}" ${SW}/><circle cx="-19" cy="-23" r="3.4" fill="${PINK}"/><circle cx="19" cy="-23" r="7" fill="${B}" ${SW}/><circle cx="19" cy="-23" r="3.4" fill="${PINK}"/>`);
        over.push(`<ellipse cx="-17" cy="10" rx="10" ry="8" fill="${L}"/><ellipse cx="17" cy="10" rx="10" ry="8" fill="${L}"/><path d="M-7 -14 L-3 -6 M0 -16 L0 -7 M7 -14 L3 -6" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`);
        face.push(`<ellipse cx="0" cy="6" rx="2" ry="1.4" fill="#ff7f9f"/>`);
        break;
      case "bear":
      case "polarbear":
        behind.push(roundEars(21, -22, 9.5, B, c.kind === "polarbear" ? "#dbe7ff" : L));
        face.push(muzzle(L));
        mouthY = 11;
        break;
      case "frog":
        behind.push(`<circle cx="-12.5" cy="-21" r="11" fill="${B}" ${SW}/><circle cx="12.5" cy="-21" r="11" fill="${B}" ${SW}/>`);
        face.push(`<circle cx="-12.5" cy="-21" r="7.4" fill="#fff"/><circle cx="12.5" cy="-21" r="7.4" fill="#fff"/>`);
        eyeY = -21; eyeX = 12.5; mouthY = 6;
        break;
      case "penguin":
        over.push(`<path d="M0 -14 C-9 -27 -27 -14 -23 4 C-21 20 -11 30 0 30 C11 30 21 20 23 4 C27 -14 9 -27 0 -14 Z" fill="#fff"/>`);
        face.push(`<path d="M-4.5 5.5 Q0 4 4.5 5.5 L0 10.5 Z" fill="#ffa94d" ${SW}/>`);
        break;
      case "cat":
        behind.push(earTri(-17, -21, B, PINK), earTri(17, -21, B, PINK, 1, true));
        over.push(`<path d="M-6 -24 L-4 -16 M0 -26 L0 -17 M6 -24 L4 -16" stroke="${D}" stroke-width="2.4" stroke-linecap="round"/>`);
        face.push(whiskers(), `<path d="M-1.8 5.6 L1.8 5.6 L0 7.6 Z" fill="#ff7f9f" ${SWt}/>`);
        break;
      case "dog":
        over.push(`<ellipse cx="-27" cy="-7" rx="8.5" ry="16" transform="rotate(22 -27 -7)" fill="${shade(B, -0.32)}" ${SW}/><ellipse cx="27" cy="-7" rx="8.5" ry="16" transform="rotate(-22 27 -7)" fill="${shade(B, -0.32)}" ${SW}/>`);
        over.push(`<ellipse cx="13" cy="-8" rx="9" ry="7" fill="${shade(B, -0.12)}" opacity=".8"/>`);
        face.push(muzzle("#fffaf3"));
        mouthY = 11;
        break;
      case "duck":
        top.push(`<path d="M0 -25 Q-4 -35 2 -38 Q1 -31 3 -26" fill="${B}" ${SW}/>`);
        face.push(`<path d="M-9 6 Q0 1 9 6 Q9 11 0 11.5 Q-9 11 -9 6 Z" fill="#ffa62b" ${SW}/><path d="M-7 7.5 Q0 9 7 7.5" stroke="${OL}" stroke-width="1.4" fill="none"/>`);
        break;
      case "kangaroo":
        behind.push(earTri(-13, -23, B, PINK, 1.3), earTri(13, -23, B, PINK, 1.3, true));
        over.push(`<path d="M-15 15 Q0 32 15 15 Q0 23 -15 15 Z" fill="${shade(B, -0.1)}" ${SW}/><circle cx="0" cy="14" r="6" fill="${B}" ${SW}/><circle cx="-2" cy="13.5" r="1.1" fill="${OL}"/><circle cx="2" cy="13.5" r="1.1" fill="${OL}"/><path d="M-5 9 L-6 4 L-2 8 M5 9 L6 4 L2 8" fill="${B}" ${SWt}/>`);
        face.push(`<ellipse cx="0" cy="5.6" rx="2.4" ry="1.7" fill="${OL}"/>`);
        mouthY = 8.5;
        break;
      case "panda":
        behind.push(roundEars(21, -22, 9.5, "#2f2b33", "#2f2b33"));
        face.push(`<ellipse cx="-11" cy="2" rx="7" ry="8.4" transform="rotate(28 -11 2)" fill="#2f2b33"/><ellipse cx="11" cy="2" rx="7" ry="8.4" transform="rotate(-28 11 2)" fill="#2f2b33"/>`);
        face.push(`<circle cx="-10.5" cy="1.5" r="3.4" fill="#fff"/><circle cx="10.5" cy="1.5" r="3.4" fill="#fff"/><circle cx="-10" cy="2" r="2" fill="#2b1b1a"/><circle cx="11" cy="2" r="2" fill="#2b1b1a"/><circle cx="-9.4" cy="1.2" r=".8" fill="#fff"/><circle cx="11.6" cy="1.2" r=".8" fill="#fff"/>`);
        face.push(`<ellipse cx="0" cy="6.5" rx="2.8" ry="1.9" fill="#2f2b33"/>`);
        eyeStyle = "none";
        break;
      case "fox":
        behind.push(earTri(-17, -21, B, "#3b2a2a", 1.15), earTri(17, -21, B, "#3b2a2a", 1.15, true));
        over.push(`<path d="M-31 4 Q-16 -3 0 10 Q16 -3 31 4 Q27 27 0 31 Q-27 27 -31 4 Z" fill="#fff"/>`);
        face.push(`<ellipse cx="0" cy="6.2" rx="2.6" ry="1.8" fill="${OL}"/>`);
        mouthY = 9.5;
        break;
      case "owl":
        behind.push(earTri(-18, -21, B, D, 0.75), earTri(18, -21, B, D, 0.75, true));
        over.push(`<path d="M-13 14 q3.3 3.3 6.6 0 q3.3 3.3 6.6 0 q3.3 3.3 6.6 0 M-9.7 20.5 q3.3 3.3 6.6 0 q3.3 3.3 6.6 0" fill="none" stroke="${D}" stroke-width="2"/>`);
        face.push(`<circle cx="-11" cy="1" r="9.5" fill="#fff8ec" ${SW}/><circle cx="11" cy="1" r="9.5" fill="#fff8ec" ${SW}/>`);
        face.push(`<path d="M-3.4 7 L3.4 7 L0 12.5 Z" fill="#ffa94d" ${SW}/>`);
        cheeks = false;
        break;
      case "koala":
        behind.push(`<circle cx="-26" cy="-17" r="13" fill="${B}" ${SW}/><circle cx="-26" cy="-17" r="7.5" fill="${L}"/><circle cx="26" cy="-17" r="13" fill="${B}" ${SW}/><circle cx="26" cy="-17" r="7.5" fill="${L}"/>`);
        face.push(`<ellipse cx="0" cy="6" rx="5.4" ry="7" fill="#4a3b3b"/><ellipse cx="-1.6" cy="3.6" rx="1.4" ry="2" fill="#fff" opacity=".5"/>`);
        mouthY = 14.5;
        break;
      case "pig":
        behind.push(`<path d="M-25 -12 L-23 -31 L-10 -23 Z" fill="${B}" ${SW}/><path d="M25 -12 L23 -31 L10 -23 Z" fill="${B}" ${SW}/>`);
        face.push(`<ellipse cx="0" cy="8" rx="8" ry="6" fill="${shade(B, -0.1)}" ${SW}/><ellipse cx="-2.8" cy="8" rx="1.4" ry="2.2" fill="${OL}"/><ellipse cx="2.8" cy="8" rx="1.4" ry="2.2" fill="${OL}"/>`);
        mouthY = 15.5;
        break;
      case "sheep": {
        let w = "";
        for (let i = 0; i < 8; i++) {
          const a = Math.PI * (1.04 + i * 0.13);
          w += `<circle cx="${f1(Math.cos(a) * 26)}" cy="${f1(Math.sin(a) * 23 - 3)}" r="9.5" fill="#fffdf7" ${SW}/>`;
        }
        behind.push(`<ellipse cx="-32" cy="-3" rx="9.5" ry="4.8" transform="rotate(15 -32 -3)" fill="${shade(B, -0.38)}" ${SW}/><ellipse cx="32" cy="-3" rx="9.5" ry="4.8" transform="rotate(-15 32 -3)" fill="${shade(B, -0.38)}" ${SW}/>`);
        top.push(w);
        break;
      }
      case "monkey":
        behind.push(`<circle cx="-32" cy="-1" r="8.5" fill="${B}" ${SW}/><circle cx="-32" cy="-1" r="4.4" fill="${L}"/><circle cx="32" cy="-1" r="8.5" fill="${B}" ${SW}/><circle cx="32" cy="-1" r="4.4" fill="${L}"/>`);
        over.push(`<path d="M0 -7 C-6 -16 -23 -12 -21 3 C-19 17 -8 21 0 21 C8 21 19 17 21 3 C23 -12 6 -16 0 -7 Z" fill="${L}"/><path d="M-3 -22 Q0 -30 4 -23" fill="none" ${SW}/>`);
        face.push(`<ellipse cx="-1.6" cy="6" rx=".9" ry="1.3" fill="${OL}"/><ellipse cx="1.6" cy="6" rx=".9" ry="1.3" fill="${OL}"/>`);
        mouthY = 10.5;
        break;
      case "hedgehog": {
        let s = "";
        for (let i = 0; i < 11; i++) {
          const a = Math.PI * (0.98 + i * 0.104), a1 = a - 0.11, a2 = a + 0.11;
          s += `<path d="M${f1(Math.cos(a1) * 27)} ${f1(Math.sin(a1) * 25 + 3)} L${f1(Math.cos(a) * 45)} ${f1(Math.sin(a) * 43 + 3)} L${f1(Math.cos(a2) * 27)} ${f1(Math.sin(a2) * 25 + 3)} Z" fill="${i % 2 ? "#7a5134" : "#94653f"}" ${SW}/>`;
        }
        behind.push(s);
        face.push(`<circle cx="0" cy="6" r="2.8" fill="${OL}"/><circle cx="-.8" cy="5.2" r=".8" fill="#fff"/>`);
        mouthY = 11;
        break;
      }
      case "mouse":
        behind.push(`<circle cx="-22" cy="-23" r="12.5" fill="${B}" ${SW}/><circle cx="-22" cy="-23" r="7.5" fill="${PINK}"/><circle cx="22" cy="-23" r="12.5" fill="${B}" ${SW}/><circle cx="22" cy="-23" r="7.5" fill="${PINK}"/>`);
        face.push(whiskers(), `<circle cx="0" cy="6" r="2.5" fill="#ff8fa3" ${SWt}/>`);
        break;
      case "grasshopper":
        behind.push(`<path d="M-6 -25 Q-10 -42 -21 -49" fill="none" ${SW}/><circle cx="-21" cy="-49" r="3.4" fill="#ffd43b" ${SW}/><path d="M6 -25 Q10 -42 21 -49" fill="none" ${SW}/><circle cx="21" cy="-49" r="3.4" fill="#ffd43b" ${SW}/>`);
        over.push(`<path d="M-12 17 L12 17 M-10 22.5 L10 22.5" stroke="${D}" stroke-width="2.2" stroke-linecap="round"/>`);
        face.push(`<circle cx="-11.5" cy="-1" r="9" fill="#fff" ${SW}/><circle cx="11.5" cy="-1" r="9" fill="#fff" ${SW}/>`);
        eyeY = -1; eyeX = 11.5;
        break;
      case "tiger":
        behind.push(roundEars(20, -22, 8.5, B, "#fff"));
        over.push(`<path d="M-5 -26 L-4 -17 M5 -26 L4 -17 M0 -28 L0 -20 M-31 -2 L-22 1 M-31 7 L-23 7 M31 -2 L22 1 M31 7 L23 7" stroke="#3a2420" stroke-width="2.8" stroke-linecap="round"/>`);
        face.push(muzzle("#fff"));
        mouthY = 11;
        break;
      case "lion": {
        let m = "";
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          m += `<circle cx="${f1(Math.cos(a) * 32)}" cy="${f1(Math.sin(a) * 31 + 2)}" r="10" fill="${i % 2 ? "#e8892c" : "#f29b3d"}" ${SW}/>`;
        }
        behind.push(m);
        over.push(roundEars(19, -20, 6.5, B, L));
        face.push(`<ellipse cx="0" cy="6" rx="3.2" ry="2.2" fill="${OL}"/>`);
        mouthY = 10.5;
        break;
      }
      case "dolphin":
        behind.push(`<path d="M-7 -25 Q5 -50 17 -23 Z" fill="${B}" ${SW}/>`);
        face.push(`<ellipse cx="0" cy="8.5" rx="8.5" ry="5.4" fill="${L}" ${SW}/>`);
        over.push(`<path d="M-18 -16 Q0 -24 18 -16" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-linecap="round"/>`);
        mouthY = 10;
        break;
      case "dino": {
        let s = "";
        [-17, -8.5, 0, 8.5, 17].forEach((x, i) => {
          const y = -25 + Math.abs(x) * 0.22;
          s += `<path d="M${x - 5.5} ${y + 3} L${x} ${y - 9 - (i === 2 ? 3 : 0)} L${x + 5.5} ${y + 3} Z" fill="#ffd166" ${SW}/>`;
        });
        behind.push(s, `<path d="M-26 22 Q-48 27 -50 11 Q-41 18 -26 12 Z" fill="${B}" ${SW}/>`);
        over.push(`<circle cx="18" cy="-12" r="2.6" fill="${D}" opacity=".6"/><circle cx="23" cy="-6" r="1.8" fill="${D}" opacity=".6"/><circle cx="-20" cy="-10" r="2.2" fill="${D}" opacity=".6"/>`);
        break;
      }
      case "cheetah":
        behind.push(earTri(-17, -21, B, "#fff", 0.9), earTri(17, -21, B, "#fff", 0.9, true));
        over.push(spots([[-18, -14], [-25, 5], [16, -17], [25, 4], [-6, -21], [8, 23], [-14, 23], [21, 16], [4, -24]]));
        face.push(`<path d="M-17 -4.5 L-7 -4.5 Q-5 -4.5 -5 -2 L-5 1 Q-5 5 -9 5 L-14 5 Q-19 5 -19 0 L-19 -2.5 Q-19 -4.5 -17 -4.5 Z M17 -4.5 L7 -4.5 Q5 -4.5 5 -2 L5 1 Q5 5 9 5 L14 5 Q19 5 19 0 L19 -2.5 Q19 -4.5 17 -4.5 Z M-5 -2 L5 -2" fill="#2b2b3a" ${SW}/><path d="M-16 -2 L-12 -2 M8 -2 L12 -2" stroke="#9ad7ff" stroke-width="1.8" stroke-linecap="round"/>`);
        face.push(`<ellipse cx="0" cy="7" rx="2.6" ry="1.8" fill="${OL}"/>`);
        mouthY = 10;
        break;
      case "eagle":
        over.push(`<path d="M-31 11 C-33 -20 -14 -27 0 -27 C14 -27 33 -20 31 11 C22 6 12 15 0 10 C-12 15 -22 6 -31 11 Z" fill="#fff" ${SW}/>`);
        face.push(`<path d="M-6 5 Q0 2 6 5 Q6.5 11 0 14.5 Q2.5 9 -6 5 Z" fill="#fcc419" ${SW}/>`);
        behind.push(`<path d="M-28 0 Q-50 -6 -46 14 Q-38 8 -28 12 Z M28 0 Q50 -6 46 14 Q38 8 28 12 Z" fill="${D}" ${SW}/>`);
        cheeks = false;
        break;
      case "unicorn": {
        const rb = ["#ff8787", "#ffd43b", "#69db7c", "#74c0fc", "#b197fc"];
        behind.push(rb.map((col, i) => `<circle cx="${-27 + i * 1.5}" cy="${-21 + i * 9}" r="8.5" fill="${col}" ${SW}/>`).join(""));
        behind.push(earTri(-14, -21, B, PINK, 0.8), earTri(17, -21, B, PINK, 0.8, true));
        top.push(`<path d="M-5 -24 L0 -51 L5 -24 Z" fill="#ffe066" ${SW}/><path d="M-3.4 -31 L3.2 -33.5 M-2.2 -38.5 L2 -40.6" stroke="${OL}" stroke-width="1.6"/>`);
        face.push(`<path d="M-1.6 6 L1.6 6 L0 7.8 Z" fill="#ff7f9f" ${SWt}/>`);
        break;
      }
      case "dragon":
        behind.push(`<path d="M-28 -3 L-52 -24 L-47 -7 L-56 4 L-43 6 L-28 13 Z" fill="${shade(B, -0.15)}" ${SW}/><path d="M28 -3 L52 -24 L47 -7 L56 4 L43 6 L28 13 Z" fill="${shade(B, -0.15)}" ${SW}/>`);
        behind.push(`<path d="M-14 -21 Q-21 -34 -13 -39 Q-13 -30 -8 -25 Z" fill="#ffe066" ${SW}/><path d="M14 -21 Q21 -34 13 -39 Q13 -30 8 -25 Z" fill="#ffe066" ${SW}/>`);
        over.push(`<path d="M-10 14 L10 14 M-8 19 L8 19 M-6 24 L6 24" stroke="${shade(B, -0.2)}" stroke-width="2.2" stroke-linecap="round"/>`);
        face.push(`<ellipse cx="-2" cy="6" rx=".9" ry="1.2" fill="${OL}"/><ellipse cx="2" cy="6" rx=".9" ry="1.2" fill="${OL}"/>`);
        mouthY = 10;
        break;
    }

    const s = [];
    const handle = shade(c.rope, -0.3);
    s.push(`<ellipse cx="0" cy="36.5" rx="25" ry="4.2" fill="#000" opacity=".18"/>`);
    // 줄넘기 줄 (발밑으로 지나가는 호, 두 겹 색)
    if (!noRope) s.push(`<path d="M-38 4 Q0 82 38 4" fill="none" stroke="${shade(c.rope, -0.35)}" stroke-width="4.6" stroke-linecap="round"/><path d="M-38 4 Q0 82 38 4" fill="none" stroke="${c.rope}" stroke-width="2.8" stroke-linecap="round"/>`);
    s.push(behind.join(""));
    // 발
    const foot = orangeFeet ? "#ffa94d" : D;
    s.push(`<ellipse cx="-11.5" cy="31" rx="8" ry="5.2" fill="${foot}" ${SW}/><ellipse cx="11.5" cy="31" rx="8" ry="5.2" fill="${foot}" ${SW}/>`);
    // 몸 (입체감: 방사형 그라데이션 + 반짝이는 점)
    s.push(`<ellipse cx="0" cy="3" rx="31.5" ry="29.5" fill="url(#${uid}b)" ${SW}/>`);
    if (c.belly && !["penguin", "monkey", "fox"].includes(c.kind)) s.push(`<ellipse cx="0" cy="17.5" rx="15.5" ry="10" fill="${L}"/>`);
    s.push(over.join(""));
    s.push(`<ellipse cx="-14" cy="-13" rx="7.5" ry="4.2" transform="rotate(-32 -14 -13)" fill="#fff" opacity=".55"/><circle cx="-6" cy="-19" r="1.7" fill="#fff" opacity=".7"/>`);
    // 손잡이와 팔
    s.push(`<rect x="-42.5" y="-5" width="7" height="14" rx="3" fill="${handle}" ${SW}/><rect x="35.5" y="-5" width="7" height="14" rx="3" fill="${handle}" ${SW}/><path d="M-41 -1 L-37 -1 M37 -1 L41 -1" stroke="#fff" stroke-width="1.6" opacity=".6"/>`);
    s.push(`<ellipse cx="-32" cy="6" rx="6" ry="7.6" transform="rotate(25 -32 6)" fill="${B}" ${SW}/><ellipse cx="32" cy="6" rx="6" ry="7.6" transform="rotate(-25 32 6)" fill="${B}" ${SW}/>`);
    // 얼굴
    s.push(face.join(""));
    if (eyeStyle !== "none") s.push(eye(-eyeX, eyeY, eyeStyle, -1) + eye(eyeX, eyeY, eyeStyle, 1));
    if (cheeks) s.push(`<ellipse cx="-20" cy="9.5" rx="5.6" ry="3.3" fill="#ff7f9f" opacity=".55"/><ellipse cx="20" cy="9.5" rx="5.6" ry="3.3" fill="#ff7f9f" opacity=".55"/><path d="M-22 9 l1.5 -1.6 M-19 9.6 l1.5 -1.6 M18.5 9 l1.5 -1.6 M21.5 9.6 l1.5 -1.6" stroke="#fff" stroke-width="1" opacity=".8"/>`);
    s.push(mouth(c.mouth, mouthY));
    s.push(top.join(""));
    (c.acc || []).forEach((a) => s.push(accessory(a)));
    return s.join("");
  }

  function earTri(x, y, fill, inner, k = 1, flip) {
    const d = flip ? -1 : 1;
    const p = (dx, dy) => `${f1(x + dx * d * k)} ${f1(y + dy * k)}`;
    return `<path d="M${p(-9.5, 8)} Q${p(-6, -6)} ${p(-3.5, -16.5)} Q${p(3, -10)} ${p(9.5, -3)} Z" fill="${fill}" ${SW}/><path d="M${p(-5, 4)} L${p(-3, -10)} L${p(4.4, -2)} Z" fill="${inner}"/>`;
  }
  function roundEars(x, y, r, fill, inner) {
    return `<circle cx="${-x}" cy="${y}" r="${r}" fill="${fill}" ${SW}/><circle cx="${-x}" cy="${y + 1}" r="${f1(r * 0.52)}" fill="${inner}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${SW}/><circle cx="${x}" cy="${y + 1}" r="${f1(r * 0.52)}" fill="${inner}"/>`;
  }
  function muzzle(col) {
    return `<ellipse cx="0" cy="8.5" rx="10" ry="7.2" fill="${col}" ${SW}/><ellipse cx="0" cy="5.6" rx="3.4" ry="2.4" fill="${OL}"/><ellipse cx="-1" cy="4.9" rx="1.1" ry=".7" fill="#fff" opacity=".7"/>`;
  }
  function whiskers() {
    return `<path d="M-25 6 L-34 4 M-25 10 L-34 11 M25 6 L34 4 M25 10 L34 11" stroke="${OL}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  function spots(pts) {
    return pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="2.2" fill="#5a3a1a" opacity=".8"/>`).join("");
  }

  // ---- 배경 무늬 (얼굴 원 안, 금속 위에 은은하게) ----
  function motif(type, seed, ink) {
    const r = rng(seed * 97 + 13), out = [];
    const pts = () => {
      const p = []; let guard = 0;
      while (p.length < 13 && guard++ < 400) {
        const a = r() * Math.PI * 2, d = 18 + r() * 50, x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d;
        if (p.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > 330)) p.push([x, y, r() * 360, 0.75 + r() * 0.6]);
      }
      return p;
    };
    const each = (fn) => pts().forEach(([x, y, rot, k]) => out.push(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${k.toFixed(2)})">${fn()}</g>`));
    const fill = `fill="${ink}"`;
    switch (type) {
      case "hearts": each(() => `<path d="M0 4 C-7 -1 -5 -7 0 -3.5 C5 -7 7 -1 0 4Z" ${fill}/>`); break;
      case "dots": each(() => `<circle r="${(2 + r() * 3).toFixed(1)}" ${fill}/>`); break;
      case "leaves": each(() => `<path d="M0 -7 Q6 0 0 7 Q-6 0 0 -7Z" ${fill}/>`); break;
      case "stars": each(() => `<path d="${STAR}" ${fill} transform="scale(.8)"/>`); break;
      case "bubbles": each(() => `<circle r="${(3 + r() * 3).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1.6"/>`); break;
      case "snow": each(() => `<path d="M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`); break;
      case "paws": each(() => `<ellipse cy="2" rx="3.4" ry="2.8" ${fill}/><circle cx="-3.6" cy="-2.6" r="1.4" ${fill}/><circle cx="0" cy="-4" r="1.4" ${fill}/><circle cx="3.6" cy="-2.6" r="1.4" ${fill}/>`); break;
      case "bones": each(() => `<rect x="-5" y="-1.4" width="10" height="2.8" ${fill}/><circle cx="-5" cy="-1.6" r="1.8" ${fill}/><circle cx="-5" cy="1.6" r="1.8" ${fill}/><circle cx="5" cy="-1.6" r="1.8" ${fill}/><circle cx="5" cy="1.6" r="1.8" ${fill}/>`); break;
      case "flowers": each(() => [0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(Math.cos(a * Math.PI / 180) * 3)}" cy="${f1(Math.sin(a * Math.PI / 180) * 3)}" r="2.3" ${fill}/>`).join("") + `<circle r="1.4" fill="#fff" opacity=".6"/>`); break;
      case "clouds": each(() => `<circle cx="-3.5" cy="1" r="3" ${fill}/><circle cx="0" cy="-1" r="3.8" ${fill}/><circle cx="3.8" cy="1" r="2.8" ${fill}/>`); break;
      case "crescents": each(() => `<path d="M-5 -3 Q0 7 6 -2 Q0 3 -5 -3Z" ${fill}/>`); break;
      case "cheese": each(() => `<path d="M-5 3 L5 3 L5 -3 Z" ${fill}/>`); break;
      case "bolts": each(() => `<path d="M1 -7 L-3 1 L0 1 L-1 7 L4 -1 L1 -1 Z" ${fill}/>`); break;
      case "flames": each(() => `<path d="M0 -7 Q5 -1 3 3 Q2 6 0 6 Q-3 6 -3 3 Q-4 -1 0 -7Z" ${fill}/>`); break;
      case "night":
        out.push(`<path d="M128 56 A14 14 0 1 0 140 78 A11 11 0 1 1 128 56Z" ${fill}/>`);
        each(() => `<path d="${STAR}" ${fill} transform="scale(.5)"/>`); break;
      case "rays":
        for (let i = 0; i < 18; i++) {
          const a1 = (i / 18) * Math.PI * 2, a2 = a1 + Math.PI / 18;
          if (i % 2) continue;
          out.push(`<path d="M100 100 L${f1(100 + Math.cos(a1) * 80)} ${f1(100 + Math.sin(a1) * 80)} L${f1(100 + Math.cos(a2) * 80)} ${f1(100 + Math.sin(a2) * 80)} Z" ${fill}/>`);
        }
        break;
      case "waves":
        for (let y = 40; y < 170; y += 16) out.push(`<path d="M20 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`);
        break;
      case "zigzag":
        for (let y = 40; y < 170; y += 18) out.push(`<path d="M20 ${y} l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7 l10 -7 l10 7" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`);
        break;
      case "stripes":
        for (let x = -40; x < 240; x += 22) out.push(`<path d="M${x} 20 L${x + 60} 180" stroke="${ink}" stroke-width="8"/>`);
        break;
      case "bamboo":
        for (let x = 40; x < 170; x += 22) out.push(`<path d="M${x} 20 V180" stroke="${ink}" stroke-width="5"/>` + [50, 85, 120, 155].map((y) => `<path d="M${x - 4} ${y + (x % 3) * 6} H${x + 4}" stroke="${ink}" stroke-width="2.4"/>`).join(""));
        break;
      case "grass":
        for (let x = 30; x < 175; x += 10) out.push(`<path d="M${x} 175 Q${x + 3} ${150 - (x % 4) * 6} ${x + 7} ${138 - (x % 3) * 8}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`);
        each(() => `<circle r="1.6" ${fill}/>`);
        break;
      case "rainbow":
        ["#ff8787", "#ffd43b", "#69db7c", "#74c0fc", "#b197fc"].forEach((c, i) => out.push(`<path d="M${30 + i * 7} 160 A${70 - i * 7} ${70 - i * 7} 0 0 1 ${170 - i * 7} 160" fill="none" stroke="${c}" stroke-width="6" opacity=".45"/>`));
        each(() => `<path d="${STAR}" ${fill} transform="scale(.55)"/>`);
        break;
    }
    return out.join("");
  }

  // ---- 테두리 장식 (단계별로 화려해진다) ----
  function frame(stage, m, uid) {
    const o = [];
    const ring = `url(#${uid}r)`;
    if (stage >= 5) { // 햇살
      for (let i = 0; i < 32; i++) {
        const a1 = (i / 32) * Math.PI * 2, a2 = a1 + Math.PI / 32, am = a1 + Math.PI / 64;
        o.push(`<path d="M${f1(100 + Math.cos(a1) * 86)} ${f1(100 + Math.sin(a1) * 86)} L${f1(100 + Math.cos(am) * 98)} ${f1(100 + Math.sin(am) * 98)} L${f1(100 + Math.cos(a2) * 86)} ${f1(100 + Math.sin(a2) * 86)} Z" fill="${i % 2 ? m.ring1 : m.b}" stroke="${m.ring2}" stroke-width="1"/>`);
      }
    }
    if (stage >= 3) { // 물결 가장자리
      let sc = "";
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; sc += `<circle cx="${f1(100 + Math.cos(a) * 87)}" cy="${f1(100 + Math.sin(a) * 87)}" r="7.5" fill="${ring}" stroke="${m.ring2}" stroke-width="1.6"/>`; }
      o.push(sc);
    }
    o.push(`<circle cx="100" cy="100" r="${stage >= 3 ? 87 : 90}" fill="${ring}" stroke="${m.ring2}" stroke-width="2"/>`);
    o.push(`<circle cx="100" cy="100" r="${stage >= 3 ? 84 : 87}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".5"/>`);
    if (stage === 1) { // 구슬
      for (let i = 0; i < 9; i++) { const a = (35 + i * 13.75) * Math.PI / 180; o.push(`<circle cx="${f1(100 + Math.cos(a) * 81)}" cy="${f1(100 + Math.sin(a) * 81)}" r="2.3" fill="#fff" opacity=".75"/>`); }
    }
    if (stage === 2) { // 톱니 눈금
      for (let i = 0; i < 15; i++) { const a = (32 + i * 8.3) * Math.PI / 180; o.push(`<path d="M${f1(100 + Math.cos(a) * 76)} ${f1(100 + Math.sin(a) * 76)} L${f1(100 + Math.cos(a) * 86)} ${f1(100 + Math.sin(a) * 86)}" stroke="${m.ring2}" stroke-width="2.4" stroke-linecap="round"/>`); }
    }
    if (stage >= 4) { // 보석 (좌·우)
      [[-1, 0], [1, 0]].forEach(([dx]) => {
        const x = 100 + dx * 80, y = 104;
        o.push(`<path d="M${x} ${y - 8} L${x + 6} ${y} L${x} ${y + 8} L${x - 6} ${y} Z" fill="${stage >= 5 ? "#ff5c8a" : "#4dabf7"}" stroke="${OL}" stroke-width="1.6"/><path d="M${x} ${y - 8} L${x + 2} ${y} L${x} ${y + 8}" fill="#fff" opacity=".4"/>`);
      });
    }
    if (stage >= 5) { // 월계수
      [-1, 1].forEach((d) => {
        for (let i = 0; i < 4; i++) {
          const a = (118 + i * 13) * Math.PI / 180, x = 100 + d * Math.cos(a) * -79, y = 100 + Math.sin(a) * 79;
          o.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6" ry="3" transform="rotate(${f1(d * (i * 14 - 40))} ${f1(x)} ${f1(y)})" fill="#51cf66" stroke="${OL}" stroke-width="1.3"/>`);
        }
      });
    }
    return o.join("");
  }

  let uidN = 0;
  /** opts: { empty, holo } */
  function sealSVG(seal, opts = {}) {
    const uid = "s" + ++uidN + "_";
    const empty = !!opts.empty;
    const m = METAL[empty ? "grey" : metalOf(seal.grade)];
    // 별 띠
    const n = seal.stage, step = 21;
    const stars = Array.from({ length: n }, (_, i) => {
      const a = (i - (n - 1) / 2) * step;
      const rad = (a - 90) * Math.PI / 180, x = 100 + Math.cos(rad) * 80, y = 100 + Math.sin(rad) * 80;
      return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a}) scale(1.72)"><path d="${STAR}" fill="${empty ? "#c3c9ce" : "#ffd43b"}" stroke="${empty ? "#8b949b" : "#6b3f00"}" stroke-width="1.1" stroke-linejoin="round"/><path d="M-1.4 -4.2 L0 -6 L.6 -3.4Z" fill="#fff" opacity=".9"/></g>`;
    }).join("");
    const bandA = ((n - 1) / 2) * step + 12;
    const band = `<path d="M${f1(100 + Math.cos((-90 - bandA) * Math.PI / 180) * 80)} ${f1(100 + Math.sin((-90 - bandA) * Math.PI / 180) * 80)} A80 80 0 0 1 ${f1(100 + Math.cos((-90 + bandA) * Math.PI / 180) * 80)} ${f1(100 + Math.sin((-90 + bandA) * Math.PI / 180) * 80)}" fill="none" stroke="#2a1608" stroke-opacity="${empty ? 0.12 : 0.42}" stroke-width="20" stroke-linecap="round"/>`;
    const ink = empty ? "#ffffff" : "#ffffff";
    const ribbonCol = empty ? "#aab2b9" : ["#e8484a", "#ff8a3d", "#2f9e44", "#1c7ed6", "#7048e8"][seal.stage - 1];
    const label = empty ? "???" : seal.name;
    const holo = opts.holo && !empty ? `<radialGradient id="${uid}h" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#ff9ad5" stop-opacity=".55"/><stop offset=".3" stop-color="#ffe17a" stop-opacity=".45"/><stop offset=".55" stop-color="#8affc1" stop-opacity=".45"/><stop offset=".8" stop-color="#7ad7ff" stop-opacity=".5"/><stop offset="1" stop-color="#c39bff" stop-opacity=".55"/></radialGradient>` : "";
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${empty ? `아직 못 모은 씰 No.${seal.no}` : `${seal.grade}학년 코스 ${seal.stage}단계 ${m.label} 씰, ${seal.animal} ${seal.name}${opts.holo ? ", 반짝이" : ""}`}">
<defs>
<radialGradient id="${uid}m" cx="36%" cy="28%" r="85%"><stop offset="0" stop-color="${m.a}"/><stop offset=".65" stop-color="${m.b}"/><stop offset="1" stop-color="${m.c}"/></radialGradient>
<linearGradient id="${uid}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.ring1}"/><stop offset=".5" stop-color="${m.b}"/><stop offset="1" stop-color="${m.ring2}"/></linearGradient>
<radialGradient id="${uid}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(seal.body, 0.45)}"/><stop offset=".55" stop-color="${seal.body}"/><stop offset="1" stop-color="${shade(seal.body, -0.14)}"/></radialGradient>
<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
<filter id="${uid}k"><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .5  0 0 0 0 .55  0 0 0 .55 0"/></filter>
${holo}
<clipPath id="${uid}c"><circle cx="100" cy="100" r="72"/></clipPath>
</defs>
<circle cx="100" cy="100" r="99.5" fill="#fff"/>
${frame(seal.stage, m, uid)}
${band}
<circle cx="100" cy="100" r="72" fill="url(#${uid}m)" stroke="${m.ring2}" stroke-width="2"/>
<g clip-path="url(#${uid}c)">
<g opacity="${empty ? 0.35 : 0.3}">${motif(seal.bg, seal.no, ink)}</g>
${opts.holo && !empty ? `<circle cx="100" cy="100" r="72" fill="url(#${uid}h)"/>` : ""}
<g transform="translate(100 104) scale(1.45)"${empty ? ` filter="url(#${uid}k)"` : ""}>${character(seal, uid)}</g>
${empty ? `<text x="100" y="114" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="900" fill="#fff" stroke="#8b949b" stroke-width="2">?</text>` : `<path d="M44 52 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z M156 62 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#fff"/>`}
<circle cx="100" cy="100" r="72" fill="url(#${uid}g)"/>
</g>
${stars}
<path d="M38 168 L52 163 L52 190 L38 186 L44 177 Z" fill="${shade(ribbonCol, -0.3)}"/><path d="M162 168 L148 163 L148 190 L162 186 L156 177 Z" fill="${shade(ribbonCol, -0.3)}"/>
<path d="M50 162 Q100 172 150 162 L150 186 Q100 196 50 186 Z" fill="${ribbonCol}" stroke="${shade(ribbonCol, -0.45)}" stroke-width="1.6"/>
<path d="M54 166 Q100 175 146 166" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45"/>
<text x="100" y="185" text-anchor="middle" font-family="'Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif" font-size="16" font-weight="700" fill="#fff" stroke="${shade(ribbonCol, -0.5)}" stroke-width="3" paint-order="stroke">${label}</text>
</svg>`;
  }

  /** 안내 캐릭터 (콩콩 코치) */
  const COACH = { name: "콩콩 코치", kind: "rabbit", body: "#fff7f2", eyes: "sparkle", mouth: "open", rope: "#ff6f61", acc: ["coachcap", "whistle"] };
  function coachSVG() {
    const uid = "c" + ++uidN + "_";
    return `<svg viewBox="-55 -62 110 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="${uid}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${COACH.body}"/><stop offset="1" stop-color="${shade(COACH.body, -0.14)}"/></radialGradient></defs>${character(COACH, uid)}</svg>`;
  }

  /** 줄넘기하는 캐릭터 (시작 화면용). SVG 자체 애니메이션이라 사파리에서도 움직인다.
   *  몸이 위로 뜰 때 줄은 발밑, 바닥에 닿을 때 줄은 머리 위로 넘어간다. */
  function jumperSVG(c, { dur = 0.8, delay = 0, still = false } = {}) {
    const uid = "j" + ++uidN + "_";
    const t = `dur="${dur}s" begin="${-delay}s" repeatCount="indefinite"`;
    const rope = `<path d="M-38 0 Q0 94 38 0" fill="none" stroke="${shade(c.rope, -0.4)}" stroke-width="6" stroke-linecap="round"/><path d="M-38 0 Q0 94 38 0" fill="none" stroke="${c.rope}" stroke-width="3.6" stroke-linecap="round"/>`;
    return `<svg viewBox="-64 -86 128 148" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="${uid}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(c.body, 0.45)}"/><stop offset=".55" stop-color="${c.body}"/><stop offset="1" stop-color="${shade(c.body, -0.14)}"/></radialGradient></defs>
<ellipse cx="0" cy="52" rx="24" ry="4.5" fill="#000" opacity=".2">${still ? "" : `<animate attributeName="rx" values="24;14;24" ${t}/>`}</ellipse>
<g>${still ? "" : `<animateTransform attributeName="transform" type="translate" values="0 6;0 -14;0 6" keyTimes="0;.5;1" calcMode="spline" keySplines=".3 0 .5 1;.5 0 .7 1" ${t}/>`}
${character(c, uid, true).replace('<ellipse cx="0" cy="36.5" rx="25" ry="4.2" fill="#000" opacity=".18"/>', "")}
<g transform="translate(0 4)"><g>${still ? "" : `<animateTransform attributeName="transform" type="scale" values="1 -1;1 1;1 -1" ${t}/>`}${rope}</g></g>
</g></svg>`;
  }

  /** 마스터 카드 (30장을 모두 모으면 발급되는 시크릿 카드). 별명·도감 번호·발급일이 카드에 새겨진다.
   *  secret=true 면 아직 잠긴 실루엣 카드. */
  function masterSVG(info = {}, secret = false) {
    const uid = "m" + ++uidN + "_";
    const esc = (t) => String(t || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const cx = 150, cy = 196;
    let rays = "";
    for (let i = 0; i < 24; i += 2) {
      const a1 = (i / 24) * Math.PI * 2, a2 = ((i + 1) / 24) * Math.PI * 2;
      rays += `<path d="M${cx} ${cy} L${f1(cx + Math.cos(a1) * 260)} ${f1(cy + Math.sin(a1) * 260)} L${f1(cx + Math.cos(a2) * 260)} ${f1(cy + Math.sin(a2) * 260)} Z"/>`;
    }
    let ring = "";
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * 104, y = cy + Math.sin(a) * 104;
      ring += `<path d="${STAR}" transform="translate(${f1(x)} ${f1(y)}) scale(.78)" fill="${secret ? "#5b6478" : ["#e09a64", "#e09a64", "#c9d2db", "#c9d2db", "#ffd84a", "#ffd84a"][Math.floor(i / 5)]}" stroke="${secret ? "#3a4256" : "#5a3a00"}" stroke-width=".9"/>`;
    }
    const font = "'Black Han Sans','Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
    const king = { ...SEALS[29], acc: ["crown"], mouth: "open", eyes: "sparkle" };
    return `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${secret ? "아직 잠긴 시크릿 마스터 카드" : `${esc(info.nick)}의 줄넘기 마스터 카드`}">
<defs>
<linearGradient id="${uid}rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${secret ? "#6b7488" : "#ff7ab6"}"/><stop offset=".25" stop-color="${secret ? "#8a93a6" : "#ffd36b"}"/><stop offset=".5" stop-color="${secret ? "#6b7488" : "#7dffb0"}"/><stop offset=".75" stop-color="${secret ? "#8a93a6" : "#6bd6ff"}"/><stop offset="1" stop-color="${secret ? "#6b7488" : "#b58bff"}"/></linearGradient>
<radialGradient id="${uid}bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${secret ? "#3a4256" : "#4b66c0"}"/><stop offset="1" stop-color="${secret ? "#151a26" : "#141d3d"}"/></radialGradient>
<linearGradient id="${uid}au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset=".5" stop-color="#ffd84a"/><stop offset="1" stop-color="#e09400"/></linearGradient>
<radialGradient id="${uid}md" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${secret ? "#8a93a6" : "#fff6c4"}"/><stop offset=".6" stop-color="${secret ? "#5b6478" : "#f0b829"}"/><stop offset="1" stop-color="${secret ? "#3a4256" : "#a06d00"}"/></radialGradient>
<radialGradient id="${uid}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(king.body, 0.45)}"/><stop offset=".55" stop-color="${king.body}"/><stop offset="1" stop-color="${shade(king.body, -0.14)}"/></radialGradient>
<clipPath id="${uid}c"><rect x="12" y="12" width="276" height="396" rx="16"/></clipPath>
<filter id="${uid}k"><feColorMatrix type="matrix" values="0 0 0 0 .05  0 0 0 0 .07  0 0 0 0 .12  0 0 0 .9 0"/></filter>
</defs>
<rect x="0" y="0" width="300" height="420" rx="24" fill="url(#${uid}rb)"/>
<rect x="12" y="12" width="276" height="396" rx="16" fill="url(#${uid}bg)"/>
<g clip-path="url(#${uid}c)"><g fill="${secret ? "#ffffff" : "#ffd84a"}" opacity="${secret ? 0.04 : 0.12}">${rays}</g>
${secret ? "" : `<g fill="#fff">${[[40, 70, 1.2], [262, 92, 1], [52, 300, .9], [250, 286, 1.3], [30, 180, .7], [272, 200, .8]].map(([x, y, k]) => `<path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5Z" transform="translate(${x} ${y}) scale(${k})"/>`).join("")}</g>`}</g>
<text x="150" y="66" text-anchor="middle" font-family="${font}" font-size="44" fill="${secret ? "#8a93a6" : `url(#${uid}au)`}" stroke="${secret ? "#151a26" : "#7a4a00"}" stroke-width="5" paint-order="stroke" letter-spacing="2">${secret ? "SECRET" : "MASTER"}</text>
<text x="150" y="88" text-anchor="middle" font-family="${font}" font-size="15" fill="#fff" opacity=".9">${secret ? "시크릿 카드" : "줄넘기왕 · 씰 30 / 30 완성"}</text>
${ring}
<circle cx="${cx}" cy="${cy}" r="88" fill="url(#${uid}md)" stroke="${secret ? "#151a26" : "#7a4a00"}" stroke-width="3"/>
<circle cx="${cx}" cy="${cy}" r="78" fill="${secret ? "#2a3042" : "#2d3f73"}" stroke="${secret ? "#8a93a6" : "#fff6c4"}" stroke-width="2"/>
<g transform="translate(${cx} ${cy + 8}) scale(1.62)"${secret ? ` filter="url(#${uid}k)"` : ""}>${character(king, uid)}</g>
${secret ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${font}" font-size="64" fill="#8a93a6">?</text>` : ""}
<rect x="34" y="320" width="232" height="70" rx="12" fill="${secret ? "#2a3042" : "#fffdf5"}" stroke="${secret ? "#5b6478" : "url(#" + uid + "au)"}" stroke-width="3"/>
${secret
      ? `<text x="150" y="350" text-anchor="middle" font-family="${font}" font-size="15" fill="#c3c9d6">씰 30장을 모두 모으면</text><text x="150" y="372" text-anchor="middle" font-family="${font}" font-size="15" fill="#c3c9d6">이 카드가 열려요</text>`
      : `<text x="150" y="352" text-anchor="middle" font-family="${font}" font-size="24" fill="#2d3f73">${esc(info.nick)}</text><text x="150" y="376" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#6b7290">#${esc(info.id || "----")}${info.date ? ` · ${esc(info.date)} 발급` : ""}</text>`}
<text x="276" y="404" text-anchor="end" font-family="sans-serif" font-size="8" font-weight="700" fill="#ffffff" opacity=".55">JUMPROPE CHALLENGE · SECRET</text>
</svg>`;
  }

  /** 학년 클리어 카드 (한 학년 코스 씰 5장을 다 모으면 발급되는 시크릿 카드). 학년마다 색과 등장 캐릭터 5마리가 다르다. */
  const CARD_BG = [["#ffd1dc", "#ff8fab"], ["#cfe8ff", "#74b9ff"], ["#d3f9d8", "#69db7c"], ["#ffe8cc", "#ffa94d"], ["#e5dbff", "#9775fa"], ["#fff3bf", "#fcc419"]];
  function courseCardSVG(g, info = {}, secret = false) {
    const uid = "k" + ++uidN + "_";
    const esc = (t) => String(t || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const m = METAL[secret ? "grey" : metalOf(g)];
    const [c1, c2] = secret ? ["#3a4256", "#151a26"] : CARD_BG[g - 1];
    const font = "'Black Han Sans','Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
    const cast = SEALS.slice((g - 1) * 5, g * 5);
    const spots = [[-58, -22, 0.78], [0, -30, 0.82], [58, -22, 0.78], [-32, 30, 0.9], [32, 30, 0.9]];
    let rays = "";
    for (let i = 0; i < 20; i += 2) {
      const a1 = (i / 20) * Math.PI * 2, a2 = ((i + 1) / 20) * Math.PI * 2;
      rays += `<path d="M150 210 L${f1(150 + Math.cos(a1) * 260)} ${f1(210 + Math.sin(a1) * 260)} L${f1(150 + Math.cos(a2) * 260)} ${f1(210 + Math.sin(a2) * 260)} Z"/>`;
    }
    const grads = cast.map((c, i) => `<radialGradient id="${uid}${i}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(c.body, 0.45)}"/><stop offset=".55" stop-color="${c.body}"/><stop offset="1" stop-color="${shade(c.body, -0.14)}"/></radialGradient>`).join("");
    const chars = cast.map((c, i) => { const [x, y, k] = spots[i]; return `<g transform="translate(${150 + x} ${214 + y}) scale(${k})">${character(c, uid + i)}</g>`; }).join("");
    return `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${secret ? `${g}학년 시크릿 카드, 아직 잠김` : `${esc(info.nick)}의 ${g}학년 클리어 카드`}">
<defs>
<linearGradient id="${uid}fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.ring1}"/><stop offset=".5" stop-color="${m.b}"/><stop offset="1" stop-color="${m.ring2}"/></linearGradient>
<radialGradient id="${uid}bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${secret ? c1 : "#ffffff"}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
${grads}
<clipPath id="${uid}c"><rect x="12" y="12" width="276" height="396" rx="16"/></clipPath>
<filter id="${uid}k"><feColorMatrix type="matrix" values="0 0 0 0 .05  0 0 0 0 .07  0 0 0 0 .12  0 0 0 .9 0"/></filter>
</defs>
<rect width="300" height="420" rx="24" fill="url(#${uid}fr)"/>
<rect x="12" y="12" width="276" height="396" rx="16" fill="url(#${uid}bg)"/>
<g clip-path="url(#${uid}c)"><g fill="#fff" opacity="${secret ? 0.04 : 0.3}">${rays}</g></g>
<circle cx="44" cy="46" r="22" fill="${secret ? "#2a3042" : "#2d3f73"}" stroke="${m.ring1}" stroke-width="3"/>
<text x="44" y="56" text-anchor="middle" font-family="${font}" font-size="28" fill="${secret ? "#8a93a6" : "#ffd84a"}">${g}</text>
<text x="160" y="62" text-anchor="middle" font-family="${font}" font-size="40" fill="${secret ? "#8a93a6" : "#fff"}" stroke="${secret ? "#151a26" : "#2d3f73"}" stroke-width="6" paint-order="stroke" letter-spacing="2">${secret ? "SECRET" : "CLEAR!"}</text>
<text x="160" y="86" text-anchor="middle" font-family="${font}" font-size="15" fill="${secret ? "#c3c9d6" : "#2d3f73"}">${g}학년 코스 ${secret ? "시크릿 카드" : "완주 · 씰 5 / 5"}</text>
<g${secret ? ` filter="url(#${uid}k)"` : ""}>${chars}</g>
${secret ? `<text x="150" y="232" text-anchor="middle" font-family="${font}" font-size="70" fill="#8a93a6" stroke="#151a26" stroke-width="4" paint-order="stroke">?</text>` : ""}
<g>${[0, 1, 2, 3, 4].map((i) => `<path d="${STAR}" transform="translate(${102 + i * 24} 300) scale(1.25)" fill="${secret ? "#5b6478" : "#ffd43b"}" stroke="${secret ? "#3a4256" : "#6b3f00"}" stroke-width="1"/>`).join("")}</g>
<rect x="34" y="320" width="232" height="70" rx="12" fill="${secret ? "#2a3042" : "#fffdf5"}" stroke="${secret ? "#5b6478" : m.ring2}" stroke-width="3"/>
${secret
      ? `<text x="150" y="350" text-anchor="middle" font-family="${font}" font-size="15" fill="#c3c9d6">${g}학년 코스 씰 5장을 모으면</text><text x="150" y="372" text-anchor="middle" font-family="${font}" font-size="15" fill="#c3c9d6">이 카드가 열려요</text>`
      : `<text x="150" y="352" text-anchor="middle" font-family="${font}" font-size="24" fill="#2d3f73">${esc(info.nick)}</text><text x="150" y="376" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#6b7290">#${esc(info.id || "----")}${info.date ? ` · ${esc(info.date)} 발급` : ""}</text>`}
<text x="276" y="404" text-anchor="end" font-family="sans-serif" font-size="8" font-weight="700" fill="${secret ? "#fff" : "#2d3f73"}" opacity=".55">JUMPROPE CHALLENGE · ${g} / 6</text>
</svg>`;
  }

  window.JumpSeals = { SEALS, STAGES, METAL, metalOf, sealSVG, coachSVG, jumperSVG, COACH, masterSVG, courseCardSVG };
})();
