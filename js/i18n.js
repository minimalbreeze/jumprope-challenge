/* 줄넘기 등급 챌린지 — 언어 (한국어 / 영어)
 * 폰 기본 언어가 한국어면 한국어, 아니면 영어. 설정에서 바꾸면 localStorage "jumprope:lang" 에 저장하고 다시 연다.
 *
 * 방식: 화면 코드는 한국어 그대로 두고, 글자가 화면에 들어가는 순간(innerHTML·textContent·setAttribute·캔버스)
 * 아래 RULES 로 영어 문장으로 바꾼다. 씰 이름·단계·목표처럼 데이터에 가까운 말은 js/seals.js 가 직접 영어로 고른다.
 *   {#} 숫자  ·  {*} 아무 글자(태그 제외)  ·  {d} 날짜(2026-10-20)  ·  "=" 로 시작하면 덩어리 전체가 그 말일 때만
 * 규칙은 한국어 글자가 많은 것부터 적용한다(긴 문장 먼저, 짧은 낱말은 나중).
 * 이 파일은 다른 js 보다 먼저 불러야 한다.
 */
(function () {
  const KEY = "jumprope:lang";
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const sys = ((navigator.languages && navigator.languages[0]) || navigator.language || "ko").toLowerCase();
  const lang = saved === "ko" || saved === "en" ? saved : sys.startsWith("ko") ? "ko" : "en";
  document.documentElement.lang = lang;

  const RULES = [
    // ---------- 시작 화면 · 등록 ----------
    ["=시작 화면", "Title screen"],
    ["초등학생 줄넘기 모험", "Jump Rope Adventure for Kids"],
    ["줄넘기<br><em>등급 챌린지</em>", "Jump Rope<br><em>Grade Challenge</em>"],
    ["줄넘기 <em>등급 챌린지</em>", "Jump Rope <em>Grade Challenge</em>"],
    ["퀘스트를 깨고 씰 30장을 모아 줄넘기왕이 되자!", "Beat quests, collect 30 seals and become the Jump Rope King!"],
    ["게임<br>시작", "PLAY"],
    ["🔊 소리가 나요", "🔊 Sound on"],
    ["새 모험가 등록", "New Player"],
    ["반가워! 씰 도감을 만들자", "Hi! Let's make your seal album"],
    ["새 친구를 등록하자!", "Let's add a new player!"],
    ["1. 몇 학년이야?", "1. What grade are you in?"],
    ["2. 내 별명을 만들자", "2. Make your nickname"],
    ["3. 내 캐릭터를 골라!", "3. Pick your character!"],
    ["모험 시작!", "Start adventure!"],
    ["아래에서 골라 봐!", "Pick below!"],
    ["① 앞 말", "① First word"],
    ["② 뒤 말", "② Second word"],
    ["또는 직접 쓰기", "Or type your own"],
    ["=예: 콩콩왕", "e.g. JumpKing"],
    ["진짜 이름은 친구에게 자랑할 때 보일 수 있어. 별명을 추천해!", "Your real name may show when you share. A nickname is better!"],
    ["학년을 골라 줘", "Pick your grade"],
    ["별명을 만들어 줘", "Make a nickname"],
    ["\"{*}\"(으)로 시작할까?", "Start as \"$1\"?"],
    ["1학년 코스 1단계부터 시작! 하나씩 깨면 다음 단계가 열려", "Start from Grade 1, stage 1! Clear each one to unlock the next"],
    ["{*}, 다른 아이로 바꾸기", "$1, switch player"],
    ["{#}학년 · 씰 {#}/30", "Grade $1 · $2/30 seals"],
    ["아이 추가", "Add player"],
    ["형제·친구", "Sibling · friend"],
    ["누가 할래?", "Who's playing?"],
    ["{*}의 도감이야!", "It's $1's album!"],
    ["아이는 {#}명까지 등록할 수 있어", "You can add up to $1 players"],

    // ---------- 홈 ----------
    ["오늘의 도전", "Today's Quest"],
    ["퀘스트 도전! ⚔️", "Start quest! ⚔️"],
    ["씰 30장 완성!", "All 30 seals!"],
    ["모든 퀘스트를 깼어. 진짜 줄넘기왕이야!", "You beat every quest. You're the Jump Rope King!"],
    ["카드 보러 가기", "See cards"],
    ["🆓 자유 연습", "🆓 Free Practice"],
    ["씰·탈락 없이 마음껏 뛰기! 시간별 내 최고 기록에 도전해.", "No seals, no fails — just jump! Beat your best for each time."],
    ["내 최고 {#}개", "Best: $1"],
    ["기록 없음", "No record"],
    ["내 씰 도감", "My Seal Album"],
    ["=/ 30장", "/ 30"],
    ["반짝이 {#}장", "$1 shiny"],
    ["🔒 시크릿 카드 {#} / 6", "🔒 Secret cards $1 / 6"],
    ["시크릿 카드 {#} / 6", "Secret cards $1 / 6"],
    ["=👑 마스터", "👑 Master"],
    ["대표 씰 (자랑 카드 맨 앞에 나와)", "Featured seals (shown first on your brag card)"],
    ["대표 씰 {#}: ", "Featured seal $1: "],
    ["=비어 있어", "Empty"],
    ["도감에서 씰을 누르고 '대표 씰로 걸기'를 눌러", "Tap a seal in the album, then 'Feature this seal'"],
    ["자랑하기 📣", "Show off 📣"],
    ["📝 지난번 코치 노트", "📝 Last Coach Note"],
    ["· 성공 ({#}개)", "· Win ($1)"],
    ["· 도전 중 ({#}개)", "· Trying ($1)"],
    ["오늘의 연습:", "Today's drill:"],
    ["고칠 점이 없었어! 다음 단계에 도전해 봐.", "Nothing to fix! Try the next stage."],
    ["영상과 노트 보기", "View video & notes"],

    // ---------- 도감 ----------
    ["📖 씰 도감", "📖 Seal Album"],
    ["=씰 도감", "Seal album"],
    ["=도감 보기", "Album filter"],
    ["=전체", "All"],
    ["=모은 씰", "Collected"],
    ["=남은 씰", "Missing"],
    ["완주! 코스 씰 5장 다 모음", "Done! All 5 seals"],
    ["🔒 {#}학년 코스를 다 깨면 열려", "🔒 Unlocks after Grade $1"],
    ["아직 못 모은 씰", "Not collected yet"],
    ["아직 모은 씰이 없어. 1단계부터 도전해 봐!", "No seals yet. Start with stage 1!"],
    ["30장 다 모았어! 도감 완성 🎉", "All 30 collected! Album complete 🎉"],
    ["대표 씰에서 내리기", "Remove from featured"],
    ["대표 씰로 걸기", "Feature this seal"],
    ["대표 씰에서 내렸어", "Removed from featured"],
    ["대표 씰로 걸었어", "Featured!"],
    ["=✨ 반짝이", "✨ Shiny"],
    ["받은 날", "Got on"],
    ["먼저 위에서 학년을 고르고 도감을 시작해 줘.", "First pick your grade above and start your album."],
    ["퀘스트를 깨면 이 씰을 받아. 어른이나 친구가 폰으로 찍으면서 심판을 봐 줘야 해.", "Beat the quest to get this seal. A grown-up or friend should film and be the referee."],
    ["=시험용 성공", "Test win"],
    ["🔒 {#}학년 코스 씰 5장을 다 모으면 열려.", "🔒 Unlocks after all 5 Grade $1 seals."],
    [" 내 학년보다 높은 코스라 반짝이 씰로 나와!", " It's above your grade, so you'll get a shiny seal!"],
    ["앞 단계 씰({#}단계)을 먼저 모아야 도전할 수 있어.", "Get the stage $1 seal first."],

    // ---------- 새 씰 · 카드 ----------
    ["{#}학년 코스 완주! 🎉", "Grade $1 course complete! 🎉"],
    ["{#}학년 코스가 열렸어!", "Grade $1 course unlocked!"],
    [" 여기서 따는 씰은 전부 반짝이야 ✨", " Every seal here is shiny ✨"],
    ["어? 씰 봉투 뒤에 뭔가 숨어 있어… 👀", "Huh? Something's hiding behind the seal pack… 👀"],
    ["=새 씰", "New seal"],
    ["새 씰이 왔어!", "New seal!"],
    ["씰 봉투 뜯기", "Open seal pack"],
    ["톡! 뜯기", "Rip!"],
    ["눌러서 뜯어봐", "Tap to open"],
    ["✨ 반짝이 ", "✨ Shiny "],
    ["도감에 붙이기", "Add to album"],
    ["시크릿 카드 발견!", "Secret card found!"],
    ["시크릿 카드 열기", "Open secret card"],
    ["눌러서 열어 봐!", "Tap to open!"],
    ["🎉 {#}학년 클리어 카드!", "🎉 Grade $1 Clear Card!"],
    ["{#}학년 코스를 다 깼어! 시크릿 카드 {#} / 6장. 이제 {#}학년 코스로 가자!", "You cleared Grade $1! Secret cards $2 / 6. On to Grade $3!"],
    ["6학년 코스까지 다 깼어! 시크릿 카드 6장을 모두 모았어.", "You cleared all the way to Grade 6! All 6 secret cards collected."],
    ["카드 보관하기", "Keep card"],
    ["👑 마스터 카드 발급!", "👑 Master Card unlocked!"],
    ["{*}, 넌 이제 진짜 줄넘기왕이야! 씰 30장과 시크릿 카드 6장을 다 모은 사람만 받는 카드야.", "$1, you're the real Jump Rope King! Only players with all 30 seals and 6 secret cards get this card."],
    ["도감에 보관하기", "Keep in album"],
    ["{#}학년 클리어 카드 보기", "View Grade $1 clear card"],
    ["{#}학년 시크릿 카드: 아직 잠김", "Grade $1 secret card: locked"],
    ["{#}학년 클리어 카드", "Grade $1 Clear Card"],
    ["{#}학년 시크릿 카드", "Grade $1 Secret Card"],
    ["{#}학년 클리어", "Grade $1 clear"],
    ["{#}학년 코스 씰 5장을 모두 모아서 받은 카드야. 별명과 도감 번호가 새겨져 있어.", "Earned by collecting all 5 Grade $1 seals. Your nickname and album number are on it."],
    ["{#}학년 코스 씰 5장을 모두 모으면 열려. 어떤 카드인지는 비밀!", "Collect all 5 Grade $1 seals to unlock. It's a secret!"],
    ["🃏 시크릿 카드", "🃏 Secret Cards"],
    ["=시크릿 카드", "Secret Card"],
    ["학년 코스 씰 5장을 다 모으면 그 학년의 시크릿 카드가 열려.", "Collect all 5 seals in a grade to unlock its secret card."],
    ["마스터 카드 보기", "View master card"],
    ["마스터 카드: 아직 잠김", "Master card: locked"],
    ["👑 마스터 카드", "👑 Master Card"],
    ["=마스터 카드", "Master Card"],
    ["마지막 카드: 30장을 모두 모으면 열려", "Final card: unlocks with all 30 seals"],
    ["씰 30장(시크릿 카드 6장)을 모두 모으면 열리는 마지막 카드야. 무슨 카드인지는 비밀! (지금 씰 {#} / 30장)", "The final card, unlocked with all 30 seals (6 secret cards). It's a secret! (Now $1 / 30 seals)"],
    ["👑 줄넘기왕", "👑 Jump Rope King"],
    ["발급일 ", "Issued "],
    ["자랑 카드와 공유 링크에도 마스터 표시가 붙어. 링크를 연 친구도 이 카드를 볼 수 있어.", "Your brag card and share link show the master badge. Friends who open the link can see it too."],

    // ---------- 자랑 카드 · 공유 ----------
    ["줄넘기 등급 챌린지 · 씰 도감", "Jump Rope Grade Challenge · Seal Album"],
    ["{#}학년 · 도감 번호 #", "Grade $1 · Album #"],
    ["{#} / 30장  ·  반짝이 {#}장  ·  완주 {#}코스", "$1 / 30 seals  ·  $2 shiny  ·  $3 courses done"],
    ["QR을 못 만들었어", "Couldn't make QR"],
    ["QR을 찍으면", "Scan the QR"],
    ["진짜 주인이 나와요", "to see the real owner"],
    ["{d} 발급", "Issued $1"],
    ["링크를 열었을 때 '✔ 진짜 도감'이 떠야 진짜야", "It's real only if the link shows '✔ Verified album'"],
    ["씰을 한 장이라도 모으면 자랑할 수 있어!", "Collect at least one seal to show off!"],
    ["자랑 카드 만드는 중…", "Making your brag card…"],
    ["=잠깐만!", "Just a sec!"],
    ["자랑 카드 완성!", "Brag card ready!"],
    ["{*}의 씰 도감 카드", "$1's seal album card"],
    ["이미지 저장·보내기", "Save / send image"],
    ["=링크 복사", "Copy link"],
    ["=링크 보내기", "Send link"],
    ["🔐 남이 내 도감을 자기 거라고 못 하게", "🔐 So no one can claim your album"],
    ["· 카드 전체에 <b style=\"font-size:inherit\">{*}</b> 무늬가 새겨져 있어. 잘라 써도 따라가.", "· \"<b style=\"font-size:inherit\">$1</b>\" is printed all over the card, even if it's cropped."],
    ["· QR이나 링크를 열면 이 폰에서 만든 도감인지 확인해서 \"✔ 진짜 도감\"을 띄워 줘.", "· Opening the QR or link checks it was made on this phone and shows \"✔ Verified album\"."],
    ["· 링크 내용을 고치면 바로 \"⚠ 확인 안 된 도감\"으로 바뀌어.", "· If anyone edits the link, it turns into \"⚠ Unverified album\"."],
    ["· 친구가 \"진짜 네 거야?\" 하면 네 폰으로 링크를 열어 봐. 👑 내 도감 표시는 네 폰에서만 떠.", "· If a friend asks \"Is it really yours?\", open the link on your phone. The 👑 My album badge only shows on your phone."],
    ["=공유 링크", "Share link"],
    ["받는 친구 화면 미리보기", "Preview friend's view"],
    ["저장이 안 되면 카드 그림을 길게 눌러서 저장해", "If saving fails, long-press the card image to save it"],
    ["링크를 복사했어", "Link copied"],
    ["링크를 선택해 뒀어. 복사해서 보내 줘", "Link selected. Copy and send it"],
    ["{*}의 줄넘기 씰 도감", "$1's Jump Rope Seal Album"],
    ["나 줄넘기 씰 {#}장 모았다! 진짜인지 확인해 봐 👀", "I collected $1 jump rope seals! Check it's real 👀"],
    ["=줄넘기 씰 도감", "Jump Rope Seal Album"],
    ["줄넘기도감_", "JumpRopeAlbum_"],
    ["=✔ 진짜 도감", "✔ Verified album"],
    ["<b>✔ 진짜 도감</b>", "<b>✔ Verified album</b>"],
    ["<b>⚠ 확인 안 된 도감</b>", "<b>⚠ Unverified album</b>"],
    ["<b>? 주인 확인 불가</b>", "<b>? Owner unknown</b>"],
    ["도감 번호 #{*} · 이 별명의 주인 폰에서 만든 링크야", "Album #$1 · made on this nickname owner's phone"],
    ["=⚠ 확인 안 된 도감", "⚠ Unverified album"],
    ["누가 내용을 고친 링크야. 믿으면 안 돼!", "Someone changed this link. Don't trust it!"],
    ["=? 주인 확인 불가", "? Owner unknown"],
    ["서명이 없는 링크라 누구 건지 확인할 수 없어.", "This link has no signature, so we can't tell whose it is."],
    ["👑 이 폰에서 만든 내 도감이야", "👑 My album, made on this phone"],
    ["=내 줄넘기 씰 도감", "My jump rope seal album"],
    ["=친구의 줄넘기 씰 도감", "A friend's jump rope seal album"],
    ["=이름 없음", "No name"],
    ["{#}학년 · 씰 {#} / 30장 · 반짝이 {#}장 · 완주 {#}코스 · {*} 발급", "Grade $1 · $2 / 30 seals · $3 shiny · $4 courses done · issued $5"],
    ["씰 30장을 모두 모은 사람만 가진 시크릿 카드", "The secret card only for players with all 30 seals"],
    ["사진은 누구나 저장할 수 있지만, 이 화면은 링크를 열어야만 나와. 초록 점과 시계가 움직이면 지금 열어 본 진짜 화면이야.", "Anyone can save a picture, but this screen only appears when the link is opened. If the green dot and clock are moving, it's live and real."],
    ["← 내 도감으로 돌아가기", "← Back to my album"],
    ["나도 씰 모으기 시작", "Start collecting seals too"],
    ["지금 확인 중 {#}:{#}:{#}", "Checking now $1:$2:$3"],
    ["링크가 깨져서 도감을 못 열었어", "The link is broken, so the album couldn't open"],

    // ---------- 영상 ----------
    ["📼 내 영상 · 코치 노트", "📼 My Videos · Coach Notes"],
    ["📼 내 영상", "📼 My Videos"],
    ["도전할 때 찍은 영상과 AI 코치 분석이 이 폰에만 저장돼. 최근 30개까지 보관해.", "Quest videos and AI coach notes are saved only on this phone. The latest 30 are kept."],
    ["아직 영상이 없어. 퀘스트에 도전하면 여기에 영상과 코치 노트가 쌓여!", "No videos yet. Take a quest and your videos and coach notes will show up here!"],
    ["연습: ", "Drill: "],
    ["이 기록에는 영상이 없어.", "No video for this record."],
    ["이 영상 지우기", "Delete this video"],
    ["정말 지울까? ", "Really delete? "],
    ["영상을 지웠어", "Video deleted"],

    // ---------- 설정 ----------
    ["⚙️ 설정", "⚙️ Settings"],
    ["=도감 관리", "Album settings"],
    ["=별명", "Nickname"],
    ["별명·캐릭터 바꾸기", "Change nickname & character"],
    ["=학년", "Grade"],
    ["=언어", "Language"],
    ["같은 학년이어도 실력이 다르니까, 퀘스트 목표 개수를 하(쉽게)·중(보통)·상(어렵게)으로 맞춰. 이미 받은 씰은 그대로야.", "Kids in the same grade have different skills. Set quest goals to Easy, Normal or Hard. Seals you already have stay."],
    ["=소리", "Sound"],
    ["=켜짐", "On"],
    ["켜짐 🔊", "On 🔊"],
    ["꺼짐 🔇", "Off 🔇"],
    ["안전 수칙 다시 보기", "Show safety rules again"],
    ["다음 도전할 때 안전 수칙을 다시 보여 줄게", "I'll show the safety rules again next time"],
    ["기록 모두 지우기", "Erase all records"],
    ["이 아이 지우기", "Delete this player"],
    ["개발용: 못 모은 씰 그림 보기 + 시험용 성공 버튼", "Dev: show locked seals + test success button"],
    ["{#}학년으로 바꿨어", "Changed to Grade $1"],
    ["난이도를 {*}으로 바꿨어", "Level set to $1"],
    ["난이도를 {*}로 바꿨어", "Level set to $1"],
    ["=저장", "Save"],
    ["=바꿨어!", "Changed!"],
    ["{*}의 씰·카드·영상이 모두 사라져. 정말 지울까? ", "All of $1's seals, cards and videos will be gone. Really delete? "],
    ["{*}을(를) 지웠어", "Deleted $1"],
    ["씰 {#}장이 전부 사라져. 정말 지울까? ", "All $1 seals will be gone. Really delete? "],
    ["기록을 지웠어", "Records erased"],
    ["=메뉴", "Menu"],
    ["=홈", "Home"],
    ["=도감", "Album"],
    ["=카드", "Cards"],
    ["=영상", "Videos"],
    ["=설정", "Settings"],

    // ---------- 퀘스트 창 ----------
    ["=콩콩 코치", "Coach Boing"],
    ["줄에 안 걸리고 <b>연속 {#}개</b>를 뛰면 성공! 줄에 걸리거나 멈추면 <b>탈락</b>이야.", "Jump <b>$1 in a row</b> without tripping to win! Trip or stop and you're <b>out</b>."],
    ["<b>{#}초 동안 {#}개 이상</b> 뛰면 성공! 걸려도 다시 뛰면 이어서 세. 줄을 넘은 것만 세.", "Do <b>$2 or more in $1 sec</b> to win! If you trip, keep going and the count continues. Only real rope jumps count."],
    ["<b>연속 {#}개</b>를 <b>두 번</b> 하면 성공! 한 세트 끝나면 쉬었다 해도 돼. 걸리면 그 세트만 다시 세.", "Do <b>$1 in a row</b>, <b>twice</b>! You can rest between sets. If you trip, only that set restarts."],
    ["<b>{*} 동안</b> 안 걸리고 계속 뛰면 성공! 줄에 걸리거나 멈추면 <b>탈락</b>.", "Keep jumping <b>for $1</b> without tripping to win! Trip or stop and you're <b>out</b>."],
    ["{*}, 새 퀘스트야! 이번엔 <b>{*}</b>이야.", "$1, new quest! This time it's <b>$2</b>."],
    ["=목표", "Goal"],
    ["=보상", "Reward"],
    ["✨ 반짝이 씰", "✨ Shiny seal"],
    ["=씰 1장", "1 seal"],
    ["📹 폰을 <b>세워 두고</b> 네모 칸 안에 서면 <b>AI 코치가 자동으로 개수를 세</b>. 성공하면 <b>📺 비디오 판독</b>으로 줄을 넘었는지 같이 확인해!", "📹 <b>Prop up the phone</b> and stand in the box — <b>the AI coach counts your jumps</b>. If it looks like a win, check together with <b>📺 Video Review</b> that the rope went under!"],
    ["=도전할래!", "Let's go!"],
    ["=다음에", "Later"],
    ["자유 연습", "Free Practice"],
    ["=마음껏", "Free"],
    ["=친구", "friend"],

    // ---------- 안전 수칙 ----------
    ["첫 도전 전에 꼭 확인!", "Check before your first try!"],
    ["처음 한 번만 보여 줄게. 다치지 않아야 진짜 챔피언이야. 하나씩 눌러서 체크해 줘!", "I'll show this only once. Real champs stay safe. Tap each one to check!"],
    ["주변이 넓어요", "Plenty of space"],
    ["양팔을 벌리고 한 바퀴 돌아도 사람·가구·벽에 안 닿아요. 줄넘기 길이만큼(2m) 비워 줘.", "Spin with your arms out and touch no people, furniture or walls. Clear about 2 m, the length of the rope."],
    ["운동화를 신었어요", "Wearing sneakers"],
    ["미끄러운 바닥이나 양말만 신고 뛰면 넘어질 수 있어.", "Slippery floors or socks only can make you fall."],
    ["찍는 사람은 멀리 서요", "Filming person stands back"],
    ["찍는 사람은 뛰는 사람에게서 큰 걸음으로 3걸음 이상 떨어져. 줄에 맞으면 아파!", "Whoever films stays at least 3 big steps away. Getting hit by the rope hurts!"],
    ["어른이 함께해요", "A grown-up is here"],
    ["찍는 사람이 어른이거나, 어른이 옆에서 봐 줘야 해.", "A grown-up films, or watches nearby."],
    ["아래층을 생각했어요", "Thinking of neighbors"],
    ["아파트 안에서 뛰면 아래층이 시끄러워. 밖이나 놀이터, 두꺼운 매트 위에서 하자.", "Jumping indoors can be loud for neighbors below. Go outside, to a playground, or onto a thick mat."],
    ["힘들면 바로 멈출게요", "I'll stop if I'm tired"],
    ["숨이 너무 차거나 어지러우면 바로 멈추고 쉬어. 씰은 다음에 또 딸 수 있어.", "If you're out of breath or dizzy, stop and rest. You can get the seal next time."],
    ["보호자님께: 촬영한 영상은 이 폰의 \"내 영상\"에만 저장되고 어디에도 올라가지 않아요. 언제든 지울 수 있어요.", "For parents: videos are saved only in \"My Videos\" on this phone and never uploaded. You can delete them anytime."],
    ["모두 확인했어요 ({#}/{#})", "All checked ($1/$2)"],
    ["모두 확인했어요 ✔", "All checked ✔"],
    ["=그만두기", "Cancel"],

    // ---------- 폰 세우기 안내 ----------
    ["폰은 이렇게 세워 둬!", "Set up the phone like this!"],
    ["폰은 들고 있지 말고 세워 두는 게 제일 정확해요. 개수 세기는 제가, 줄에 걸렸는지는 끝나고 비디오 판독으로 같이 봐요!", "Don't hold the phone — propping it up is most accurate. I'll count the jumps, and you'll check the rope together with Video Review at the end!"],
    ["① 폰은 세워 두기", "① Prop up the phone"],
    ["3~4걸음 떨어진 곳에 폰을 세로로 세워 둬. 벽·의자·물병에 기대도 되고, 거치대면 더 좋아. 손으로 들면 흔들려서 개수가 틀리기 쉬워.", "Stand the phone upright 3–4 steps away. Lean it on a wall, chair or water bottle — a stand is even better. Holding it shakes the picture and miscounts jumps."],
    ["② 네모 칸 안에 서기", "② Stand inside the box"],
    ["화면에 점선 네모가 나와. 머리부터 발끝까지 칸 안에 들어오면 초록색으로 바뀌고 3·2·1 시작!", "A dashed box appears on screen. When you're in it head to toe, it turns green and 3·2·1 starts!"],
    ["③ 바닥에 X 표시 하기", "③ Mark an X on the floor"],
    ["테이프로 X를 붙이고 그 위에서 뛰면 덜 움직여.", "Tape an X and jump on it so you don't drift."],
    ["④ START 누르고 폰에서 물러나기", "④ Tap START and step back"],
    ["START를 누르고 아이가 칸 안에 서면 자동으로 시작해.", "Tap START, and it begins when the child stands in the box."],
    ["⑤ 끝나면 비디오 판독", "⑤ Video Review at the end"],
    ["AI가 성공으로 보면 <b>📺 비디오 판독</b>이 열려. 영상을 보고 \"인정\" 또는 \"노 카운트\"만 눌러 줘. 영상은 \"내 영상\"에 저장돼.", "If the AI sees a win, <b>📺 Video Review</b> opens. Watch the clip and tap \"Good\" or \"No count\". Videos are saved in \"My Videos\"."],
    ["❌ 역광·어두운 곳은 피하기", "❌ Avoid backlight and dark places"],
    ["해를 등지고 서 있거나 너무 어두우면 AI 코치가 몸을 잘 못 봐.", "With the sun behind you or in the dark, the AI coach can't see your body well."],
    ["카메라 켜기 📹", "Camera on 📹"],
    ["폰을 세워 두고 아이가 그 앞에서 줄넘기하는 그림", "A propped-up phone and a child jumping rope in front of it"],
    ["3걸음 떨어져서!", "3 steps away!"],

    // ---------- 카메라 · 측정 ----------
    ["AI 코치 준비 중…", "Getting the AI coach ready…"],
    ["카메라를 써도 되는지 물어보면 <b>허용</b>을 눌러 줘! 처음엔 준비하는 데 조금 걸려.", "If asked to use the camera, tap <b>Allow</b>! It takes a moment the first time."],
    ["앗, 준비가 안 됐어", "Oops, not ready"],
    ["AI 코치를 불러오지 못했어. 인터넷 연결을 확인하고 다시 해 볼래?", "Couldn't load the AI coach. Check your internet and try again?"],
    ["카메라를 못 켰어. 카메라 권한을 <b>허용</b>했는지 확인해 줘. (브라우저 주소창 옆 설정에서 바꿀 수 있어)", "Couldn't turn on the camera. Check that camera access is <b>allowed</b>. (You can change it in the settings next to the address bar.)"],
    ["다시 해 보기", "Try again"],
    ["개발용: 성공 처리", "Dev: mark success"],
    ["발끝까지 보이게 해 줘", "Show me down to your toes"],
    ["사람을 찾는 중…", "Looking for a person…"],
    ["네모 칸 가운데로 와 줘", "Move to the middle of the box"],
    ["조금 더 가까이 와 줘", "Come a little closer"],
    ["몸을 찾는 중…", "Finding your body…"],
    ["■ 그만", "■ Stop"],
    ["폰을 세워 두고, 아이는 네모 칸 안에 서 줘", "Prop up the phone and stand inside the box"],
    ["{#}/{#}세트 · 연속 {#}/{#}", "$1/$2 sets · streak $3/$4"],
    ["{#}/2세트 · {#}/{#}", "$1/2 sets · $2/$3"],
    ["{#}세트 성공! 한 번 더!", "Set $1 done! One more!"],
    ["{#}세트!", "Set $1!"],
    ["피버 타임!", "Fever time!"],
    ["화면 밖으로 나갔어. 머리부터 발끝까지 보이는 자리에서 뛰어 줘!", "You left the screen. Jump where you're visible head to toe!"],
    ["줄에 걸렸거나 멈췄어. 탈락! 다시 도전해 보자", "Tripped or stopped. You're out! Let's try again"],
    ["✔ 칸 안에 딱 맞아요", "✔ Perfect, you're in the box"],
    ["✔ 몸이 다 보여요", "✔ Whole body visible"],
    ["멈췄어! 다시!", "Stopped! Again!"],
    ["화면 밖으로 나갔어!", "Out of the screen!"],
    ["네모 칸 안에 서면 시작해!", "Stand in the box to start!"],
    ["네모 칸 안에 서 주세요", "Please stand in the box"],
    ["연습 끝!", "Practice done!"],
    ["멈췄어. 쉬었다가 다시 하자!", "Stopped. Take a break and try again!"],
    ["=준비…", "Ready…"],
    ["=계속 뛰어!", "Keep going!"],
    ["=1세트 시작!", "Set 1, go!"],
    ["=마음껏 뛰어!", "Jump all you want!"],
    ["=뛰어!", "Jump!"],
    ["=시작!", "Go!"],
    ["{#} / 내 최고 {#}", "$1 / best $2"],
    ["=시간 끝!", "Time's up!"],
    ["=시간이 끝났어!", "Time's up!"],
    ["화면이 꺼지거나 다른 앱으로 가서 멈췄어.", "Stopped because the screen turned off or you switched apps."],
    ["손목이 잘 안 보여서 의견이 없어요.", "Couldn't see the wrists well, so no opinion."],
    ["줄 돌리는 손목 움직임이 보였어요 👍", "I saw wrists turning the rope 👍"],
    ["손목 움직임이 적었어요. 줄을 돌렸는지 잘 봐 주세요 🤔", "Not much wrist movement. Please check the rope was turning 🤔"],

    // ---------- 비디오 판독 ----------
    ["📺 비디오 판독 결과", "📺 Video Review Result"],
    ["📺 비디오 판독!", "📺 Video Review!"],
    ["=비디오 판독!", "Video review!"],
    ["판독 중…", "Reviewing…"],
    ["🤖 AI 코치 의견", "🤖 AI coach says"],
    ["몸 점프 {#}개를 셌어요 · ", "Counted $1 body jumps · "],
    ["AI 코치는 성공으로 봤어요! 마지막으로 <b>비디오 판독</b>! 심판님, 영상을 보고 <b>줄을 돌려서 넘었는지</b> 판정해 주세요!", "The AI coach says it's a win! Last step: <b>Video Review</b>! Referee, watch the video and decide if <b>the rope really went under</b>!"],
    ["✔ 인정! 줄 넘었어요", "✔ Good! Rope cleared"],
    ["✖ 노 카운트", "✖ No count"],
    ["판독 결과, 인정!", "Review result: good!"],
    ["판독 결과, 노 카운트", "Review result: no count"],
    ["=인정!", "GOOD!"],
    ["=노 카운트", "NO COUNT"],
    ["=목표 달성!", "Goal reached!"],
    ["비디오 판독 결과 노 카운트! 줄을 돌려서 넘어야 인정돼.", "Video review: no count! The rope has to go under your feet."],

    // ---------- 결과 · 코치 노트 ----------
    ["줄을 넘지 않았어", "The rope didn't go under"],
    ["줄 없이 뛰었거나 줄에 걸린 채로 뛰었어. 줄을 돌려서 넘어야 인정돼.", "You jumped without the rope or while tangled. The rope has to go under your feet."],
    ["👍 잘한 점", "👍 Nice job"],
    ["🔧 고칠 점과 연습 방법", "🔧 What to fix & how to practice"],
    ["🔧 고칠 점", "🔧 What to fix"],
    ["눈에 띄게 고칠 점이 없어! 다음 단계에 도전해 봐.", "Nothing big to fix! Try the next stage."],
    ["=최고 연속 시간", "Longest streak"],
    ["=최고 연속", "Best streak"],
    ["=멈춘 횟수", "Stops"],
    ["{*} 최고 {#}개", "$1 best: $2"],
    ["최고 연속 기록 {#}개", "Best streak: $1"],
    ["퀘스트 클리어! 신기록!", "Quest clear! New record!"],
    ["=퀘스트 클리어!", "Quest clear!"],
    ["아쉽지만 신기록이야!", "So close, but a new record!"],
    ["아쉬워! 다시 도전하자", "So close! Let's try again"],
    ["=퀘스트 성공!", "Quest clear!"],
    ["=아쉬워!", "So close!"],
    ["대단해! <b>{*}</b> 성공! 아래 코치 노트도 꼭 읽어 봐.", "Awesome! <b>$1</b> done! Check the coach notes below."],
    ["괜찮아, 처음엔 다 그래.", "It's okay, everyone starts like this."],
    [" 코치 노트를 보고 연습하면 금방 할 수 있어!", " Practice with the coach notes and you'll get it soon!"],
    ["📼 영상과 코치 노트는 도감 아래 <b>내 영상</b>에 저장했어요. 이 폰에만 있어요.", "📼 The video and coach notes are saved in <b>My Videos</b>, only on this phone."],
    ["📼 영상과 코치 노트는 <b>내 영상</b>에 저장했어요. 이 폰에만 있어요.", "📼 The video and coach notes are saved in <b>My Videos</b>, only on this phone."],
    ["영상을 저장하지 못했어요. 폰 저장 공간을 확인해 주세요.", "Couldn't save the video. Please check your phone storage."],
    ["영상을 저장하지 못했어요.", "Couldn't save the video."],
    ["씰 받으러 가기 ▶", "Get your seal ▶"],
    ["=다시 도전!", "Try again!"],
    ["신기록! 잘했어!", "New record! Great job!"],
    ["{#}개! 잘했어!", "$1 jumps! Great job!"],
    ["{#}개나 뛰었어! 아래 코치 노트를 보고 다음엔 더 잘해 보자.", "You did $1 jumps! Check the coach notes and do even better next time."],
    ["이번엔 점프가 잘 안 잡혔어. 머리부터 발끝까지 보이게 찍어 줘!", "Couldn't catch the jumps this time. Make sure you're visible head to toe!"],
    ["{*} 끝!", "$1 done!"],
    ["=한 번 더!", "One more!"],

    // 코치 연습법 (js/pose.js DRILLS)
    ["줄 없이 콩콩", "Hop without the rope"],
    ["줄 없이 손목만 빙빙 돌리면서 제자리에서 콩콩 20번. 3번 반복해.", "Circle your wrists with no rope and hop in place 20 times. Repeat 3 times."],
    ["한 번씩 넘기", "One jump at a time"],
    ["줄을 머리 위로 넘기고, 줄이 발 앞 바닥에 닿을 때 '콩!' 하고 한 번만 넘기. 10번 해 봐.", "Swing the rope over your head and when it hits the floor in front of your feet, hop once — 'boing!'. Do it 10 times."],
    ["손뼉 박자", "Clap rhythm"],
    ["어른이 '짝, 짝' 손뼉을 칠 때마다 한 번씩 콩. 줄 없이 20번, 익숙해지면 줄 들고 해 봐.", "Hop once every time a grown-up claps. 20 times without the rope, then try with it."],
    ["낮게 콩콩", "Low hops"],
    ["발뒤꿈치를 살짝 들고 앞꿈치로 낮게, 종이 한 장 높이만 뛰어. 줄 없이 30번.", "Heels up, land on the balls of your feet, and jump just a paper's height. 30 times without the rope."],
    ["같은 높이로", "Same height"],
    ["벽에 손을 대고 같은 높이로만 콩콩 20번. 높이가 같으면 줄에 덜 걸려.", "Hand on a wall, hop 20 times at the same height. Even jumps mean fewer trips."],
    ["X표 지키기", "Stay on the X"],
    ["바닥에 테이프로 X를 붙이고 그 위에서만 뛰기 20번. 앞으로 나가면 줄에 걸려.", "Tape an X on the floor and jump only on it, 20 times. Drifting forward makes you trip."],
    ["팔꿈치 붙이기", "Elbows in"],
    ["팔꿈치를 옆구리에 딱 붙이고 손목으로만 줄 돌리기. 거울 보면서 10번.", "Keep your elbows at your sides and turn the rope with your wrists. 10 times in front of a mirror."],
    ["사뿐 착지", "Soft landing"],
    ["무릎을 살짝 굽혀서 소리 안 나게 착지하기. 줄 없이 20번. 무릎이 다치지 않아.", "Bend your knees a little and land quietly. 20 times without the rope. It protects your knees."],
    ["30초 뛰고 30초 쉬기를 3번. 이틀에 한 번 하면 점점 오래 뛸 수 있어.", "Jump 30 sec, rest 30 sec, 3 times. Every other day and you'll last longer and longer."],
    ["30초 뛰고 30초 쉬기", "30 sec on, 30 sec off"],
    ["첫 점프 성공하기", "Land your first jump"],
    ["줄을 뒤에 두고, 머리 위로 넘겨서 발 앞에 오면 두 발로 콩! 한 개씩 성공하는 연습부터 해.", "Start with the rope behind you, swing it over your head, and hop with both feet when it reaches the front. Practice one at a time."],
    // 코치 분석 (js/pose.js analyze)
    ["아직 점프가 거의 안 잡혔어", "Hardly any jumps were caught yet"],
    ["점프를 {#}개 셌어. 줄을 넘는 타이밍을 먼저 익혀 보자.", "Counted $1 jumps. Let's learn the timing of jumping over the rope first."],
    ["자주 끊겼어", "You stopped often"],
    ["{#}번 멈췄어. 줄을 넘는 타이밍이 아직 흔들려.", "You stopped $1 times. Your timing over the rope is still shaky."],
    ["박자가 들쭉날쭉해", "Your rhythm is uneven"],
    ["빨라졌다 느려졌다 해. 일정한 박자로 뛰면 훨씬 덜 걸려.", "You speed up and slow down. A steady beat means far fewer trips."],
    ["너무 높이 뛰어", "You jump too high"],
    ["높이 뛰면 금방 힘들어져. 줄이 지나갈 만큼만 낮게 뛰자.", "High jumps tire you out fast. Jump just high enough for the rope."],
    ["높이가 매번 달라", "Your height keeps changing"],
    ["어떤 땐 높고 어떤 땐 낮아. 같은 높이로 뛰는 연습을 해 보자.", "Sometimes high, sometimes low. Let's practice jumping at the same height."],
    ["자리에서 자꾸 움직여", "You keep drifting"],
    ["뛰다 보니 옆이나 앞으로 이동했어. 제자리에서 뛰어야 줄에 안 걸려.", "You moved sideways or forward. Jumping in place keeps you from tripping."],
    ["팔을 너무 크게 벌려", "Your arms are too wide"],
    ["팔을 크게 돌리면 줄이 짧아져서 걸리기 쉬워.", "Wide arms make the rope shorter, so you trip more."],
    ["무릎이 뻣뻣해", "Your knees are stiff"],
    ["무릎을 쭉 편 채로 착지했어. 살짝 굽혀야 사뿐하고 안 다쳐.", "You landed with straight knees. Bend them a little for soft, safe landings."],
    ["뒤로 갈수록 느려졌어", "You slowed down toward the end"],
    ["처음보다 끝에 많이 느려졌어. 체력을 조금씩 키워 보자.", "You were much slower at the end. Let's build stamina bit by bit."],
    ["한 번도 안 끊기고 뛰었어!", "You never stopped!"],
    ["박자가 아주 일정해. 메트로놈 같아!", "Super steady rhythm, like a metronome!"],
    ["낮고 가볍게, 같은 높이로 잘 뛰었어.", "Low, light, and even — nice jumping."],
    ["제자리를 잘 지켰어.", "You stayed right in place."],
    ["무릎을 살짝 굽혀서 사뿐하게 착지했어.", "Soft landings with bent knees."],
    ["1분에 {#}개 빠르기로 뛰었어!", "You jumped at $1 per minute!"],
    ["끝까지 도전한 게 제일 멋져!", "Trying all the way to the end is the coolest!"],

    // ---------- 공통 낱말 (위 문장에 안 걸린 나머지) ----------
    ["{#}학년 코스", "Grade $1 course"],
    ["{#}단계", "stage $1"],
    ["{#}학년", "Grade $1"],
    ["{#}분 {#}초", "$1 min $2 sec"],
    ["{#}분", "$1 min"],
    ["{#}초", "$1 sec"],
    ["{#}개", "$1 jumps"],
    ["=도전 중", "Trying"],
    ["=성공", "Win"],
    ["=도전", "Quest"],
    ["=연습", "Practice"],
    ["=지우기", "Delete"],
    ["=닫기", "Close"],
    ["난이도", "Level"],
    ["마음껏", "Free"],
    ["씰", "seal"],
  ];

  // ---- 규칙을 정규식으로 ----
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const HANGUL = /[가-힣]/;
  const compiled = RULES.map(([ko, en]) => {
    const exact = ko[0] === "=";
    const pat = exact ? ko.slice(1) : ko;
    const src = esc(pat).replace(/\\\{#\\\}/g, "(\\d+(?:\\.\\d+)?)").replace(/\\\{\\\*\\\}/g, "([^<]*?)").replace(/\\\{d\\\}/g, "(\\d{4}-\\d{1,2}-\\d{1,2})");
    const weight = pat.replace(/\{[#*d]\}/g, "").replace(/[^가-힣]/g, "").length;
    return { re: new RegExp(exact ? "^(\\s*)" + src + "(\\s*)$" : src, exact ? "" : "g"), en, exact, weight };
  }).sort((a, b) => b.weight - a.weight);

  function tr(s) {
    if (lang === "ko" || s == null) return s;
    s = String(s);
    if (!HANGUL.test(s)) return s;
    s = s.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    for (const r of compiled) {
      if (!HANGUL.test(s)) break;
      if (r.exact) { const m = s.match(r.re); if (m) s = m[1] + r.en.replace(/\$(\d)/g, (_, i) => m[+i + 1] || "") + m[m.length - 1]; }
      else s = s.replace(r.re, r.en);
    }
    return s;
  }
  // HTML: 태그 사이 글자(굵게·줄바꿈 같은 글자 안 태그는 함께)만 번역하고, 태그 안에서는 사람이 읽는 속성만 번역한다
  const INLINE = /^<\/?(b|strong|em|br)\b/i;
  const ATTRS = /\b(aria-label|placeholder|alt|title)="([^"]*)"/g;
  function trHTML(html) {
    if (lang === "ko" || html == null) return html;
    html = String(html);
    if (!HANGUL.test(html)) return html;
    let out = "", run = "", last = 0;
    const flush = () => { if (run) { out += HANGUL.test(run) ? tr(run) : run; run = ""; } };
    const tagRe = /<[^>]*>/g;
    let m;
    while ((m = tagRe.exec(html))) {
      run += html.slice(last, m.index);
      const tag = m[0];
      if (INLINE.test(tag)) run += tag;
      else {
        flush();
        out += HANGUL.test(tag) ? tag.replace(ATTRS, (all, k, v) => `${k}="${tr(v).replace(/"/g, "&quot;")}"`) : tag;
      }
      last = tagRe.lastIndex;
    }
    run += html.slice(last); flush();
    return out;
  }

  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (e) {}
    location.reload();
  }
  window.I18N = { lang, t: tr, trHTML, setLang };
  if (lang === "ko") return;

  // ---- 화면에 글자가 들어가는 길목을 감싼다 ----
  const wrapSetter = (proto, prop, fn) => {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.set) return;
    Object.defineProperty(proto, prop, { ...d, set(v) { d.set.call(this, fn(v)); } });
  };
  wrapSetter(Element.prototype, "innerHTML", trHTML);
  wrapSetter(Node.prototype, "textContent", (v) => (typeof v === "string" ? tr(v) : v));
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (k, v) {
    return setAttr.call(this, k, /^(aria-label|placeholder|alt|title)$/.test(k) && typeof v === "string" ? tr(v) : v);
  };
  const C2D = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2D) {
    const ft = C2D.fillText, mt = C2D.measureText, st = C2D.strokeText;
    C2D.fillText = function (s, ...a) { return ft.call(this, tr(s), ...a); };
    C2D.strokeText = function (s, ...a) { return st.call(this, tr(s), ...a); };
    C2D.measureText = function (s) { return mt.call(this, tr(s)); };
  }

  // ---- 이미 그려진 index.html 글자 ----
  document.title = "Jump Rope Grade Challenge";
  ["title", "app", "bnav"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = el.innerHTML;
    if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.getAttribute("aria-label"));
  });
})();
