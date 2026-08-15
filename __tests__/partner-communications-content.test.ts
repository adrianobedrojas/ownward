import { partnerCommunicationsContent } from '@/lib/partner-communications-content';

describe('partner communications content', () => {
  it('uses valid section content paragraphs in EN and ES', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const section of partnerCommunicationsContent[locale].sections) {
        if (Array.isArray(section.content)) {
          expect(section.content.length).toBeGreaterThan(0);
          for (const paragraph of section.content) {
            expect(typeof paragraph).toBe('string');
            expect(paragraph.length).toBeGreaterThan(0);
          }
        } else {
          expect(typeof section.content).toBe('string');
          expect(section.content.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
