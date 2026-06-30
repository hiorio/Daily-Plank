# Daily Plank App Build Checklist

이 문서는 웹 데모 이후 실제 모바일 앱 배포로 넘어가기 위한 체크리스트다. 현재 우선순위는 iOS 개발과 실기기 QA다.

## 1. 공통 로컬 검사

```bash
npm install
npm run check
npm run doctor
```

`npm run check`는 TypeScript, ESLint, 단위 테스트를 한 번에 실행한다.

## 2. iOS 우선 테스트 흐름

PC와 iPhone이 같은 네트워크가 아니면 터널 모드로 Expo Go 테스트를 시작한다.

```bash
npm run start:tunnel
```

Expo Go는 빠른 UI/라우팅/기본 기능 확인에 적합하다. 실제 앱 아이콘, 스플래시, native build 환경, 배포 서명까지 확인하려면 EAS Build가 필요하다.

## 3. iOS Development Build

실제 iPhone에서 Development Build를 설치하려면 Apple Developer Program 계정과 테스트 기기 등록이 필요하다.

```bash
npx eas login
npm run build:dev:ios
```

EAS가 Apple 계정 로그인, 인증서, provisioning profile, 테스트 기기 등록을 안내한다.

## 4. iOS Simulator Build

Mac이 있거나 나중에 Mac 시뮬레이터에서 확인할 수 있으면 다음 명령을 사용한다. 이 빌드는 실제 iPhone에 설치할 수 없다.

```bash
npm run build:simulator:ios
```

## 5. iOS 내부 배포와 TestFlight

실제 사용자 테스트 전 내부 배포:

```bash
npm run build:preview:ios
```

App Store Connect/TestFlight로 올릴 production 빌드:

```bash
npm run build:production:ios
npm run submit:ios
```

## 6. 출시 전 확인

- 앱 이름: Daily Plank
- iOS bundle identifier: `com.hiorio.dailyplank`
- Android package: `com.hiorio.dailyplank`
- 앱 아이콘과 스플래시가 실제 iPhone에서 정상 표시되는지 확인
- 앱 점검 화면에서 실패 항목이 없는지 확인
- TTS, 효과음, 진동, 화면 켜짐 유지 동작 확인
- 설정 화면의 안내 테스트 버튼으로 음성/효과음/진동 개별 확인
- 세션 상세 화면의 안전 안내와 시작 확인 모달 확인
- 운동 기록이 앱 재시작 후에도 유지되는지 확인
- 강제 종료 복구 후 기존 운동이 다시 처음부터 시작되지 않는지 확인
- 개인정보 처리방침 URL 준비
- App Store Connect 앱 등록 준비
- iPhone 스크린샷 준비

## 현재 제한

- iOS 실기기 빌드는 Apple Developer Program 유료 계정이 필요하다.
- Windows에서는 iOS Simulator를 직접 실행할 수 없다.
- EAS Build를 사용하면 Windows에서도 iOS 빌드 생성은 가능하지만, Apple 계정 인증과 기기 등록은 사용자가 진행해야 한다.
- 실제 기기 QA 전까지 TTS 음색과 haptic 강도는 기기별 차이가 남아 있을 수 있다.
