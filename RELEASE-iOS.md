# 아이폰 앱 출시 안내 (윈도우 + 파워셸)

맥 없이 출시한다. 빌드는 GitHub Actions의 맥에서 하고, App Store Connect(TestFlight)로 바로 올라간다.
윈도우에서는 파워셸 명령 몇 줄만 친다.

## 0. 처음 한 번만 준비
1. **Apple Developer Program 가입**(연 회비)한 애플 계정
2. **GitHub CLI 설치** (파워셸):
   ```powershell
   winget install --id GitHub.cli
   gh auth login
   ```

## 1. 번들 ID 등록 (developer.apple.com)
Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App
- Description: `Jumprope Challenge`
- Bundle ID (Explicit): **`com.minimalbreeze.jumprope`**
- Capabilities: 아무것도 켜지 않아도 됨 → Register

## 2. 앱 만들기 (appstoreconnect.apple.com)
앱 → **+** → 새로운 앱
- 플랫폼: iOS
- 이름: `줄넘기 등급 챌린지` (이미 있는 이름이면 `줄넘기 등급 챌린지 - 씰 도감` 등으로)
- 기본 언어: 한국어
- 번들 ID: `com.minimalbreeze.jumprope`
- SKU: `jumprope-001`

## 3. 업로드용 API 키 만들기 (App Store Connect)
사용자 및 액세스 → 통합 → App Store Connect API → 팀 키 → **+**
- 이름: `github-actions`, 액세스: **관리자(Admin)** ← 인증서를 자동으로 만들려면 관리자여야 함
- 만든 뒤 **키 ID**, 위쪽의 **발급자(Issuer) ID**를 적어 두고, **API 키 다운로드**(.p8, 한 번만 받을 수 있음)

**팀 ID**: developer.apple.com → Account → Membership details → Team ID (10자리)

## 4. GitHub에 비밀값 등록 (파워셸)
```powershell
$R = "minimalbreeze/jumprope-challenge"
gh secret set APPLE_TEAM_ID -R $R -b "팀ID10자리"
gh secret set ASC_KEY_ID    -R $R -b "키ID"
gh secret set ASC_ISSUER_ID -R $R -b "발급자ID"
Get-Content -Raw "$HOME\Downloads\AuthKey_키ID.p8" | gh secret set ASC_KEY_P8 -R $R
```
비밀값은 GitHub에 암호화돼서 저장되고, 공개 리포여도 다른 사람은 볼 수 없다.

## 5. 빌드하고 올리기 (파워셸)
```powershell
gh workflow run ios-testflight.yml -R minimalbreeze/jumprope-challenge -f version=1.0.0
gh run watch -R minimalbreeze/jumprope-challenge
```
15~25분 걸린다. 초록색 체크가 뜨면 App Store Connect로 올라간 것이다.
새 버전을 올릴 때는 `version`만 바꾼다(예: `1.0.1`). 빌드 번호는 자동으로 올라간다.

## 6. TestFlight로 내 아이폰에서 먼저 해 보기
App Store Connect → 앱 → TestFlight
- 빌드가 "처리 중"에서 끝나면(10~30분) **내부 테스트** 그룹을 만들고 내 애플 계정을 추가
- 아이폰에 **TestFlight** 앱을 깔면 초대가 온다 → 설치
- 꼭 확인: 카메라 권한, 점프 세기, 비디오 판독, 씰 받기, 자랑하기 링크

## 7. 심사 제출 (App Store Connect → 앱 → iOS 앱 1.0)
`store/listing.md`의 내용을 복사해서 넣는다.
- 스크린샷: `store/screenshots/` (6.9인치, 1320×2868) — 아이폰 전용 앱이라 아이패드 스크린샷은 필요 없음
- 개인정보처리방침 URL: `https://minimalbreeze.github.io/jumprope-challenge/privacy.html`
- 지원 URL: `https://minimalbreeze.github.io/jumprope-challenge/support.html`
- 앱 개인정보 보호: **"데이터를 수집하지 않음"**
- 빌드 선택 → 심사에 추가 → 제출

## 문제가 생기면
- 빌드 로그: `gh run view -R minimalbreeze/jumprope-challenge --log-failed`
- 서명 오류(No signing certificate 등): API 키 액세스가 **관리자**인지, 팀 ID가 맞는지 확인
- "No suitable application records": 2번의 앱 만들기와 번들 ID가 같은지 확인
