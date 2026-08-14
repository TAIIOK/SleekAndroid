import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('expo-intent-launcher', () => ({}));

import { parseSpeechRecognitionResults } from './tvVoiceSearch';

describe('parseSpeechRecognitionResults', () => {
  it('reads the first string from an ArrayList extra', () => {
    expect(
      parseSpeechRecognitionResults({
        'android.speech.extra.RESULTS': ['Наруто', 'наруто'],
      }),
    ).toBe('Наруто');
  });

  it('reads a single string extra', () => {
    expect(
      parseSpeechRecognitionResults({
        'android.speech.extra.RESULTS': '  атака титанов  ',
      }),
    ).toBe('атака титанов');
  });

  it('parses a JSON array string', () => {
    expect(
      parseSpeechRecognitionResults({
        'android.speech.extra.RESULTS': '["one punch man"]',
      }),
    ).toBe('one punch man');
  });

  it('reads numeric-key maps from Bundle conversion', () => {
    expect(
      parseSpeechRecognitionResults({
        'android.speech.extra.RESULTS': { '0': 'bleach', '1': 'bleach movie' },
      }),
    ).toBe('bleach');
  });

  it('falls back to RESULTS without the android prefix', () => {
    expect(parseSpeechRecognitionResults({ RESULTS: ['death note'] })).toBe('death note');
  });

  it('returns null for empty or invalid extras', () => {
    expect(parseSpeechRecognitionResults(null)).toBeNull();
    expect(parseSpeechRecognitionResults(undefined)).toBeNull();
    expect(parseSpeechRecognitionResults({})).toBeNull();
    expect(parseSpeechRecognitionResults({ 'android.speech.extra.RESULTS': [] })).toBeNull();
    expect(parseSpeechRecognitionResults({ 'android.speech.extra.RESULTS': '   ' })).toBeNull();
    expect(parseSpeechRecognitionResults({ 'android.speech.extra.RESULTS': [''] })).toBeNull();
  });
});
