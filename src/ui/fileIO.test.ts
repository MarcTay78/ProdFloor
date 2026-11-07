import { expect, test } from 'vitest';
import { base64ToBuffer, bufferToBase64, safeFilename } from './fileIO';

test('base64 round trip', () => {
  const b64 = bufferToBase64(new TextEncoder().encode('hello').buffer as ArrayBuffer);
  expect(b64).toBe('aGVsbG8=');
  expect(new TextDecoder().decode(base64ToBuffer(b64))).toBe('hello');
});

test('safeFilename', () => expect(safeFilename('Plant A/B: v2')).toBe('Plant A_B_ v2'));
