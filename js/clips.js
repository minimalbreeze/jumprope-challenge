/* 줄넘기 등급 챌린지 — 내 영상 보관함
 * 도전할 때 찍은 영상과 분석 결과를 이 폰의 IndexedDB 에만 저장한다. 서버로 보내지 않는다.
 * 너무 쌓이지 않게 최근 MAX 개만 남긴다. 사용자가 지우기 전에는 지우지 않는다(개수 초과분만 오래된 것부터).
 */
(function () {
  const DB = "jumprope-clips", STORE = "clips", MAX = 30;
  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  async function list() {
    try { const all = await tx("readonly", (s) => s.getAll()); return (all || []).sort((a, b) => b.id - a.id); } catch (e) { return []; }
  }
  async function save(rec) {
    rec.id = rec.id || Date.now();
    await tx("readwrite", (s) => s.put(rec));
    const all = await list();
    for (const old of all.slice(MAX)) await tx("readwrite", (s) => s.delete(old.id));
    return rec.id;
  }
  async function get(id) { try { return await tx("readonly", (s) => s.get(id)); } catch (e) { return null; } }
  async function remove(id) { await tx("readwrite", (s) => s.delete(id)); }
  window.JumpClips = { list, save, get, remove, MAX };
})();
