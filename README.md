# 플랭크 가이드 MVP

5분, 7분, 10분 플랭크 세션을 제공하는 Expo 기반 모바일 운동 가이드 앱이다. 운동/휴식 단계 자동 전환, 음성 안내, 효과음, 진동, 화면 켜짐 유지, 로컬 기록 저장, 주간 통계와 연속 운동일 계산을 포함한다.

## 실행 방법

```bash
npm install
npx expo start
npm run lint
npm test
```

웹 데모는 GitHub Pages로 배포한다.

```text
https://hiorio.github.io/Daily-Plank/
```

추가 검사:

```bash
npm run typecheck
```

웹에서 빠르게 확인하려면 Expo 터미널에서 `w`를 누르거나 다음 명령을 사용할 수 있다.

```bash
npx expo start --web
```

GitHub Pages용 정적 export:

```bash
npm run export:web
```

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

현재 MVP는 Expo Go 지원 범위 안의 API를 사용한다. 별도 Development Build는 필수로 요구하지 않는다. 다만 향후 백그라운드 오디오, 커스텀 네이티브 모듈, Expo Go에 포함되지 않은 native library를 추가하면 Development Build가 필요하다.

## 폴더 구조

```text
src/
  app/          Expo Router 화면
  components/   재사용 UI 컴포넌트
  constants/    색상, 문구
  data/         운동 동작과 세션 데이터
  database/     SQLite 초기화, 마이그레이션, 기록 repository
  domain/       도메인 타입
  engine/       타이머, 운동 상태, 음성/효과음/진동 관리자
  hooks/        타이머, 앱 생명주기, 통계 훅
  services/     설정, 기록, 통계 서비스
  stores/       Zustand 상태
  utils/        날짜, 시간, ID, 검증 유틸
  assets/       로컬 이미지, 애니메이션, 효과음
```

## 타이머 엔진 설계

타이머는 화면 컴포넌트의 1초 감소 상태에 의존하지 않는다. 각 단계는 `stepStartedAt`, `stepEndsAt`을 갖고, 남은 시간은 `stepEndsAt - Date.now()`로 계산한다.

앱이 백그라운드에서 돌아오면 `resolveStepProgressAfterElapsedTime`이 현재 시각 기준으로 지난 단계를 한 번에 건너뛰고 현재 단계 또는 완료 상태를 계산한다. 일시정지 중에는 시간이 흐르지 않도록 재개 시 `stepEndsAt`을 일시정지 시간만큼 뒤로 이동한다.

## 로컬 DB 구조

Expo SQLite에 `workout_record` 테이블을 생성한다.

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

`started_at` 조회용 인덱스도 생성한다. 운동 정상 완료, 사용자 중간 종료, 복구 운동 폐기 시 기록을 저장한다.

## 구현 완료 항목

- 홈, 세션 상세, 운동 진행, 완료, 기록, 설정 화면
- 5분/7분/10분 세션 데이터와 개발 시 검증
- 준비 카운트다운, 운동/휴식 자동 전환
- 일시정지/재개, 이전/다음 이동, 종료 확인
- 음성 안내, 효과음, 진동 안내 관리자
- 화면 자동 꺼짐 방지 설정
- 백그라운드 복귀 시 시간 보정
- 강제 종료 복구 확인 모달
- SQLite 운동 기록 저장/조회/삭제
- 이번 주 운동 횟수, 이번 주 누적 시간, 연속 운동일 계산
- 세션 검증, 타이머, 통계, 완료율 단위 테스트

## 미구현 또는 제한사항

- 실제 운동 이미지와 Lottie 애니메이션 asset은 placeholder 구조만 준비되어 있다.
- 효과음은 로컬 기본 beep WAV 1개만 포함되어 있다.
- 자세 인식, 로그인, 서버 동기화, 푸시, 결제, HealthKit/Health Connect 연동은 MVP 범위에서 제외했다.
- 실제 기기 장시간 백그라운드 실행 보장은 OS 정책 영향을 받는다. 앱 복귀 시 시간 보정 방식으로 처리한다.

## 향후 권장 작업

- 운동별 PNG 또는 Lottie asset 교체
- 실제 기기에서 TTS, haptic, keep awake 동작 QA
- 접근성 문구와 큰 글씨 모드 보강
- 세션 JSON 원격/로컬 import 구조 확장
- 운동 완료 기록 export 또는 백업 기능 추가
