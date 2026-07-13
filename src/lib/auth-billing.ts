export const BILLING_METADATA_REFRESH_INTERVAL_MS = 60_000;

type BillingMetadataRefreshOptions = {
  isInitialSignIn: boolean;
  trigger?: string;
  checkedAt?: number;
  now?: number;
};

export function shouldRefreshBillingMetadata({
  isInitialSignIn,
  trigger,
  checkedAt,
  now = Date.now(),
}: BillingMetadataRefreshOptions): boolean {
  if (isInitialSignIn || trigger === "update") return true;
  if (typeof checkedAt !== "number" || !Number.isFinite(checkedAt)) return true;
  return now - checkedAt >= BILLING_METADATA_REFRESH_INTERVAL_MS;
}
