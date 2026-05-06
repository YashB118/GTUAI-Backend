/**
 * Lightweight coin event bus — no context overhead.
 * Any page that earns coins calls notifyCoinsEarned(newBalance).
 * CoinBalance + StreakBadge in Topbar listen and update instantly.
 */

export function notifyCoinsEarned(balance: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("coins:updated", { detail: { balance } }));
}

export function notifyStreakUpdated(streak: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("streak:updated", { detail: { streak } }));
}
