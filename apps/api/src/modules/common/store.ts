import { randomUUID } from "node:crypto";

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

export class InMemoryStore {
  private usersByEmail = new Map<string, UserRecord>();
  private memberships = new Map<string, MembershipRecord>();
  private availableByUser = new Map<string, number>();
  private reservedByUser = new Map<string, number>();
  private reservations = new Map<string, CreditReservation>();
  private ledgers: CreditLedgerEntry[] = [];

  register(email: string, password: string): UserRecord {
    if (this.usersByEmail.has(email)) {
      throw new Error("email_exists");
    }

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

  login(email: string, password: string): UserRecord {
    const user = this.usersByEmail.get(email);
    if (!user || user.password !== password) {
      throw new Error("invalid_credentials");
    }
    return user;
  }

  getMembership(userId: string): MembershipRecord {
    return this.memberships.get(userId) ?? { userId, plan: "free", expiresAt: null };
  }

  setMembership(userId: string, plan: "free" | "pro", expiresAt: string | null): MembershipRecord {
    const record: MembershipRecord = { userId, plan, expiresAt };
    this.memberships.set(userId, record);
    return record;
  }

  getBalance(userId: string): CreditBalance {
    const available = this.availableByUser.get(userId) ?? 0;
    const reserved = this.reservedByUser.get(userId) ?? 0;
    return {
      available,
      reserved,
      total: available + reserved,
    };
  }

  reserve(userId: string, amount: number, refJobId?: string): CreditReservation {
    if (amount <= 0) {
      throw new Error("invalid_amount");
    }

    const available = this.availableByUser.get(userId) ?? 0;
    if (available < amount) {
      throw new Error("insufficient_credits");
    }

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

    return reservation;
  }

  settle(userId: string, reservationId: string, amount: number): CreditLedgerEntry {
    if (amount <= 0) {
      throw new Error("invalid_amount");
    }

    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.userId !== userId) {
      throw new Error("reservation_not_found");
    }

    if (amount > reservation.amount) {
      throw new Error("settle_amount_exceeds_reservation");
    }

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

    return entry;
  }

  release(userId: string, reservationId: string): CreditLedgerEntry {
    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.userId !== userId) {
      throw new Error("reservation_not_found");
    }

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
    return entry;
  }

  getLedger(userId: string): CreditLedgerEntry[] {
    return this.ledgers.filter((entry) => entry.userId === userId);
  }
}
