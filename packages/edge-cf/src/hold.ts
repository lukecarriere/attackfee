// Held-balance ceiling for the stored proofs (custody at one mint). No automatic payout: crossing
// the ceiling only sets `over_hold` on the owner balance and logs one line per UTC day.

/** Default ceiling: 5,000 sats. Override with the CASHU_HOLD_ALERT_MSAT var. */
export const HOLD_ALERT_DEFAULT_MSAT = 5_000_000;

/** The configured ceiling in msat; a missing or unusable value is the default. */
export function holdThreshold(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return HOLD_ALERT_DEFAULT_MSAT;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : HOLD_ALERT_DEFAULT_MSAT;
}

/**
 * `over` when `availableMsat` is at or above `thresholdMsat`. `alert` when over and no alert was
 * logged yet on `today` (a UTC day as YYYYMMDD; `lastDay` is the day of the last alert, 0 for never).
 */
export function holdAlert(availableMsat: number, thresholdMsat: number, lastDay: number, today: number): { over: boolean; alert: boolean } {
  const over = availableMsat >= thresholdMsat;
  return { over, alert: over && lastDay !== today };
}
