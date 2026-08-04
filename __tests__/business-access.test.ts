/**
 * Business Access (RBAC) Tests
 *
 * Tests the centralized authorization helpers in lib/business-access.ts.
 * Uses mocked Supabase client - no real DB connections.
 */

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();
const mockMaybeSingle = jest.fn();

function chainMock(returnValue: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BIZ_ID = 'biz-001';
const OWNER_ID = 'user-owner';
const MANAGER_ID = 'user-manager';
const FINANCE_ID = 'user-finance';
const OPS_ID = 'user-ops';
const VIEWER_ID = 'user-viewer';
const UNRELATED_ID = 'user-unrelated';
const SUSPENDED_ID = 'user-suspended';

function setupMocks(
  userId: string,
  bizOwnerId: string,
  memberConfig: { role: string; status: string } | null
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'businesses') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: BIZ_ID, owner_id: bizOwnerId },
          error: null,
        }),
      };
    }
    if (table === 'business_members') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: memberConfig
            ? { id: 'mem-001', role: memberConfig.role, status: memberConfig.status }
            : null,
          error: null,
        }),
      };
    }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
  });
}

// ─── getBusinessAccess ────────────────────────────────────────────────────────

describe('getBusinessAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns owner access for the business owner', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { getBusinessAccess } = await import('@/lib/business-access');
    const access = await getBusinessAccess(OWNER_ID, BIZ_ID);
    expect(access?.role).toBe('owner');
    expect(access?.status).toBe('active');
  });

  it('returns member access for active manager', async () => {
    setupMocks(MANAGER_ID, OWNER_ID, { role: 'manager', status: 'active' });
    const { getBusinessAccess } = await import('@/lib/business-access');
    const access = await getBusinessAccess(MANAGER_ID, BIZ_ID);
    expect(access?.role).toBe('manager');
    expect(access?.status).toBe('active');
  });

  it('returns suspended status for suspended member', async () => {
    setupMocks(SUSPENDED_ID, OWNER_ID, { role: 'viewer', status: 'suspended' });
    const { getBusinessAccess } = await import('@/lib/business-access');
    const access = await getBusinessAccess(SUSPENDED_ID, BIZ_ID);
    expect(access?.status).toBe('suspended');
  });

  it('returns null for unrelated user', async () => {
    setupMocks(UNRELATED_ID, OWNER_ID, null);
    const { getBusinessAccess } = await import('@/lib/business-access');
    const access = await getBusinessAccess(UNRELATED_ID, BIZ_ID);
    expect(access).toBeNull();
  });
});

// ─── canViewBusiness ──────────────────────────────────────────────────────────

describe('canViewBusiness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can view business', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canViewBusiness } = await import('@/lib/business-access');
    expect(await canViewBusiness(OWNER_ID, BIZ_ID)).toBe(true);
  });

  it('active viewer can view business', async () => {
    setupMocks(VIEWER_ID, OWNER_ID, { role: 'viewer', status: 'active' });
    const { canViewBusiness } = await import('@/lib/business-access');
    expect(await canViewBusiness(VIEWER_ID, BIZ_ID)).toBe(true);
  });

  it('suspended member cannot view business', async () => {
    setupMocks(SUSPENDED_ID, OWNER_ID, { role: 'viewer', status: 'suspended' });
    const { canViewBusiness } = await import('@/lib/business-access');
    expect(await canViewBusiness(SUSPENDED_ID, BIZ_ID)).toBe(false);
  });

  it('unrelated user cannot view business', async () => {
    setupMocks(UNRELATED_ID, OWNER_ID, null);
    const { canViewBusiness } = await import('@/lib/business-access');
    expect(await canViewBusiness(UNRELATED_ID, BIZ_ID)).toBe(false);
  });
});

// ─── canEditBusiness ──────────────────────────────────────────────────────────

describe('canEditBusiness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can edit business', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canEditBusiness } = await import('@/lib/business-access');
    expect(await canEditBusiness(OWNER_ID, BIZ_ID)).toBe(true);
  });

  it('manager can edit business', async () => {
    setupMocks(MANAGER_ID, OWNER_ID, { role: 'manager', status: 'active' });
    const { canEditBusiness } = await import('@/lib/business-access');
    expect(await canEditBusiness(MANAGER_ID, BIZ_ID)).toBe(true);
  });

  it('finance cannot edit business', async () => {
    setupMocks(FINANCE_ID, OWNER_ID, { role: 'finance', status: 'active' });
    const { canEditBusiness } = await import('@/lib/business-access');
    expect(await canEditBusiness(FINANCE_ID, BIZ_ID)).toBe(false);
  });

  it('viewer cannot edit business', async () => {
    setupMocks(VIEWER_ID, OWNER_ID, { role: 'viewer', status: 'active' });
    const { canEditBusiness } = await import('@/lib/business-access');
    expect(await canEditBusiness(VIEWER_ID, BIZ_ID)).toBe(false);
  });
});

// ─── canManageTeam ────────────────────────────────────────────────────────────

describe('canManageTeam', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can manage team', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canManageTeam } = await import('@/lib/business-access');
    expect(await canManageTeam(OWNER_ID, BIZ_ID)).toBe(true);
  });

  it('manager cannot manage team', async () => {
    setupMocks(MANAGER_ID, OWNER_ID, { role: 'manager', status: 'active' });
    const { canManageTeam } = await import('@/lib/business-access');
    expect(await canManageTeam(MANAGER_ID, BIZ_ID)).toBe(false);
  });

  it('finance cannot manage team', async () => {
    setupMocks(FINANCE_ID, OWNER_ID, { role: 'finance', status: 'active' });
    const { canManageTeam } = await import('@/lib/business-access');
    expect(await canManageTeam(FINANCE_ID, BIZ_ID)).toBe(false);
  });

  it('suspended owner-equivalent has no team management', async () => {
    setupMocks(SUSPENDED_ID, OWNER_ID, { role: 'manager', status: 'suspended' });
    const { canManageTeam } = await import('@/lib/business-access');
    expect(await canManageTeam(SUSPENDED_ID, BIZ_ID)).toBe(false);
  });
});

// ─── canManageBilling ─────────────────────────────────────────────────────────

describe('canManageBilling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can manage billing', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canManageBilling } = await import('@/lib/business-access');
    expect(await canManageBilling(OWNER_ID, BIZ_ID)).toBe(true);
  });

  it('manager cannot manage billing', async () => {
    setupMocks(MANAGER_ID, OWNER_ID, { role: 'manager', status: 'active' });
    const { canManageBilling } = await import('@/lib/business-access');
    expect(await canManageBilling(MANAGER_ID, BIZ_ID)).toBe(false);
  });
});

// ─── canAccessFinance ─────────────────────────────────────────────────────────

describe('canAccessFinance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can write finance', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canAccessFinance } = await import('@/lib/business-access');
    expect(await canAccessFinance(OWNER_ID, BIZ_ID, 'write')).toBe(true);
  });

  it('finance can write finance', async () => {
    setupMocks(FINANCE_ID, OWNER_ID, { role: 'finance', status: 'active' });
    const { canAccessFinance } = await import('@/lib/business-access');
    expect(await canAccessFinance(FINANCE_ID, BIZ_ID, 'write')).toBe(true);
  });

  it('operations cannot write finance', async () => {
    setupMocks(OPS_ID, OWNER_ID, { role: 'operations', status: 'active' });
    const { canAccessFinance } = await import('@/lib/business-access');
    expect(await canAccessFinance(OPS_ID, BIZ_ID, 'write')).toBe(false);
  });

  it('viewer can read finance', async () => {
    setupMocks(VIEWER_ID, OWNER_ID, { role: 'viewer', status: 'active' });
    const { canAccessFinance } = await import('@/lib/business-access');
    expect(await canAccessFinance(VIEWER_ID, BIZ_ID, 'read')).toBe(true);
  });

  it('suspended member cannot read finance', async () => {
    setupMocks(SUSPENDED_ID, OWNER_ID, { role: 'finance', status: 'suspended' });
    const { canAccessFinance } = await import('@/lib/business-access');
    expect(await canAccessFinance(SUSPENDED_ID, BIZ_ID, 'read')).toBe(false);
  });
});

// ─── canAccessCRM ─────────────────────────────────────────────────────────────

describe('canAccessCRM', () => {
  beforeEach(() => jest.clearAllMocks());

  it('operations can write CRM', async () => {
    setupMocks(OPS_ID, OWNER_ID, { role: 'operations', status: 'active' });
    const { canAccessCRM } = await import('@/lib/business-access');
    expect(await canAccessCRM(OPS_ID, BIZ_ID, 'write')).toBe(true);
  });

  it('finance cannot write CRM', async () => {
    setupMocks(FINANCE_ID, OWNER_ID, { role: 'finance', status: 'active' });
    const { canAccessCRM } = await import('@/lib/business-access');
    expect(await canAccessCRM(FINANCE_ID, BIZ_ID, 'write')).toBe(false);
  });

  it('viewer can read CRM', async () => {
    setupMocks(VIEWER_ID, OWNER_ID, { role: 'viewer', status: 'active' });
    const { canAccessCRM } = await import('@/lib/business-access');
    expect(await canAccessCRM(VIEWER_ID, BIZ_ID, 'read')).toBe(true);
  });
});

// ─── canManageListings ────────────────────────────────────────────────────────

describe('canManageListings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owner can write listings', async () => {
    setupMocks(OWNER_ID, OWNER_ID, null);
    const { canManageListings } = await import('@/lib/business-access');
    expect(await canManageListings(OWNER_ID, BIZ_ID, 'write')).toBe(true);
  });

  it('finance cannot write listings', async () => {
    setupMocks(FINANCE_ID, OWNER_ID, { role: 'finance', status: 'active' });
    const { canManageListings } = await import('@/lib/business-access');
    expect(await canManageListings(FINANCE_ID, BIZ_ID, 'write')).toBe(false);
  });

  it('viewer can read listings', async () => {
    setupMocks(VIEWER_ID, OWNER_ID, { role: 'viewer', status: 'active' });
    const { canManageListings } = await import('@/lib/business-access');
    expect(await canManageListings(VIEWER_ID, BIZ_ID, 'read')).toBe(true);
  });
});
