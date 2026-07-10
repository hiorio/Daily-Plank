const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  loadWorkoutTtsMessages,
  rootDir,
  voiceIdToDirectoryName,
} = require('./tts-catalog.cjs');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const COUNTDOWN_TRACK_MESSAGE = '5 4 3 2 1';
const COMMON_COUNTDOWN_TRACK_VOICE = 'ko-KR-Chirp3-HD-Aoede';
const COMMON_COUNTDOWN_TRACK_DIRECTORY = voiceIdToDirectoryName(COMMON_COUNTDOWN_TRACK_VOICE);
const COUNTDOWN_TRACK_FILE_NAME = '00-countdown-5.wav';
const PER_VOICE_COUNTDOWN_TRACK_VOICES = new Set([
  'ko-KR-Chirp3-HD-Orus',
]);
const DEFAULT_VOICES = [
  'ko-KR-Chirp3-HD-Aoede',
  'ko-KR-Chirp3-HD-Kore',
  'ko-KR-Chirp3-HD-Leda',
  'ko-KR-Chirp3-HD-Callirrhoe',
  'ko-KR-Chirp3-HD-Charon',
  'ko-KR-Chirp3-HD-Puck',
  'ko-KR-Chirp3-HD-Orus',
  'ko-KR-Chirp3-HD-Rasalgethi',
];

const VOICE_DETAILS = {
  "ko-KR-Chirp3-HD-Aoede": {
    label: "Aoede",
    description: "부드럽고 안정적인 여성 목소리",
  },
  "ko-KR-Chirp3-HD-Kore": {
    label: "Kore",
    description: "밝고 또렷한 여성 목소리",
  },
  "ko-KR-Chirp3-HD-Leda": {
    label: "Leda",
    description: "차분하고 집중감 있는 여성 목소리",
  },
  "ko-KR-Chirp3-HD-Callirrhoe": {
    label: "Callirrhoe",
    description: "자연스럽고 부드러운 여성 목소리",
  },
  "ko-KR-Chirp3-HD-Charon": {
    label: "Charon",
    description: "낮고 단단한 남성 목소리",
  },
  "ko-KR-Chirp3-HD-Puck": {
    label: "Puck",
    description: "친근하고 선명한 남성 목소리",
  },
  "ko-KR-Chirp3-HD-Orus": {
    label: "Orus",
    description: "묵직하고 안정적인 남성 목소리",
  },
  "ko-KR-Chirp3-HD-Rasalgethi": {
    label: "Rasalgethi",
    description: "깊고 차분한 남성 목소리",
  },
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const credentialPath =
    args.credentials ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credentialPath) {
    throw new Error(
      'Google ?쒕퉬??怨꾩젙 JSON 寃쎈줈媛 ?꾩슂?⑸땲?? --credentials <path> ?먮뒗 GOOGLE_APPLICATION_CREDENTIALS瑜??ъ슜?섏꽭??',
    );
  }

  const voices = (args.voices ?? DEFAULT_VOICES.join(','))
    .split(',')
    .map((voice) => voice.trim())
    .filter(Boolean);
  const messages = loadWorkoutTtsMessages();
  const accessToken = await getAccessToken(credentialPath);
  const voicePacks = [];

  console.log(`TTS 臾멸뎄 ${messages.length}媛? ?뚯꽦 ${voices.length}媛쒕? ?앹꽦?⑸땲??`);

  for (const voiceName of voices) {
    const voicePack = await generateVoicePack({
      accessToken,
      messages,
      voiceName,
    });
    voicePacks.push(voicePack);
  }

  writeCombinedManifest(voicePacks);
}

function parseArgs(rawArgs) {
  const args = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

async function getAccessToken(credentialPath) {
  const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  if (!credential.client_email || !credential.private_key) {
    throw new Error('?쒕퉬??怨꾩젙 JSON?먯꽌 client_email ?먮뒗 private_key瑜?李얠? 紐삵뻽?듬땲??');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = base64UrlJson({
    iss: credential.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  });
  const unsignedJwt = `${header}.${claim}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(credential.private_key, 'base64url');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Google ?몄쬆 ?ㅽ뙣: ${payload.error_description ?? payload.error ?? response.status}`);
  }

  return payload.access_token;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function generateVoicePack({ accessToken, messages, voiceName }) {
  const directoryName = voiceIdToDirectoryName(voiceName);
  const outputDir = path.join(rootDir, 'src/assets/tts', directoryName);
  fs.mkdirSync(outputDir, { recursive: true });

  const entries = [];

  for (const [index, message] of messages.entries()) {
    if (message === COUNTDOWN_TRACK_MESSAGE) {
      const countdownDirectoryName = PER_VOICE_COUNTDOWN_TRACK_VOICES.has(voiceName)
        ? directoryName
        : COMMON_COUNTDOWN_TRACK_DIRECTORY;
      const countdownPath = path.join(rootDir, 'src/assets/tts', countdownDirectoryName, COUNTDOWN_TRACK_FILE_NAME);
      if (!fs.existsSync(countdownPath)) {
        throw new Error(
          `${countdownDirectoryName}/${COUNTDOWN_TRACK_FILE_NAME} is missing. Run scripts/generate-countdown-tracks.cjs first.`,
        );
      }
      entries.push({
        message,
        fileName: COUNTDOWN_TRACK_FILE_NAME,
        directoryName: countdownDirectoryName,
      });
      console.log(`${voiceName}: countdown ${countdownDirectoryName}/${COUNTDOWN_TRACK_FILE_NAME}`);
      continue;
    }

    const messageHash = hashMessage(message);
    const fileName = findExistingGeneratedFile(outputDir, messageHash)
      ?? `${String(index + 1).padStart(2, '0')}-${messageHash}.mp3`;
    const outputPath = path.join(outputDir, fileName);

    if (!fs.existsSync(outputPath)) {
      const audioContent = await synthesizeSpeech({ accessToken, text: message, voiceName });
      fs.writeFileSync(outputPath, Buffer.from(audioContent, 'base64'));
    }

    entries.push({ message, fileName, directoryName });
    console.log(`${voiceName}: ${index + 1}/${messages.length} ${fileName}`);
  }

  return { voiceName, directoryName, entries };
}

function hashMessage(message) {
  return crypto.createHash('sha256').update(message).digest('hex').slice(0, 12);
}

function findExistingGeneratedFile(outputDir, messageHash) {
  if (!fs.existsSync(outputDir)) return null;
  return fs
    .readdirSync(outputDir)
    .filter((fileName) => fileName.endsWith(`-${messageHash}.mp3`))
    .sort()[0] ?? null;
}

async function synthesizeSpeech({ accessToken, text, voiceName }) {
  const audioConfig = {
    audioEncoding: 'MP3',
  };

  if (!voiceName.includes('-Chirp3-HD-')) {
    audioConfig.speakingRate = 0.92;
    audioConfig.pitch = 0;
  }

  const response = await fetch(GOOGLE_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      input: getTtsInput(text),
      voice: {
        languageCode: 'ko-KR',
        name: voiceName,
      },
      audioConfig,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Google TTS ?앹꽦 ?ㅽ뙣 (${voiceName}): ${payload.error?.message ?? response.status}`,
    );
  }

  return payload.audioContent;
}

function getTtsInput(text) {
  return { text };
}

function writeCombinedManifest(voicePacks) {
  const manifestPath = path.join(rootDir, 'src/assets/tts/googleTtsAssets.ts');
  const lines = [
    "import type { AudioSource } from 'expo-audio';",
    "import type { TtsVoiceId } from '../../domain/settings';",
    '',
    '// 이 파일은 scripts/generate-google-tts.cjs로 생성합니다.',
    'export interface GeneratedTtsVoiceOption {',
    '  id: TtsVoiceId;',
    '  label: string;',
    '  description: string;',
    '}',
    '',
    'export const generatedTtsVoiceOptions: GeneratedTtsVoiceOption[] = [',
  ];

  for (const voicePack of voicePacks) {
    const detail = VOICE_DETAILS[voicePack.voiceName] ?? {
      label: voicePack.voiceName,
      description: 'Google Cloud TTS 음성',
    };
    lines.push(
      `  { id: ${JSON.stringify(voicePack.voiceName)} as TtsVoiceId, label: ${JSON.stringify(
        detail.label,
      )}, description: ${JSON.stringify(detail.description)} },`,
    );
  }

  lines.push('];', '', 'export const generatedTtsAssets: Record<TtsVoiceId, Record<string, AudioSource>> = {');

  for (const voicePack of voicePacks) {
    lines.push(`  ${JSON.stringify(voicePack.voiceName)}: {`);
    for (const entry of voicePack.entries) {
      lines.push(
        `    ${JSON.stringify(entry.message)}: require('./${entry.directoryName}/${entry.fileName}'),`,
      );
    }
    lines.push('  },');
  }

  lines.push('};', '');
  fs.writeFileSync(manifestPath, lines.join('\n'), 'utf8');
}
