/**
 * Storage Quota Tests
 */

import {
  computeStorageQuotaStatus,
  checkUploadEligibility,
  formatBytes,
  formatStorageQuotaSummary,
  type StorageBreakdown,
} from "@/lib/storage/quota";

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const makeBreakdown = (vaultBytes: number, dealRoomBytes = 0): StorageBreakdown => ({
  vaultBytes,
  dealRoomBytes,
  templateBytes: 0,
  otherBytes: 0,
  totalBytes: vaultBytes + dealRoomBytes,
});

describe("computeStorageQuotaStatus", () => {
  it("returns no alert when < 75% used", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(10 * GB), 50 * GB);
    expect(status.alertLevel).toBe("none");
    expect(status.alertMessage).toBeNull();
    expect(status.usedPercent).toBeCloseTo(20, 1);
  });

  it("returns warning alert at 75%", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(37.5 * GB), 50 * GB);
    expect(status.alertLevel).toBe("warning");
    expect(status.alertMessage).toBeTruthy();
  });

  it("returns critical alert at 90%", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(45 * GB), 50 * GB);
    expect(status.alertLevel).toBe("critical");
    expect(status.alertMessage).toContain("90%");
  });

  it("returns exceeded alert at 100%", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(50 * GB), 50 * GB);
    expect(status.alertLevel).toBe("exceeded");
    expect(status.alertMessage).toContain("exceeded");
  });

  it("freeBytes is 0 when exceeded", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(60 * GB), 50 * GB);
    expect(status.freeBytes).toBe(0);
    expect(status.alertLevel).toBe("exceeded");
  });

  it("computes breakdown correctly", () => {
    const breakdown: StorageBreakdown = {
      vaultBytes: 10 * GB,
      dealRoomBytes: 5 * GB,
      templateBytes: 100 * MB,
      otherBytes: 50 * MB,
      totalBytes: 10 * GB + 5 * GB + 100 * MB + 50 * MB,
    };
    const status = computeStorageQuotaStatus(breakdown, 50 * GB);
    expect(status.usedBytes).toBe(breakdown.totalBytes);
    expect(status.breakdown.vaultBytes).toBe(10 * GB);
    expect(status.breakdown.dealRoomBytes).toBe(5 * GB);
  });
});

describe("checkUploadEligibility", () => {
  it("allows upload within quota", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(10 * GB), 50 * GB);
    const result = checkUploadEligibility(status, 100 * MB);
    expect(result.allowed).toBe(true);
  });

  it("blocks upload when quota exceeded", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(50 * GB), 50 * GB);
    const result = checkUploadEligibility(status, 1);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.alertLevel).toBe("exceeded");
    }
  });

  it("blocks upload when it would exceed quota", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(49 * GB), 50 * GB);
    const result = checkUploadEligibility(status, 2 * GB); // would push to 51 GB
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("MB");
    }
  });

  it("allows upload exactly at quota boundary", () => {
    const freeBytes = 100 * MB;
    const status = computeStorageQuotaStatus(
      makeBreakdown(50 * GB - freeBytes),
      50 * GB
    );
    const result = checkUploadEligibility(status, freeBytes);
    expect(result.allowed).toBe(true);
  });
});

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats megabytes", () => {
    expect(formatBytes(500 * MB)).toBe("500 MB");
  });
  it("formats gigabytes", () => {
    expect(formatBytes(5 * GB)).toBe("5 GB");
  });
  it("formats fractional GB", () => {
    expect(formatBytes(1.5 * GB)).toContain("1.5");
  });
});

describe("formatStorageQuotaSummary", () => {
  it("returns a human-readable summary string", () => {
    const status = computeStorageQuotaStatus(makeBreakdown(10 * GB), 50 * GB);
    const summary = formatStorageQuotaSummary(status);
    expect(summary).toContain("of");
    expect(summary).toContain("%");
    expect(summary).toContain("GB");
  });
});
