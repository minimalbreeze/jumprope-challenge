/* 줄넘기 등급 챌린지 — 도감 주인 확인
 *
 * 처음 열 때 이 기기 안에서만 쓰는 서명 열쇠(ECDSA P-256)를 만든다.
 *  - 비밀 열쇠는 꺼낼 수 없게(non-extractable) 만들어 IndexedDB에 둔다. 서버로 안 나간다.
 *  - 공개 열쇠의 지문으로 "도감 번호"(#K7Q2-9F3A)를 만든다.
 *  - 공유 링크에는 도감 내용 + 공개 열쇠 + 서명이 들어간다.
 *    누가 링크 내용을 고치거나 남의 번호로 바꾸면 서명이 깨져서 "확인 안 된 도감"으로 나온다.
 *  - 링크를 연 폰이 그 열쇠를 가진 폰이면 "내 도감"이라고 알려준다.
 * 한계: 서버가 없어서 씰 기록 자체가 진짜로 뛰어서 딴 건지까지는 보장하지 못한다.
 */
(function () {
  const DB = "jumprope", STORE = "keys";
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const enc = new TextEncoder(), dec = new TextDecoder();

  const b64u = {
    from(bytes) {
      let s = ""; const b = new Uint8Array(bytes);
      for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    to(str) {
      const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4));
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return out;
    },
  };

  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) {
    const db = await idb();
    return new Promise((res, rej) => {
      const r = db.transaction(STORE).objectStore(STORE).get(k);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbPut(k, v) {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, "readwrite"); t.objectStore(STORE).put(v, k);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }

  async function fingerprint(pubRaw) {
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", pubRaw));
    let bits = 0, val = 0, out = "";
    for (let i = 0; i < 5; i++) {
      val = (val << 8) | h[i]; bits += 8;
      while (bits >= 5) { out += ALPHA[(val >> (bits - 5)) & 31]; bits -= 5; }
    }
    return out.slice(0, 4) + "-" + out.slice(4, 8);
  }

  // 아이마다 열쇠를 따로 둔다(도감 번호가 아이마다 다름). 처음 만든 열쇠 이름은 "device".
  const cache = {};
  let current = "device";
  async function init(name) {
    if (name) current = name;
    if (cache[current]) return cache[current];
    let m;
    try {
      let rec = await idbGet(current);
      if (!rec) {
        const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
        const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
        rec = { priv: kp.privateKey, pubRaw };
        await idbPut(current, rec);
      }
      const pubRaw = new Uint8Array(rec.pubRaw);
      m = { priv: rec.priv, pubRaw, pubB64: b64u.from(pubRaw), id: await fingerprint(pubRaw), name: current };
    } catch (e) {
      m = { priv: null, pubRaw: null, pubB64: "", id: "", name: current, error: String(e) };
    }
    return (cache[current] = m);
  }
  /** 이 폰에 있는 모든 열쇠의 공개 열쇠 → 열쇠 이름 */
  async function localKeys() {
    try {
      const db = await idb();
      return await new Promise((res) => {
        const out = {}, r = db.transaction(STORE).objectStore(STORE).openCursor();
        r.onsuccess = () => { const c = r.result; if (!c) return res(out); out[b64u.from(new Uint8Array(c.value.pubRaw))] = c.key; c.continue(); };
        r.onerror = () => res(out);
      });
    } catch (e) { return {}; }
  }
  async function forget(name) {
    delete cache[name];
    try { const db = await idb(); await new Promise((res) => { const t = db.transaction(STORE, "readwrite"); t.objectStore(STORE).delete(name); t.oncomplete = res; t.onerror = res; }); } catch (e) {}
  }

  async function deflate(bytes) {
    if (typeof CompressionStream === "undefined") return null;
    const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function inflate(bytes) {
    const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }

  /** 공유용 문자열 만들기: "z.<내용>.<서명>" 또는 압축이 안 되면 "u.<내용>.<서명>" */
  async function seal(payload) {
    const m = await init();
    const body = { ...payload, k: m.pubB64 };
    const text = JSON.stringify(body);
    const raw = enc.encode(text);
    let sig = "";
    if (m.priv) {
      sig = b64u.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, m.priv, raw));
    }
    const z = await deflate(raw);
    return (z ? "z." + b64u.from(z) : "u." + b64u.from(raw)) + "." + sig;
  }

  /** 공유 문자열 열기 → { payload, status: "ok"|"bad"|"unsigned", id, mine } */
  async function open(token) {
    const [mode, data, sig] = token.split(".");
    let raw = b64u.to(data);
    if (mode === "z") raw = await inflate(raw);
    const text = dec.decode(raw);
    const payload = JSON.parse(text);
    let status = "unsigned", id = "";
    if (payload.k) {
      const pubRaw = b64u.to(payload.k);
      id = await fingerprint(pubRaw);
      if (sig) {
        try {
          const key = await crypto.subtle.importKey("raw", pubRaw, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
          const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64u.to(sig), raw);
          status = ok ? "ok" : "bad";
        } catch (e) { status = "bad"; }
      }
    }
    const keys = await localKeys();
    const mineKey = status === "ok" && payload.k ? keys[payload.k] || "" : "";
    return { payload, status, id, mine: !!mineKey, mineKey };
  }

  window.JumpID = { init, seal, open, forget };
})();
