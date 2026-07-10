const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  rootDir,
  voiceIdToDirectoryName,
} = require('./tts-catalog.cjs');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_VOICES = ['ko-KR-Chirp3-HD-Aoede', 'ko-KR-Chirp3-HD-Orus'];

const DIGITS = [
  { digit: '5', text: '\uC624', startsAtMs: 220 },
  { digit: '4', text: '\uC0AC', startsAtMs: 1220 },
  { digit: '3', text: '\uC0BC', startsAtMs: 2220 },
  { digit: '2', text: '\uC774', startsAtMs: 3220 },
  { digit: '1', text: '\uC77C', startsAtMs: 4220 },
];

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const TRACK_DURATION_MS = 5000;
const MAX_DIGIT_MS = 720;
const TRIM_PADDING_MS = 35;
const FADE_OUT_MS = 24;
const SILENCE_THRESHOLD = 260;
const COUNTDOWN_FILE_NAME = '00-countdown-5.wav';
const CACHE_DIR = path.join(rootDir, 'scripts/tts-cache/countdown');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const credentialPath =
    args.credentials ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? process.env.GOOGLE_TTS_CREDENTIALS;
  if (!credentialPath) {
    throw new Error('Pass --credentials <service-account.json> or set GOOGLE_APPLICATION_CREDENTIALS.');
  }

  const voices = (args.voices ?? DEFAULT_VOICES.join(','))
    .split(',')
    .map((voice) => voice.trim())
    .filter(Boolean);
  const accessToken = await getAccessToken(credentialPath);

  for (const voiceName of voices) {
    await generateCountdownTrack({ accessToken, voiceName });
  }
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
    throw new Error('Google service account JSON must include client_email and private_key.');
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
    throw new Error(`Google token request failed: ${payload.error_description ?? payload.error ?? response.status}`);
  }

  return payload.access_token;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function generateCountdownTrack({ accessToken, voiceName }) {
  const directoryName = voiceIdToDirectoryName(voiceName);
  const outputDir = path.join(rootDir, 'src/assets/tts', directoryName);
  const cacheDir = path.join(CACHE_DIR, directoryName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  const track = Buffer.alloc(msToSamples(TRACK_DURATION_MS) * BYTES_PER_SAMPLE);

  for (const item of DIGITS) {
    const sourcePath = path.join(cacheDir, `${item.digit}.wav`);
    if (!fs.existsSync(sourcePath)) {
      const wav = await synthesizeDigit({ accessToken, text: item.text, voiceName });
      fs.writeFileSync(sourcePath, wav);
    }

    const wav = parseWav(fs.readFileSync(sourcePath));
    if (wav.sampleRate !== SAMPLE_RATE || wav.channels !== CHANNELS || wav.bitsPerSample !== BITS_PER_SAMPLE) {
      throw new Error(`${voiceName} ${item.digit}: unsupported WAV format.`);
    }

    const trimmed = capPcm(trimPcm(wav.data), MAX_DIGIT_MS);
    mixPcm(track, trimmed, msToSamples(item.startsAtMs));
  }

  const outputPath = path.join(outputDir, COUNTDOWN_FILE_NAME);
  fs.writeFileSync(outputPath, writeWav(track));
  console.log(`${voiceName}: wrote ${path.relative(rootDir, outputPath)}`);
}

async function synthesizeDigit({ accessToken, text, voiceName }) {
  const response = await fetch(GOOGLE_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: SAMPLE_RATE,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Google TTS failed (${voiceName} ${text}): ${payload.error?.message ?? response.status}`);
  }

  return Buffer.from(payload.audioContent, 'base64');
}

function parseWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return {
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitsPerSample: BITS_PER_SAMPLE,
      data: buffer,
    };
  }

  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      format = {
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    }
    if (chunkId === 'data') {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format || !data) throw new Error('Invalid WAV file.');
  return { ...format, data };
}

function trimPcm(buffer) {
  const sampleCount = Math.floor(buffer.length / BYTES_PER_SAMPLE);
  let first = 0;
  let last = sampleCount - 1;

  while (first < sampleCount && Math.abs(buffer.readInt16LE(first * BYTES_PER_SAMPLE)) < SILENCE_THRESHOLD) {
    first += 1;
  }
  while (last > first && Math.abs(buffer.readInt16LE(last * BYTES_PER_SAMPLE)) < SILENCE_THRESHOLD) {
    last -= 1;
  }

  const padding = msToSamples(TRIM_PADDING_MS);
  const start = Math.max(0, first - padding);
  const end = Math.min(sampleCount, last + padding);
  return buffer.subarray(start * BYTES_PER_SAMPLE, end * BYTES_PER_SAMPLE);
}

function capPcm(buffer, maxMs) {
  const maxBytes = msToSamples(maxMs) * BYTES_PER_SAMPLE;
  if (buffer.length <= maxBytes) return buffer;
  const capped = Buffer.from(buffer.subarray(0, maxBytes));
  fadeOut(capped, FADE_OUT_MS);
  return capped;
}

function fadeOut(buffer, fadeMs) {
  const fadeSamples = Math.min(msToSamples(fadeMs), Math.floor(buffer.length / BYTES_PER_SAMPLE));
  const totalSamples = Math.floor(buffer.length / BYTES_PER_SAMPLE);
  const start = totalSamples - fadeSamples;
  for (let sample = start; sample < totalSamples; sample += 1) {
    const factor = Math.max(0, (totalSamples - sample) / fadeSamples);
    const value = Math.round(buffer.readInt16LE(sample * BYTES_PER_SAMPLE) * factor);
    buffer.writeInt16LE(value, sample * BYTES_PER_SAMPLE);
  }
}

function mixPcm(target, source, startSample) {
  const targetSamples = Math.floor(target.length / BYTES_PER_SAMPLE);
  const sourceSamples = Math.floor(source.length / BYTES_PER_SAMPLE);
  for (let sample = 0; sample < sourceSamples; sample += 1) {
    const targetIndex = startSample + sample;
    if (targetIndex >= targetSamples) break;
    const mixed =
      target.readInt16LE(targetIndex * BYTES_PER_SAMPLE) +
      source.readInt16LE(sample * BYTES_PER_SAMPLE);
    target.writeInt16LE(clampInt16(mixed), targetIndex * BYTES_PER_SAMPLE);
  }
}

function clampInt16(value) {
  return Math.max(-32768, Math.min(32767, value));
}

function writeWav(data) {
  const header = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

function msToSamples(ms) {
  return Math.round((SAMPLE_RATE * ms) / 1000);
}
