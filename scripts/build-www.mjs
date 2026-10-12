// 웹앱 파일을 www/ 로 모은다. 아이폰 앱(Capacitor)은 이 폴더를 앱 안에 넣는다.
import { cpSync, rmSync, mkdirSync } from "node:fs";
const OUT = "www";
const ITEMS = ["index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-512-maskable.png", "js", "fonts"];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const it of ITEMS) cpSync(it, `${OUT}/${it}`, { recursive: true });
console.log(`www/ 준비 완료 (${ITEMS.length}개 항목)`);
