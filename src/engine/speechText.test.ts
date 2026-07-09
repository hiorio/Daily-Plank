import { describe, expect, it } from 'vitest';
import { polishSpeechMessage } from './speechText';

describe('polishSpeechMessage', () => {
  it('turns workout prompts into polite Korean speech', () => {
    expect(polishSpeechMessage('운동을 준비한다.')).toBe('운동을 준비해 주세요.');
    expect(polishSpeechMessage('첫 번째 동작은 니 플랭크이다.')).toBe(
      '첫 번째 동작은 니 플랭크입니다.',
    );
    expect(polishSpeechMessage('10초 남았다.')).toBe('10초 남았습니다.');
    expect(polishSpeechMessage('복부에 힘을 주고 몸을 길게 유지한다.')).toBe(
      '복부에 힘을 주고 몸을 길게 유지해 주세요.',
    );
    expect(polishSpeechMessage('호흡을 멈추지 않는다.')).toBe('호흡을 멈추지 말아 주세요.');
  });

  it('keeps countdown numbers short', () => {
    expect(polishSpeechMessage('3')).toBe('3');
  });
});
