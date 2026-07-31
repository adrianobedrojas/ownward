/**
 * Unified Storage Quota Service
 *
 * Enforces the combined 50 GB Pro storage quota across:
 * - Owner document Vault
 * - Seller-owned Deal Room files
 * - Generated templates
 * - Other user-owned stored artifacts
 *
 * Soft-deleted files are excluded from quota calculations.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StorageBreakdown = {
  vaultBytes: number;
  dealRoomBytes: number;
  templateBytes: number;
  otherBytes: number;
  totalBytes: number;
};

export type StorageByBusiness = {
  businessId: string;
  businessName: string;
  bytes: number;
};

export type StorageQuotaStatus = {
  breakdown: StorageBreakdown;
  quotaBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercent: number;
  alertLevel: "none" | "warning" | "critical" | "exceeded";
  alertMessage: string | null;
  byBusiness: StorageByBusiness[];
};

// ─── Alert thresholds ─────────────────────────────────────────────────────────

const WARNING_THRESHOLD = 0.75; // 75%
const CRITICAL_THRESHOLD = 0.9; // 90%

// ─── Quota computation ───────────────────────────────────────────────────────

/**
 * Computes the storage quota status given usage data.
 * Excludes soft-deleted files (caller must filter them out before passing).
 */
export function computeStorageQuotaStatus(
  breakdown: StorageBreakdown,
  quotaBytes: number,
  byBusiness: StorageByBusiness[] = []
): StorageQuotaStatus {
  const usedBytes = breakdown.totalBytes;
  const freeBytes = Math.max(0, quotaBytes - usedBytes);
  const usedPercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

  let alertLevel: StorageQuotaStatus["alertLevel"] = "none";
  let alertMessage: string | null = null;

  if (usedPercent >= 100) {
    alertLevel = "exceeded";
    alertMessage =
      "Storage quota exceeded. Uploads are blocked. Delete files or upgrade your plan.";
  } else if (usedPercent >= CRITICAL_THRESHOLD * 100) {
    alertLevel = "critical";
    alertMessage = `You are using ${usedPercent.toFixed(0)}% of your storage quota. Consider deleting unused files or upgrading your plan.`;
  } else if (usedPercent >= WARNING_THRESHOLD * 100) {
    alertLevel = "warning";
    alertMessage = `You are using ${usedPercent.toFixed(0)}% of your storage quota. Review your files to free up space.`;
  }

  return {
    breakdown,
    quotaBytes,
    usedBytes,
    freeBytes,
    usedPercent,
    alertLevel,
    alertMessage,
    byBusiness,
  };
}

// ─── Upload eligibility ───────────────────────────────────────────────────────

export type UploadEligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: string; alertLevel: StorageQuotaStatus["alertLevel"] };

/**
 * Checks whether an upload is allowed given current quota status and file size.
 *
 * Downgrade behavior:
 * - Existing files remain downloadable and deletable.
 * - New uploads are blocked if the user is over quota.
 * - No auto-deletion.
 */
export function checkUploadEligibility(
  status: StorageQuotaStatus,
  fileSizeBytes: number
): UploadEligibilityResult {
  if (status.usedBytes >= status.quotaBytes) {
    return {
      allowed: false,
      reason:
        "Storage quota exceeded. Delete existing files or upgrade your plan to upload new files.",
      alertLevel: "exceeded",
    };
  }

  if (status.usedBytes + fileSizeBytes > status.quotaBytes) {
    const neededMB = Math.ceil(fileSizeBytes / (1024 * 1024));
    const freeMB = Math.floor(status.freeBytes / (1024 * 1024));
    return {
      allowed: false,
      reason: `Uploading this file (${neededMB} MB) would exceed your storage quota. You have ${freeMB} MB remaining. Delete files or upgrade your plan.`,
      alertLevel: status.alertLevel === "none" ? "warning" : status.alertLevel,
    };
  }

  return { allowed: true };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

export function formatStorageQuotaSummary(status: StorageQuotaStatus): string {
  return `${formatBytes(status.usedBytes)} of ${formatBytes(status.quotaBytes)} used (${status.usedPercent.toFixed(0)}%)`;
}
