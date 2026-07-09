import { COUNTDOWN_TRACK_MESSAGE } from '../domain/countdown';

const exactPoliteSentences = new Map<string, string>([
  ['운동을 준비한다', '운동을 준비해 주세요.'],
  ['운동을 마무리한다', '운동을 마무리해 주세요.'],
  ['운동을 완료했다', '운동이 완료되었습니다.'],
  ['휴식한다', '잠시 쉬어 주세요.'],
  ['잠시 쉰다', '잠시 쉬어 주세요.'],
  ['호흡을 고른다', '호흡을 가다듬어 주세요.'],
  ['자세를 안정적으로 유지한다', '자세를 안정적으로 유지해 주세요.'],
  ['호흡을 멈추지 않는다', '호흡을 멈추지 말아 주세요.'],
]);

type EndingRule = {
  pattern: RegExp;
  replace: (match: RegExpMatchArray) => string;
};

const politeEndingRules: EndingRule[] = [
  {
    pattern: /^(.+)까지 ([0-9]+)초 남았다$/,
    replace: (match) => `${match[1]}까지 ${match[2]}초 남았습니다.`,
  },
  {
    pattern: /^([0-9]+)초 남았다$/,
    replace: (match) => `${match[1]}초 남았습니다.`,
  },
  {
    pattern: /^마지막 ([0-9]+)초이다$/,
    replace: (match) => `마지막 ${match[1]}초입니다.`,
  },
  {
    pattern: /^([0-9]+)초 휴식한다$/,
    replace: (match) => `${match[1]}초 쉬어 주세요.`,
  },
  {
    pattern: /^(.+)이다$/,
    replace: (match) => `${match[1]}입니다.`,
  },
  {
    pattern: /^(.+)을 시작한다$/,
    replace: (match) => `${match[1]}을 시작해 주세요.`,
  },
  {
    pattern: /^(.+)를 시작한다$/,
    replace: (match) => `${match[1]}를 시작해 주세요.`,
  },
  {
    pattern: /^(.+)을 준비한다$/,
    replace: (match) => `${match[1]}을 준비해 주세요.`,
  },
  {
    pattern: /^(.+)를 준비한다$/,
    replace: (match) => `${match[1]}를 준비해 주세요.`,
  },
  {
    pattern: /^(.+)지 않는다$/,
    replace: (match) => `${match[1]}지 말아 주세요.`,
  },
  {
    pattern: /^(.+) 않게 한다$/,
    replace: (match) => `${match[1]} 않게 해 주세요.`,
  },
  {
    pattern: /^(.+) 힘을 준다$/,
    replace: (match) => `${match[1]} 힘을 주세요.`,
  },
  {
    pattern: /^(.+) 만든다$/,
    replace: (match) => `${match[1]} 만들어 주세요.`,
  },
  {
    pattern: /^(.+) 세운다$/,
    replace: (match) => `${match[1]} 세워 주세요.`,
  },
  {
    pattern: /^(.+) 밀어낸다$/,
    replace: (match) => `${match[1]} 밀어내 주세요.`,
  },
  {
    pattern: /^(.+) 향한다$/,
    replace: (match) => `${match[1]} 향해 주세요.`,
  },
  {
    pattern: /^(.+) 줄인다$/,
    replace: (match) => `${match[1]} 줄여 주세요.`,
  },
  {
    pattern: /^(.+) 움직인다$/,
    replace: (match) => `${match[1]} 움직여 주세요.`,
  },
  {
    pattern: /^(.+) 둔다$/,
    replace: (match) => `${match[1]} 둬 주세요.`,
  },
  {
    pattern: /^(.+) 올린다$/,
    replace: (match) => `${match[1]} 올려 주세요.`,
  },
  {
    pattern: /^(.+)한다$/,
    replace: (match) => `${match[1]}해 주세요.`,
  },
];

export function polishSpeechMessage(message: string): string {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return '';
  if (trimmedMessage === COUNTDOWN_TRACK_MESSAGE) return trimmedMessage;
  if (/^[0-9]+$/.test(trimmedMessage)) return trimmedMessage;

  const sentences = trimmedMessage.match(/[^.!?]+[.!?]?/g) ?? [trimmedMessage];
  return sentences
    .map((sentence) => polishSentence(sentence.trim()))
    .filter(Boolean)
    .join(' ');
}

function polishSentence(sentence: string): string {
  if (!sentence) return '';
  if (/^[0-9]+$/.test(sentence)) return sentence;

  const cleanSentence = sentence.replace(/[.!?]+$/, '').trim();
  if (!cleanSentence) return '';

  const exactSentence = exactPoliteSentences.get(cleanSentence);
  if (exactSentence) return exactSentence;

  for (const rule of politeEndingRules) {
    const match = cleanSentence.match(rule.pattern);
    if (match) return rule.replace(match);
  }

  return `${cleanSentence}.`;
}
