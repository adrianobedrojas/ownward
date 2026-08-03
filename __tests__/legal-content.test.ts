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
    expect(allPrivacy).toContain('Google Analytics 4');
    expect(allPrivacy).toContain('strips fragments');
    expect(allPrivacy).toContain('https://policies.google.com/technologies/partner-sites');
    expect(allPrivacy).toContain('does not currently sell personal data');
  });

  it('does not contain draft or attorney-review language in terms notes', () => {
    expect(TERMS_CONTENT.en.note).not.toContain('Operational draft');
    expect(TERMS_CONTENT.en.note).not.toContain('attorney review');
    expect(TERMS_CONTENT.es.note).not.toContain('Borrador operativo');
    expect(TERMS_CONTENT.es.note).not.toContain('revisión legal');
  });

  it('uses the correct official contact email', () => {
    expect(LEGAL_OPERATOR.email).toBe('ownwardhub@gmail.com');
    expect(LEGAL_OPERATOR.email).not.toBe('ownward@gmail.com');
    expect(LEGAL_OPERATOR.email).not.toBe('ownward@gmail.con');
  });
});
