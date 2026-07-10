const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { loadWorkoutTtsMessages, rootDir, voiceIdToDirectoryName } = require('./tts-catalog.cjs');

const COUNTDOWN_TRACK_MESSAGE = '5 4 3 2 1';
const COMMON_COUNTDOWN_TRACK_SOURCE = path.join(
  rootDir,
  'src/assets/tts/ko-kr-chirp3-hd-aoede/00-countdown-5.wav',
);
const COUNTDOWN_MIN_SECONDS = 4.95;
const COUNTDOWN_MAX_SECONDS = 5.05;
const COUNTDOWN_SLOT_MIN_RMS = 500;
const COUNTDOWN_SLOT_MIN_PEAK = 3000;
const COUNTDOWN_SLOT_MIN_ACTIVE_MS = 80;
const HD_VOICE_DIR_PATTERN = /^ko-kr-chirp3-hd-/;
const verifiedCountdownSources = new Set();

installTypeScriptHook();
installAssetHooks();

const { generatedTtsAssets, generatedTtsVoiceOptions } = require(path.join(
  rootDir,
  'src/assets/tts/googleTtsAssets.ts',
));

const failures = [];

verifyNoSystemTtsFallback();
verifyOnlyHdVoiceDirectories();
verifyAssetCoverage();
verifyCountdownTracks();

if (failures.length > 0) {
  for (const failure of failures) console.error(`TTS verify failed: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('TTS assets verified.');
}

function installTypeScriptHook() {
  global.__DEV__ = false;
  require.extensions['.ts'] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}

function installAssetHooks() {
  require.extensions['.mp3'] = (module, filename) => {
    module.exports = filename;
  };
  require.extensions['.wav'] = (module, filename) => {
    module.exports = filename;
  };
}

function verifyNoSystemTtsFallback() {
  const managerPath = path.join(rootDir, 'src/engine/AudioCueManager.ts');
  const source = fs.readFileSync(managerPath, 'utf8');
  if (source.includes('Speech.speak(')) {
    failures.push('AudioCueManager still contains Speech.speak fallback.');
  }
}

function verifyOnlyHdVoiceDirectories() {
  const ttsDir = path.join(rootDir, 'src/assets/tts');
  const directories = fs.readdirSync(ttsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const directory of directories) {
    if (!HD_VOICE_DIR_PATTERN.test(directory.name)) {
      failures.push(`Unexpected non-HD TTS directory: ${directory.name}`);
    }
  }
}

function verifyAssetCoverage() {
  const messages = loadWorkoutTtsMessages();
  for (const voice of generatedTtsVoiceOptions) {
    const pack = generatedTtsAssets[voice.id] ?? {};
    for (const message of messages) {
      if (!pack[message]) {
        failures.push(`${voice.id} is missing generated TTS for: ${message}`);
      }
    }
  }
}

function verifyCountdownTracks() {
  for (const voice of generatedTtsVoiceOptions) {
    const source = generatedTtsAssets[voice.id]?.[COUNTDOWN_TRACK_MESSAGE];
    if (!source) {
      failures.push(`${voice.id} is missing countdown track.`);
      continue;
    }
    if (!source.endsWith('.wav')) {
      failures.push(`${voice.id} countdown track must be WAV, got: ${path.basename(source)}`);
      continue;
    }
    if (!fs.existsSync(source)) {
      failures.push(`${voice.id} countdown track file does not exist: ${source}`);
      continue;
    }
    const resolvedSource = path.resolve(source);
    const voiceCountdownSource = path.join(
      rootDir,
      'src/assets/tts',
      voiceIdToDirectoryName(voice.id),
      '00-countdown-5.wav',
    );
    const usesCommonCountdown = resolvedSource === path.resolve(COMMON_COUNTDOWN_TRACK_SOURCE);
    const usesVoiceCountdown = resolvedSource === path.resolve(voiceCountdownSource);
    if (!usesCommonCountdown && !usesVoiceCountdown) {
      failures.push(`${voice.id} countdown track must use Aoede or its own verified asset, got: ${source}`);
      continue;
    }
    const durationSeconds = readWavDurationSeconds(source);
    if (durationSeconds < COUNTDOWN_MIN_SECONDS || durationSeconds > COUNTDOWN_MAX_SECONDS) {
      failures.push(
        `${voice.id} countdown track duration must be about 5.0s, got ${durationSeconds.toFixed(3)}s.`,
      );
    }
    if (!verifiedCountdownSources.has(resolvedSource)) {
      verifiedCountdownSources.add(resolvedSource);
      verifyCountdownSlotAudio(source, voice.id);
    }
  }
}

function readWavDurationSeconds(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Not a WAV file: ${filePath}`);
  }

  let offset = 12;
  let sampleRate = null;
  let channels = null;
  let bitsPerSample = null;
  let dataSize = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    }
    if (chunkId === 'data') {
      dataSize = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || dataSize == null) {
    throw new Error(`Invalid WAV file: ${filePath}`);
  }

  return dataSize / (sampleRate * channels * (bitsPerSample / 8));
}

function verifyCountdownSlotAudio(filePath, voiceId) {
  const slots = readWavSlotStats(filePath);
  for (const slot of slots) {
    if (
      slot.rms < COUNTDOWN_SLOT_MIN_RMS ||
      slot.peak < COUNTDOWN_SLOT_MIN_PEAK ||
      slot.activeMs < COUNTDOWN_SLOT_MIN_ACTIVE_MS
    ) {
      failures.push(
        `${voiceId} countdown digit ${slot.digit} is too quiet: rms=${slot.rms}, peak=${slot.peak}, activeMs=${slot.activeMs}.`,
      );
    }
  }
}

function readWavSlotStats(filePath) {
  const buffer = fs.readFileSync(filePath);
  let offset = 12;
  let sampleRate = null;
  let channels = null;
  let bitsPerSample = null;
  let data = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    }
    if (chunkId === 'data') {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || channels !== 1 || bitsPerSample !== 16 || !data) {
    throw new Error(`Invalid countdown WAV file: ${filePath}`);
  }

  const bytesPerSample = bitsPerSample / 8;
  return [5, 4, 3, 2, 1].map((digit, index) => {
    const startByte = Math.round((index + 0.05) * sampleRate) * bytesPerSample;
    const endByte = Math.round((index + 0.95) * sampleRate) * bytesPerSample;
    let sumSquares = 0;
    let samples = 0;
    let peak = 0;
    let activeSamples = 0;

    for (let byte = startByte; byte < Math.min(endByte, data.length); byte += bytesPerSample) {
      const value = data.readInt16LE(byte);
      const absolute = Math.abs(value);
      sumSquares += value * value;
      samples += 1;
      peak = Math.max(peak, absolute);
      if (absolute > 260) activeSamples += 1;
    }

    return {
      digit,
      rms: Math.round(Math.sqrt(sumSquares / Math.max(1, samples))),
      peak,
      activeMs: Math.round((activeSamples / sampleRate) * 1000),
    };
  });
}
