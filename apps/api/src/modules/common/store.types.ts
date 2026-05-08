export type LedgerType = "reserve" | "settle" | "release" | "topup";

export interface UserRecord {
  id: string;
  email: string;
  password: string;
}

export interface MembershipRecord {
  userId: string;
  plan: "free" | "pro";
  expiresAt: string | null;
}

export interface CreditReservation {
  id: string;
  userId: string;
  amount: number;
  refJobId?: string;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  type: LedgerType;
  amount: number;
  reservationId?: string;
  refJobId?: string;
  createdAt: string;
}

export interface CreditBalance {
  available: number;
  reserved: number;
  total: number;
}

export interface RenderJobSnapshot {
  id: string;
  workflowId: string;
  userId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  estimatedCredits: number;
  reservationId?: string;
  steps: Array<{ id: string; kind: string; nodeId: string }>;
  createdAt: string;
}

export interface Store {
  register(email: string, password: string): Promise<UserRecord>;
  login(email: string, password: string): Promise<UserRecord>;
  getMembership(userId: string): Promise<MembershipRecord>;
  setMembership(userId: string, plan: "free" | "pro", expiresAt: string | null): Promise<MembershipRecord>;
  getBalance(userId: string): Promise<CreditBalance>;
  reserve(
    userId: string,
    amount: number,
    refJobId?: string,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditReservation>;
  settle(
    userId: string,
    reservationId: string,
    amount: number,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry>;
  release(
    userId: string,
    reservationId: string,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry>;
  getLedger(userId: string): Promise<CreditLedgerEntry[]>;
  getRenderJobByIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash?: string
  ): Promise<RenderJobSnapshot | null>;
  saveRenderJobIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    job: RenderJobSnapshot
  ): Promise<void>;
  cleanupIdempotencyRecords(olderThanIso: string): Promise<number>;
}
