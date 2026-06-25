# Daily Plank App Build Checklist

이 문서는 웹 데모 이후 실제 모바일 앱 배포로 넘어가기 위한 체크리스트다.

## 1. 로컬 품질 검사

```bash
npm install
npm run check
npm run doctor
```

`npm run check`는 TypeScript, ESLint, 단위 테스트를 한 번에 실행한다.

## 2. Expo Go 테스트

```bash
npx expo start --tunnel
```

같은 와이파이가 아니면 `--tunnel`을 사용한다. 터널은 느릴 수 있지만 외부 네트워크에서도 Expo Go 테스트가 가능하다.

## 3. Development Build

Expo Go에서 네이티브 모듈 동작이나 실제 앱 환경을 더 정확히 확인해야 할 때 사용한다.

```bash
npm run build:dev:android
```

처음 실행 전에는 EAS 로그인이 필요하다.

```bash
npx eas login
```

## 4. 내부 배포 APK

스토어 등록 전 지인 또는 테스트 기기에 APK로 배포하려면 preview 프로필을 사용한다.

```bash
npm run build:preview:android
```

## 5. 스토어 배포 전 확인

- 앱 이름: Daily Plank
- Android package: `com.hiorio.dailyplank`
- iOS bundle identifier: `com.hiorio.dailyplank`
- 앱 아이콘과 스플래시가 실제 기기에서 정상 표시되는지 확인
- TTS, 효과음, 진동, 화면 켜짐 유지 동작 확인
- 운동 기록이 앱 재시작 후에도 유지되는지 확인
- 개인정보 처리방침 URL 준비
- 스토어 스크린샷 준비

## 현재 제한

- iOS 빌드는 Apple Developer 계정과 macOS 또는 EAS Build가 필요하다.
- Android 스토어 제출은 Google Play Console 계정이 필요하다.
- 실제 기기 QA 전까지 TTS 음색과 haptic 강도는 기기별 차이가 남아 있을 수 있다.
