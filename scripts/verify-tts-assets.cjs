const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { loadWorkoutTtsMessages, rootDir } = require('./tts-catalog.cjs');

const COUNTDOWN_TRACK_MESSAGE = '5 4 3 2 1';
const COUNTDOWN_TRACK_SOURCE = path.join(
  rootDir,
  'src/assets/tts/ko-kr-chirp3-hd-aoede/00-countdown-5.wav',
);
const COUNTDOWN_MIN_SECONDS = 4.95;
const COUNTDOWN_MAX_SECONDS = 5.05;
const HD_VOICE_DIR_PATTERN = /^ko-kr-chirp3-hd-/;

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
    if (path.resolve(source) !== path.resolve(COUNTDOWN_TRACK_SOURCE)) {
      failures.push(`${voice.id} countdown track must use common Aoede asset, got: ${source}`);
      continue;
    }
    const durationSeconds = readWavDurationSeconds(source);
    if (durationSeconds < COUNTDOWN_MIN_SECONDS || durationSeconds > COUNTDOWN_MAX_SECONDS) {
      failures.push(
        `${voice.id} countdown track duration must be about 5.0s, got ${durationSeconds.toFixed(3)}s.`,
      );
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
