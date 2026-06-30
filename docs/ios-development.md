# iOS Development Guide

Daily Plank는 Expo/EAS 기반으로 iOS 빌드를 준비한다. 현재 목표는 Expo Go 확인을 넘어 실제 iPhone에 설치 가능한 Development Build 또는 TestFlight 빌드로 이동하는 것이다.

## 현재 iOS 설정

- App name: `Daily Plank`
- Bundle identifier: `com.hiorio.dailyplank`
- Build number: `1`
- Orientation: portrait
- Tablet support: disabled
- Encryption declaration: `ITSAppUsesNonExemptEncryption = false`
- Splash screen: `src/assets/branding/splash.png`
- App icon: `src/assets/branding/icon.png`

## 개발 명령

```bash
npm run start:tunnel
npm run build:dev:ios
npm run build:simulator:ios
npm run build:preview:ios
npm run build:production:ios
npm run submit:ios
```

## 빌드 타입 선택

### Expo Go

가장 빠른 확인용이다. 같은 와이파이가 아니면 `npm run start:tunnel`을 사용한다. 단, 실제 앱 패키지와 완전히 같은 환경은 아니다.

### Development Build for iPhone

실제 iPhone에서 native build 환경을 확인하는 단계다.

```bash
npm run build:dev:ios
```

필요한 것:

- Expo 계정
- Apple Developer Program 계정
- 테스트할 iPhone
- EAS가 안내하는 기기 등록 절차

### iOS Simulator Build

Mac 시뮬레이터용 빌드다.

```bash
npm run build:simulator:ios
```

Windows에서는 실행할 수 없고, 실제 iPhone에도 설치할 수 없다.

### Preview / TestFlight

실제 배포 흐름에 가까운 빌드다.

```bash
npm run build:preview:ios
npm run build:production:ios
npm run submit:ios
```

TestFlight까지 가려면 App Store Connect에 앱을 생성해야 한다.

## 사용자가 준비해야 할 것

1. Expo 계정 로그인
2. Apple Developer Program 가입
3. Apple ID 2단계 인증 가능 상태
4. 테스트 iPhone 준비
5. App Store Connect에서 앱 이름과 bundle identifier 등록
6. 개인정보 처리방침 URL 준비
7. App Store 스크린샷 준비

## iOS 실기기 QA 항목

- 앱 설치와 첫 실행
- 아이콘과 스플래시 표시
- 설정 화면에서 앱 점검 실행
- 설정 화면 안내 테스트: 음성, 효과음, 진동
- 세션 상세 화면의 안전 안내 확인
- 5분 세션 전체 완료
- 운동 중 화면 자동 꺼짐 방지
- 앱 백그라운드 이동 후 복귀 시간 보정
- 강제 종료 후 진행 중 운동 복구
- 운동 완료 기록 저장
- 앱 재시작 후 기록 유지
- 기록 전체 삭제

## 주의

iOS의 TTS 음성 품질은 기기에 설치된 한국어 음성에 따라 달라진다. 설정 앱에서 한국어 고품질 음성을 내려받으면 안내가 더 자연스러울 수 있다.
