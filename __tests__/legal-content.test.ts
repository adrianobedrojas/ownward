import { LEGAL_OPERATOR, PRIVACY_CONTENT, TERMS_CONTENT } from '@/lib/legal-content';

describe('legal content', () => {
  it('contains 29 structured terms sections in EN and ES', () => {
    expect(TERMS_CONTENT.en.sections).toHaveLength(29);
    expect(TERMS_CONTENT.es.sections).toHaveLength(29);
  });

  it('contains required operator and venue/legal disclaimers', () => {
    const allTerms = TERMS_CONTENT.en.sections.flatMap((section) => [...(section.body ?? []), ...(section.bullets ?? [])]).join(' ');
    expect(allTerms).toContain(LEGAL_OPERATOR.name);
    expect(allTerms).toContain('not a buyer or seller');
    expect(allTerms).toContain('No mandatory arbitration or class-action waiver');
    expect(allTerms).toContain('Travis County');
    expect(allTerms).toContain('Western District of Texas');
  });

  it('contains required privacy provider and analytics disclosures', () => {
    const allPrivacy = PRIVACY_CONTENT.en.sections.flatMap((section) => [...(section.body ?? []), ...(section.bullets ?? [])]).join(' ');
    expect(allPrivacy).toContain('Supabase');
    expect(allPrivacy).toContain('Stripe');
    expect(allPrivacy).toContain('Vercel');
    expect(allPrivacy).toContain('strips query/hash');
    expect(allPrivacy).toContain('does not currently sell personal data');
  });
});
