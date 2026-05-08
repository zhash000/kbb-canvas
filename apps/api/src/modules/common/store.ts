import { randomUUID } from "node:crypto";

import type {
  CreditBalance,
  CreditLedgerEntry,
  CreditReservation,
  MembershipRecord,
  RenderJobSnapshot,
  Store,
  UserRecord,
} from "./store.types.js";

export class InMemoryStore implements Store {
  private usersByEmail = new Map<string, UserRecord>();
  private memberships = new Map<string, MembershipRecord>();
  private availableByUser = new Map<string, number>();
  private reservedByUser = new Map<string, number>();
  private reservations = new Map<string, CreditReservation>();
  private ledgers: CreditLedgerEntry[] = [];
  private reserveByKey = new Map<string, CreditReservation>();
  private reserveHashByKey = new Map<string, string>();
  private settleByKey = new Map<string, CreditLedgerEntry>();
  private settleHashByKey = new Map<string, string>();
  private releaseByKey = new Map<string, CreditLedgerEntry>();
  private releaseHashByKey = new Map<string, string>();
  private renderJobsByKey = new Map<string, RenderJobSnapshot>();
  private renderJobsHashByKey = new Map<string, string>();

  async register(email: string, password: string): Promise<UserRecord> {
    if (this.usersByEmail.has(email)) throw new Error("email_exists");

    const user: UserRecord = { id: randomUUID(), email, password };
    this.usersByEmail.set(email, user);
    this.memberships.set(user.id, { userId: user.id, plan: "free", expiresAt: null });
    this.availableByUser.set(user.id, 1000);
    this.reservedByUser.set(user.id, 0);
    this.ledgers.push({
      id: randomUUID(),
      userId: user.id,
      type: "topup",
      amount: 1000,
      createdAt: new Date().toISOString(),
    });
    return user;
  }

  async login(email: string, password: string): Promise<UserRecord> {
    const user = this.usersByEmail.get(email);
    if (!user || user.password !== password) throw new Error("invalid_credentials");
    return user;
  }

  async getMembership(userId: string): Promise<MembershipRecord> {
    return this.memberships.get(userId) ?? { userId, plan: "free", expiresAt: null };
  }

  async setMembership(
    userId: string,
    plan: "free" | "pro",
    expiresAt: string | null
  ): Promise<MembershipRecord> {
    const record: MembershipRecord = { userId, plan, expiresAt };
    this.memberships.set(userId, record);
    return record;
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    const available = this.availableByUser.get(userId) ?? 0;
    const reserved = this.reservedByUser.get(userId) ?? 0;
    return { available, reserved, total: available + reserved };
  }

  async reserve(
    userId: string,
    amount: number,
    refJobId?: string,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditReservation> {
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      const existing = this.reserveByKey.get(scopedKey);
      const existingHash = this.reserveHashByKey.get(scopedKey);
      if (existing && existingHash && requestHash && existingHash !== requestHash) {
        throw new Error("idempotency_key_reused_with_different_payload");
      }
      if (existing) return existing;
    }
    if (amount <= 0) throw new Error("invalid_amount");

    const available = this.availableByUser.get(userId) ?? 0;
    if (available < amount) throw new Error("insufficient_credits");

    const reservation: CreditReservation = {
      id: randomUUID(),
      userId,
      amount,
      refJobId,
      createdAt: new Date().toISOString(),
    };

    this.availableByUser.set(userId, available - amount);
    this.reservedByUser.set(userId, (this.reservedByUser.get(userId) ?? 0) + amount);
    this.reservations.set(reservation.id, reservation);
    this.ledgers.push({
      id: randomUUID(),
      userId,
      type: "reserve",
      amount,
      reservationId: reservation.id,
      refJobId,
      createdAt: new Date().toISOString(),
    });
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      this.reserveByKey.set(scopedKey, reservation);
      if (requestHash) this.reserveHashByKey.set(scopedKey, requestHash);
    }

    return reservation;
  }

  async settle(
    userId: string,
    reservationId: string,
    amount: number,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry> {
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      const existing = this.settleByKey.get(scopedKey);
      const existingHash = this.settleHashByKey.get(scopedKey);
      if (existing && existingHash && requestHash && existingHash !== requestHash) {
        throw new Error("idempotency_key_reused_with_different_payload");
      }
      if (existing) return existing;
    }
    if (amount <= 0) throw new Error("invalid_amount");

    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.userId !== userId) throw new Error("reservation_not_found");
    if (amount > reservation.amount) throw new Error("settle_amount_exceeds_reservation");

    const reserved = this.reservedByUser.get(userId) ?? 0;
    this.reservedByUser.set(userId, Math.max(0, reserved - reservation.amount));
    this.availableByUser.set(userId, (this.availableByUser.get(userId) ?? 0) + (reservation.amount - amount));
    this.reservations.delete(reservationId);

    const entry: CreditLedgerEntry = {
      id: randomUUID(),
      userId,
      type: "settle",
      amount,
      reservationId,
      refJobId: reservation.refJobId,
      createdAt: new Date().toISOString(),
    };
    this.ledgers.push(entry);

    if (reservation.amount > amount) {
      this.ledgers.push({
        id: randomUUID(),
        userId,
        type: "release",
        amount: reservation.amount - amount,
        reservationId,
        refJobId: reservation.refJobId,
        createdAt: new Date().toISOString(),
      });
    }
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      this.settleByKey.set(scopedKey, entry);
      if (requestHash) this.settleHashByKey.set(scopedKey, requestHash);
    }

    return entry;
  }

  async release(
    userId: string,
    reservationId: string,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry> {
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      const existing = this.releaseByKey.get(scopedKey);
      const existingHash = this.releaseHashByKey.get(scopedKey);
      if (existing && existingHash && requestHash && existingHash !== requestHash) {
        throw new Error("idempotency_key_reused_with_different_payload");
      }
      if (existing) return existing;
    }
    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.userId !== userId) throw new Error("reservation_not_found");

    const reserved = this.reservedByUser.get(userId) ?? 0;
    this.reservedByUser.set(userId, Math.max(0, reserved - reservation.amount));
    this.availableByUser.set(userId, (this.availableByUser.get(userId) ?? 0) + reservation.amount);
    this.reservations.delete(reservationId);

    const entry: CreditLedgerEntry = {
      id: randomUUID(),
      userId,
      type: "release",
      amount: reservation.amount,
      reservationId,
      refJobId: reservation.refJobId,
      createdAt: new Date().toISOString(),
    };
    this.ledgers.push(entry);
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      this.releaseByKey.set(scopedKey, entry);
      if (requestHash) this.releaseHashByKey.set(scopedKey, requestHash);
    }
    return entry;
  }

  async getLedger(userId: string): Promise<CreditLedgerEntry[]> {
    return this.ledgers.filter((entry) => entry.userId === userId);
  }

  async getRenderJobByIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash?: string
  ): Promise<RenderJobSnapshot | null> {
    const scopedKey = `${userId}:${idempotencyKey}`;
    const existing = this.renderJobsByKey.get(scopedKey) ?? null;
    const existingHash = this.renderJobsHashByKey.get(scopedKey);
    if (existing && existingHash && requestHash && existingHash !== requestHash) {
      throw new Error("idempotency_key_reused_with_different_payload");
    }
    return existing;
  }

  async saveRenderJobIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    job: RenderJobSnapshot
  ): Promise<void> {
    const scopedKey = `${userId}:${idempotencyKey}`;
    const existingHash = this.renderJobsHashByKey.get(scopedKey);
    if (existingHash && existingHash !== requestHash) {
      throw new Error("idempotency_key_reused_with_different_payload");
    }
    this.renderJobsByKey.set(scopedKey, job);
    this.renderJobsHashByKey.set(scopedKey, requestHash);
  }

  async cleanupIdempotencyRecords(_olderThanIso: string): Promise<number> {
    return 0;
  }
}
