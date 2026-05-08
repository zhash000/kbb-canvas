/**
 * Ledger entry kinds for credits / membership accounting (placeholder).
 */
export type LedgerEntryKind = "reserve" | "settle" | "release" | "topup";

export interface CreditReservation {
  id: string;
  userId: string;
  amountCredits: number;
}
