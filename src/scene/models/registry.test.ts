import { expect, test } from 'vitest';
import { CATALOGUE } from '../../domain/catalogue';
import { MODELS, MODEL_LABELS, getModel } from './index';

test('every catalogue model key has a registered model and label', () => {
  for (const t of CATALOGUE) {
    expect(MODELS[t.model], t.model).toBeTypeOf('function');
    expect(MODEL_LABELS[t.model], t.model).toBeTypeOf('string');
  }
});

test('unknown key falls back to generic', () => {
  expect(getModel('does-not-exist')).toBe(MODELS.generic);
});
