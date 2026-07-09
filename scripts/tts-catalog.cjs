const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');
let tsHookInstalled = false;

function installTypeScriptHook() {
  if (tsHookInstalled) return;
  tsHookInstalled = true;
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

function loadWorkoutTtsMessages() {
  installTypeScriptHook();

  const { workoutSessions } = require(path.join(rootDir, 'src/data/sessionRepository.ts'));
  const messages = [];

  for (const session of workoutSessions) {
    for (const step of session.steps) {
      if (step.startMessage) messages.push(step.startMessage);
      for (const cue of step.cues ?? []) {
        if (cue.cueType === 'VOICE') messages.push(cue.message);
      }
    }
  }

  messages.push('음성 안내 테스트입니다. 운동 중에는 다음 동작과 남은 시간을 부드럽게 안내해 드립니다.');

  return [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
}

function voiceIdToDirectoryName(voiceName) {
  return voiceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function voiceIdToExportName(voiceName) {
  return `${voiceIdToDirectoryName(voiceName)
    .split('-')
    .map((part, index) => (index === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join('')}TtsAssets`;
}

module.exports = {
  loadWorkoutTtsMessages,
  rootDir,
  voiceIdToDirectoryName,
  voiceIdToExportName,
};
