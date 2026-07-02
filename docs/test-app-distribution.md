# Test App Distribution Plan

현재 배포 우선순위는 GitHub Pages가 아니라 iOS 테스트앱 배포다. Pages는 웹 확인용으로만 유지하고, QA 판단은 iPhone 실기기 기준으로 한다.

## 1. 배포 전 로컬 기준

```bash
npm run check
npm run doctor
```

둘 다 통과해야 테스트앱 빌드를 시작한다.

## 2. iOS Development Build

```bash
npx eas-cli login
npm run build:dev:ios
```

이 단계는 실제 iPhone에 설치해서 native 동작을 확인하는 용도다.

## 3. 실기기 첫 실행 순서

1. 앱 설치 후 첫 화면 표시 확인
2. 설정으로 이동
3. 앱 점검 실행
4. 음성, 효과음, 진동 테스트
5. 5분 세션 상세 진입
6. 안전 안내 확인 후 운동 시작
7. 운동 중 백그라운드 전환과 복귀 확인
8. 앱 강제 종료 후 복구 확인
9. 운동 완료 후 기록 저장 확인

## 4. 수정 판단 기준

- 앱 점검 화면에서 `오류`가 있으면 배포 중단
- 한국어 TTS가 `확인`으로 나오면 iOS 설정의 한국어 음성 설치 여부 확인
- 세션 완료 기록이 저장되지 않으면 배포 중단
- 복구 후 운동이 처음부터 다시 시작하면 배포 중단

## 5. 다음 배포 단계

Development Build QA가 안정화되면 TestFlight용 production 빌드를 만든다.

```bash
npm run build:production:ios
npm run submit:ios
```
