# Daily Plank

5분, 7분, 10분 플랭크 루틴을 제공하는 Expo 기반 모바일 운동 가이드 앱입니다. 단순 카운트다운이 아니라 현재 동작, 다음 동작, 음성 안내, 효과음, 진동, 자동 휴식 전환, 운동 기록, 주간 통계, 연속 운동일을 포함합니다.

현재 우선순위는 GitHub Pages 데모보다 iOS 테스트앱 배포와 실기기 QA입니다. 웹 데모는 보조 확인용으로만 유지합니다.

## 실행 방법

```bash
npm install
npx expo start
npm run lint
npm test
```

추가 검사:

```bash
npm run typecheck
npm run check
npm run doctor
```

웹 데모 export:

```bash
npm run export:web
```

웹 데모 URL:

```text
https://hiorio.github.io/Daily-Plank/
```

## 휴대폰 테스트

PC와 휴대폰이 같은 와이파이에 있으면 LAN 모드로 실행합니다.

```bash
npm run start:mobile
```

같은 네트워크가 아니면 터널 모드를 사용합니다.

```bash
npm run start:tunnel
```

Expo Go 앱에서 터미널에 표시되는 QR 또는 `exp://...` 주소를 열면 됩니다. 터널 모드는 외부 네트워크에서도 동작하지만 LAN보다 느릴 수 있습니다.

## Development Build

현재 MVP는 Expo Go에서 대부분 확인할 수 있는 Expo SDK API를 사용합니다. 다만 실제 앱 배포 전에는 Development Build 또는 preview APK로 테스트하는 것이 좋습니다. Expo Go와 달리 실제 앱 패키지 ID, 앱 아이콘, 스플래시, 네이티브 설정이 적용된 환경에서 확인할 수 있기 때문입니다.

EAS 로그인이 필요합니다.

```bash
npx eas login
npm run build:dev:ios
npm run build:simulator:ios
npm run build:preview:ios
npm run build:dev:android
npm run build:preview:android
```

iOS 실기기 빌드는 Apple Developer Program 계정과 테스트 iPhone 등록이 필요합니다. Windows에서도 EAS Build로 iOS 빌드 생성은 가능하지만, iOS Simulator 실행은 Mac이 필요합니다.

## 주요 라이브러리

- React Native, Expo, TypeScript, Expo Router
- Zustand
- Expo SQLite
- AsyncStorage
- Expo Speech
- Expo Haptics
- Expo KeepAwake
- Expo Audio
- React Native Reanimated
- Lottie React Native
- Vitest, ESLint, Prettier

## 폴더 구조

```text
src/
  app/          Expo Router 화면
  components/   재사용 UI 컴포넌트
  constants/    색상, 표시 문구
  data/         운동 동작과 세션 데이터
  database/     SQLite 초기화, 마이그레이션, 기록 repository
  domain/       도메인 타입
  engine/       타이머, 운동 상태, 음성/효과음/진동 관리자
  hooks/        타이머, 앱 생명주기, 통계 훅
  services/     설정, 기록, 통계 서비스
  stores/       Zustand 상태
  utils/        날짜, 시간, ID, 검증 유틸
  assets/       로컬 이미지, 애니메이션, 효과음, 앱 브랜딩
```

## 타이머 엔진 설계

타이머는 화면 컴포넌트에서 1초씩 차감하지 않습니다. 각 단계는 `stepStartedAt`, `stepEndsAt`을 가지며, 남은 시간은 `stepEndsAt - Date.now()`로 계산합니다.

앱이 백그라운드에서 돌아오면 현재 시각 기준으로 지난 단계를 한 번에 건너뛰고 현재 단계 또는 완료 상태를 계산합니다. 일시정지 중에는 시간이 흐르지 않도록 재개 시 `stepEndsAt`을 일시정지 시간만큼 뒤로 이동합니다.

## 로컬 DB 구조

Expo SQLite로 `workout_record` 테이블을 생성합니다.

```sql
CREATE TABLE IF NOT EXISTS workout_record (
  record_id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  session_title TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  planned_duration_seconds INTEGER NOT NULL,
  actual_duration_seconds INTEGER NOT NULL,
  completion_rate REAL NOT NULL,
  skipped_step_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);
```

`started_at` 조회용 인덱스도 생성합니다. 정상 완료, 중간 종료, 복구 세션 폐기 시 기록을 저장합니다.

## 구현 완료 항목

- 홈, 세션 상세, 운동 진행, 완료, 기록, 설정 화면
- 5분, 7분, 10분 세션 데이터와 세션 검증
- 준비 카운트다운, 운동/휴식 자동 전환
- 일시정지/재개, 이전/다음 동작 이동, 종료 확인
- 현재 동작과 다음 동작 이미지 표시
- 음성 안내, 효과음, 진동 안내
- 10초/5초/3초 카운트다운 음성 cue
- 설정 화면 안내 테스트
- 앱 점검 화면: 세션 데이터, SQLite, AsyncStorage, 설정, 한국어 TTS 확인
- 운동 시작 전 안전 확인 모달
- 화면 자동 꺼짐 방지 설정
- 백그라운드 복귀 시 시간 보정
- 강제 종료 복구 확인 모달
- 복구 후 운동 화면 진입 시 진행 중 세션 재시작 방지
- SQLite 운동 기록 저장/조회/삭제
- 이번 주 운동 횟수, 주간 누적 시간, 연속 운동일 계산
- 세션 검증, 타이머, 통계, 완료율 단위 테스트
- GitHub Pages 웹 데모 배포
- Android/iOS 앱 식별자, 아이콘, 스플래시, EAS 빌드 스크립트
- iOS development, simulator, preview, production 빌드 명령

## 남아 있는 제한사항

- 운동 이미지는 저작권 문제를 피하기 위한 로컬 생성/placeholder 성격의 이미지입니다. 실제 출시 전에는 전문 일러스트 또는 촬영 이미지로 교체하는 것이 좋습니다.
- 효과음은 기본 beep 중심입니다.
- TTS 음질은 기기와 OS에 설치된 한국어 음성에 따라 달라집니다.
- 카메라 자세 인식, 로그인, 서버 동기화, 결제, HealthKit/Health Connect 연동은 MVP 범위에서 제외했습니다.

## 향후 권장 작업

- 실제 기기에서 TTS, haptic, keep awake, SQLite 복구 QA
- iOS Development Build 생성 후 iPhone 실기기 QA
- 앱스토어용 스크린샷과 개인정보 처리방침 준비
- 운동별 Lottie 애니메이션 또는 전문 이미지 세트 적용
- 세션 데이터를 원격 또는 import 가능한 포맷으로 확장

자세한 앱 빌드 체크리스트는 [docs/release-checklist.md](docs/release-checklist.md)를 참고합니다. iOS 우선 개발 흐름은 [docs/ios-development.md](docs/ios-development.md)에 정리되어 있습니다.
