const { loadWorkoutTtsMessages } = require('./tts-catalog.cjs');

const messages = loadWorkoutTtsMessages();

for (const [index, message] of messages.entries()) {
  console.log(`${String(index + 1).padStart(2, '0')}. ${message}`);
}

console.log(`\n총 ${messages.length}개 문구`);
