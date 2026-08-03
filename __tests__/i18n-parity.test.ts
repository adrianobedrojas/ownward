import enRaw from '@/messages/en.json';
import esRaw from '@/messages/es.json';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getAllKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe('i18n translation parity', () => {
  const enKeys = new Set(getAllKeys(enRaw as Record<string, unknown>));
  const esKeys = new Set(getAllKeys(esRaw as Record<string, unknown>));

  it('has no keys present only in EN', () => {
    const onlyInEn = [...enKeys].filter((k) => !esKeys.has(k));
    expect(onlyInEn).toEqual([]);
  });

  it('has no keys present only in ES', () => {
    const onlyInEs = [...esKeys].filter((k) => !enKeys.has(k));
    expect(onlyInEs).toEqual([]);
  });

  it('includes Sell.resumeCta in both locales', () => {
    expect(enKeys.has('Sell.resumeCta')).toBe(true);
    expect(esKeys.has('Sell.resumeCta')).toBe(true);
  });

  it('includes Academy.start in both locales', () => {
    expect(enKeys.has('Academy.start')).toBe(true);
    expect(esKeys.has('Academy.start')).toBe(true);
  });
});
