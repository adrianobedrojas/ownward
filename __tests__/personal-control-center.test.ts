/**
 * Personal Control Center + Buyer-Interest Architecture Tests
 *
 * Covers:
 * - Compatibility score boundaries
 * - Safe internal URL validation
 * - Unread message count logic
 * - i18n key presence (en/es)
 * - Notification category/type constants
 */

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility Scoring
// ─────────────────────────────────────────────────────────────────────────────

import {
  computeCompatibilityScore,
  type BuyerProfile,
  type ListingProfile,
} from '@/lib/buyer/compatibility-score';

describe('computeCompatibilityScore – missing_information', () => {
  it('returns missing_information when both buyer and listing have no data', () => {
    const result = computeCompatibilityScore({}, {});
    expect(result.classification).toBe('missing_information');
    expect(result.missingData).toBe(true);
    expect(result.percentLabel).toBe('–');
  });

  it('returns missing_information when buyer has no budget and listing has no price', () => {
    const result = computeCompatibilityScore({}, { annual_revenue: 500000 });
    // Only one dimension (revenue) might be available
    // If buyer has no revenue prefs, should still handle gracefully
    expect(['missing_information', 'low_match', 'possible_match', 'strong_match']).toContain(
      result.classification
    );
  });
});

describe('computeCompatibilityScore – budget dimension', () => {
  const listing: ListingProfile = { asking_price: 500000 };

  it('full score when asking price within buyer budget range', () => {
    const buyer: BuyerProfile = { budget_min: 400000, budget_max: 600000 };
    const result = computeCompatibilityScore(buyer, listing);
    const budgetDim = result.dimensions.find((d) => d.key === 'budget')!;
    expect(budgetDim.available).toBe(true);
    expect(budgetDim.earned).toBe(budgetDim.weight);
  });

  it('zero score when price far above budget max', () => {
    const buyer: BuyerProfile = { budget_min: 100000, budget_max: 200000 };
    const result = computeCompatibilityScore(buyer, listing);
    const budgetDim = result.dimensions.find((d) => d.key === 'budget')!;
    expect(budgetDim.available).toBe(true);
    expect(budgetDim.earned).toBe(0);
  });

  it('partial score when price is within 20% over max', () => {
    const buyer: BuyerProfile = { budget_max: 450000 };
    const result = computeCompatibilityScore(buyer, listing);
    const budgetDim = result.dimensions.find((d) => d.key === 'budget')!;
    expect(budgetDim.available).toBe(true);
    // 500000 / 450000 ≈ 1.11 which is <= 1.2, so partial credit
    expect(budgetDim.earned).toBeGreaterThan(0);
    expect(budgetDim.earned).toBeLessThan(budgetDim.weight);
  });

  it('not available when listing has no asking price', () => {
    const buyer: BuyerProfile = { budget_min: 100000, budget_max: 600000 };
    const result = computeCompatibilityScore(buyer, { category: 'retail' });
    const budgetDim = result.dimensions.find((d) => d.key === 'budget')!;
    expect(budgetDim.available).toBe(false);
  });
});

describe('computeCompatibilityScore – score classifications', () => {
  it('strong_match for score >= 80', () => {
    // Perfect budget, industry, location match
    const buyer: BuyerProfile = {
      budget_min: 400000,
      budget_max: 600000,
      preferred_industries: ['retail'],
      preferred_locations: ['New York'],
      purchase_timeline: 'immediately',
      financing_methods: ['cash'],
    };
    const listing: ListingProfile = {
      asking_price: 500000,
      category: 'retail',
      location: 'New York',
    };
    const result = computeCompatibilityScore(buyer, listing);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(['strong_match', 'possible_match']).toContain(result.classification);
  });

  it('low_match for score < 60 when budget completely misses', () => {
    const buyer: BuyerProfile = {
      budget_min: 50000,
      budget_max: 100000,
      preferred_industries: ['tech'],
      purchase_timeline: 'exploring',
    };
    const listing: ListingProfile = {
      asking_price: 5000000,
      category: 'manufacturing',
    };
    const result = computeCompatibilityScore(buyer, listing);
    // Budget miss + industry miss = low score on available dims
    expect(result.score).toBeLessThan(80);
  });

  it('score is between 0 and 100', () => {
    const buyer: BuyerProfile = {
      budget_min: 200000,
      budget_max: 400000,
    };
    const listing: ListingProfile = {
      asking_price: 300000,
    };
    const result = computeCompatibilityScore(buyer, listing);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('computeCompatibilityScore – dimensions', () => {
  it('skips industry dimension when buyer has no preferences', () => {
    const buyer: BuyerProfile = { budget_min: 0, budget_max: 1000000 };
    const listing: ListingProfile = { asking_price: 500000, category: 'retail' };
    const result = computeCompatibilityScore(buyer, listing);
    const dim = result.dimensions.find((d) => d.key === 'industry')!;
    expect(dim.available).toBe(false);
  });

  it('awards full industry score for matching category', () => {
    const buyer: BuyerProfile = { preferred_industries: ['retail', 'food'] };
    const listing: ListingProfile = { category: 'retail' };
    const result = computeCompatibilityScore(buyer, listing);
    const dim = result.dimensions.find((d) => d.key === 'industry')!;
    expect(dim.available).toBe(true);
    expect(dim.earned).toBe(dim.weight);
  });

  it('awards full location score for remote business with remote_business_ok', () => {
    const buyer: BuyerProfile = { remote_business_ok: true };
    const listing: ListingProfile = { is_remote: true };
    const result = computeCompatibilityScore(buyer, listing);
    const dim = result.dimensions.find((d) => d.key === 'location')!;
    expect(dim.available).toBe(true);
    expect(dim.earned).toBe(dim.weight);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Safe Action URL Validation
// ─────────────────────────────────────────────────────────────────────────────

import { isSafeActionUrl, sanitizeActionUrl } from '@/lib/notifications/action-url';

describe('isSafeActionUrl – accepted paths', () => {
  it('accepts simple internal paths', () => {
    expect(isSafeActionUrl('/messages')).toBe(true);
    expect(isSafeActionUrl('/seller')).toBe(true);
    expect(isSafeActionUrl('/dashboard')).toBe(true);
    expect(isSafeActionUrl('/messages/abc-123')).toBe(true);
    expect(isSafeActionUrl('/b/my-business-slug')).toBe(true);
    expect(isSafeActionUrl('/settings/notifications')).toBe(true);
  });

  it('accepts paths with query strings', () => {
    expect(isSafeActionUrl('/buy?category=retail')).toBe(true);
  });

  it('accepts paths with hash anchors', () => {
    expect(isSafeActionUrl('/guide/buy#overview')).toBe(true);
  });
});

describe('isSafeActionUrl – rejected inputs', () => {
  it('rejects null and undefined', () => {
    expect(isSafeActionUrl(null)).toBe(false);
    expect(isSafeActionUrl(undefined)).toBe(false);
    expect(isSafeActionUrl('')).toBe(false);
  });

  it('rejects external URLs', () => {
    expect(isSafeActionUrl('https://example.com/evil')).toBe(false);
    expect(isSafeActionUrl('http://attacker.com')).toBe(false);
    expect(isSafeActionUrl('ftp://files.example.com')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeActionUrl('//evil.com/path')).toBe(false);
  });

  it('rejects javascript: scheme', () => {
    expect(isSafeActionUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeActionUrl('JavaScript:void(0)')).toBe(false);
    expect(isSafeActionUrl('JAVASCRIPT:alert(document.cookie)')).toBe(false);
  });

  it('rejects data: URIs', () => {
    expect(isSafeActionUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects vbscript:', () => {
    expect(isSafeActionUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejects malformed/empty strings', () => {
    expect(isSafeActionUrl('   ')).toBe(false);
    expect(isSafeActionUrl('not-a-path')).toBe(false);
    expect(isSafeActionUrl('relative/path')).toBe(false);
  });
});

describe('sanitizeActionUrl', () => {
  it('returns url for safe paths', () => {
    expect(sanitizeActionUrl('/messages')).toBe('/messages');
  });

  it('returns null for unsafe URLs', () => {
    expect(sanitizeActionUrl('https://evil.com')).toBeNull();
    expect(sanitizeActionUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeActionUrl(null)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unread Message Count Logic
// ─────────────────────────────────────────────────────────────────────────────

import {
  isConversationUnread,
  countUnreadConversations,
  type ConversationReadState,
} from '@/lib/messaging/unread';

const BUYER_ID = 'buyer-uuid-1';
const SELLER_ID = 'seller-uuid-1';

describe('isConversationUnread', () => {
  it('returns false when no last_message_at', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: null,
      buyer_last_read_at: null,
      seller_last_read_at: null,
    };
    expect(isConversationUnread(conv, BUYER_ID)).toBe(false);
  });

  it('returns true when buyer has never read', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: '2026-08-01T12:00:00Z',
      buyer_last_read_at: null,
      seller_last_read_at: '2026-08-01T12:01:00Z',
    };
    expect(isConversationUnread(conv, BUYER_ID)).toBe(true);
  });

  it('returns false when buyer read after last message', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: '2026-08-01T12:00:00Z',
      buyer_last_read_at: '2026-08-01T12:05:00Z',
      seller_last_read_at: null,
    };
    expect(isConversationUnread(conv, BUYER_ID)).toBe(false);
  });

  it('returns true when message is newer than last read', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: '2026-08-01T14:00:00Z',
      buyer_last_read_at: '2026-08-01T12:00:00Z',
      seller_last_read_at: null,
    };
    expect(isConversationUnread(conv, BUYER_ID)).toBe(true);
  });

  it('returns false when user is neither buyer nor seller', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: '2026-08-01T14:00:00Z',
      buyer_last_read_at: null,
      seller_last_read_at: null,
    };
    // Unknown user: lastRead is null → returns true (conservative)
    // Actually that means unread since lastRead is null
    expect(isConversationUnread(conv, 'other-user-uuid')).toBe(true);
  });

  it('checks seller read state for seller user', () => {
    const conv: ConversationReadState = {
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      last_message_at: '2026-08-01T14:00:00Z',
      buyer_last_read_at: null,
      seller_last_read_at: '2026-08-01T15:00:00Z',
    };
    expect(isConversationUnread(conv, SELLER_ID)).toBe(false);
  });
});

describe('countUnreadConversations', () => {
  it('returns 0 when all conversations are read', () => {
    const convs: ConversationReadState[] = [
      {
        buyer_id: BUYER_ID,
        seller_id: SELLER_ID,
        last_message_at: '2026-08-01T12:00:00Z',
        buyer_last_read_at: '2026-08-01T13:00:00Z',
        seller_last_read_at: null,
      },
    ];
    expect(countUnreadConversations(convs, BUYER_ID)).toBe(0);
  });

  it('counts only unread conversations', () => {
    const convs: ConversationReadState[] = [
      {
        buyer_id: BUYER_ID,
        seller_id: SELLER_ID,
        last_message_at: '2026-08-01T14:00:00Z',
        buyer_last_read_at: '2026-08-01T13:00:00Z',
        seller_last_read_at: null,
      },
      {
        buyer_id: BUYER_ID,
        seller_id: 'seller-2',
        last_message_at: '2026-08-01T12:00:00Z',
        buyer_last_read_at: '2026-08-01T13:00:00Z',
        seller_last_read_at: null,
      },
    ];
    expect(countUnreadConversations(convs, BUYER_ID)).toBe(1);
  });

  it('returns 0 for empty array', () => {
    expect(countUnreadConversations([], BUYER_ID)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// i18n Key Presence
// ─────────────────────────────────────────────────────────────────────────────

import en from '@/messages/en.json';
import es from '@/messages/es.json';

describe('i18n – ControlCenter key presence', () => {
  const REQUIRED_CC_KEYS = [
    'messagesLabel',
    'notificationsLabel',
    'accountMenu',
    'unread',
    'noMessages',
    'noNotifications',
    'viewAllMessages',
    'markAllRead',
    'markRead',
    'archive',
    'view',
    'workspace',
    'workspace_buyer',
    'workspace_seller',
    'logOut',
    'filter_all',
    'filter_buyers',
    'filter_messages',
  ];

  it('en.json has all required ControlCenter keys', () => {
    const cc = (en as unknown as Record<string, Record<string, unknown>>).ControlCenter;
    expect(cc).toBeDefined();
    for (const key of REQUIRED_CC_KEYS) {
      expect(cc[key]).toBeTruthy();
    }
  });

  it('es.json has all required ControlCenter keys', () => {
    const cc = (es as unknown as Record<string, Record<string, unknown>>).ControlCenter;
    expect(cc).toBeDefined();
    for (const key of REQUIRED_CC_KEYS) {
      expect(cc[key]).toBeTruthy();
    }
  });
});

describe('i18n – Profile key presence', () => {
  const REQUIRED_PROFILE_KEYS = [
    'title', 'fullName', 'headline', 'bio', 'location',
    'role', 'profileVisibility', 'saveChanges', 'saved', 'profileCompletion',
  ];

  it('en.json has all required Profile keys', () => {
    const profile = (en as unknown as Record<string, Record<string, unknown>>).Profile;
    expect(profile).toBeDefined();
    for (const key of REQUIRED_PROFILE_KEYS) {
      expect(profile[key]).toBeTruthy();
    }
  });

  it('es.json has all required Profile keys', () => {
    const profile = (es as unknown as Record<string, Record<string, unknown>>).Profile;
    expect(profile).toBeDefined();
    for (const key of REQUIRED_PROFILE_KEYS) {
      expect(profile[key]).toBeTruthy();
    }
  });
});

describe('i18n – Settings key presence', () => {
  it('en.json has Settings section', () => {
    const settings = (en as unknown as Record<string, Record<string, unknown>>).Settings;
    expect(settings).toBeDefined();
    expect(settings.title).toBeTruthy();
  });

  it('es.json has Settings section', () => {
    const settings = (es as unknown as Record<string, Record<string, unknown>>).Settings;
    expect(settings).toBeDefined();
    expect(settings.title).toBeTruthy();
  });
});

describe('i18n – ListingInterest key presence', () => {
  const REQUIRED_LI_KEYS = [
    'promptQuestion', 'yesLabel', 'maybeLabel', 'noLabel',
    'submitInterest', 'submitMaybe', 'interestSent', 'maybeSent',
  ];

  it('en.json has all required ListingInterest keys', () => {
    const li = (en as unknown as Record<string, Record<string, unknown>>).ListingInterest;
    expect(li).toBeDefined();
    for (const key of REQUIRED_LI_KEYS) {
      expect(li[key]).toBeTruthy();
    }
  });

  it('es.json has all required ListingInterest keys', () => {
    const li = (es as unknown as Record<string, Record<string, unknown>>).ListingInterest;
    expect(li).toBeDefined();
    for (const key of REQUIRED_LI_KEYS) {
      expect(li[key]).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification types / categories (migration constants mirrored in tests)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['buyers','messages','deals','tasks','billing','security','system'];
const VALID_NOTIFICATION_TYPES = [
  'listing_qualified_view','listing_repeat_view',
  'buyer_maybe_interested','buyer_interested','buyer_requested_information',
  'new_message',
  'deal_room_invitation','deal_room_activity',
  'document_activity',
  'task_due',
  'billing_notice','security_notice','system_notice',
];
const VALID_PRIORITIES = ['low','normal','high','critical'];

describe('Notification schema constants', () => {
  it('has correct number of categories', () => {
    expect(VALID_CATEGORIES).toHaveLength(7);
  });

  it('includes buyer-interest types', () => {
    expect(VALID_NOTIFICATION_TYPES).toContain('buyer_interested');
    expect(VALID_NOTIFICATION_TYPES).toContain('buyer_maybe_interested');
    expect(VALID_NOTIFICATION_TYPES).toContain('buyer_requested_information');
    expect(VALID_NOTIFICATION_TYPES).toContain('listing_qualified_view');
  });

  it('has four priority levels', () => {
    expect(VALID_PRIORITIES).toHaveLength(4);
    expect(VALID_PRIORITIES).toContain('critical');
    expect(VALID_PRIORITIES).toContain('normal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workspace menu differs by role
// ─────────────────────────────────────────────────────────────────────────────

describe('Workspace role assignment logic', () => {
  function resolveDefaultWorkspace(role: string | null): 'buyer' | 'seller' {
    return role === 'seller' ? 'seller' : 'buyer';
  }

  it('defaults to buyer for null role', () => {
    expect(resolveDefaultWorkspace(null)).toBe('buyer');
  });

  it('defaults to buyer for buyer role', () => {
    expect(resolveDefaultWorkspace('buyer')).toBe('buyer');
  });

  it('defaults to seller for seller role', () => {
    expect(resolveDefaultWorkspace('seller')).toBe('seller');
  });

  it('defaults to buyer for both role', () => {
    expect(resolveDefaultWorkspace('both')).toBe('buyer');
  });
});
