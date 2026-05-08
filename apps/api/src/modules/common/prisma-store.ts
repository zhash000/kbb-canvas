import { Prisma, PrismaClient } from "@prisma/client";

import type {
  CreditBalance,
  CreditLedgerEntry,
  CreditReservation,
  MembershipRecord,
  RenderJobSnapshot,
  Store,
  UserRecord,
} from "./store.types.js";

export class PrismaStore implements Store {
  private reserveByKey = new Map<string, CreditReservation>();
  private settleByKey = new Map<string, CreditLedgerEntry>();
  private releaseByKey = new Map<string, CreditLedgerEntry>();

  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  async register(email: string, password: string): Promise<UserRecord> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("email_exists");

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, password } });
      await tx.membership.create({ data: { userId: created.id, plan: "free" } });
      await tx.creditLedger.create({ data: { userId: created.id, type: "topup", amount: 1000 } });
      return created;
    });

    return { id: user.id, email: user.email, password: user.password };
  }

  async login(email: string, password: string): Promise<UserRecord> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) throw new Error("invalid_credentials");
    return { id: user.id, email: user.email, password: user.password };
  }

  async getMembership(userId: string): Promise<MembershipRecord> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return {
      userId,
      plan: membership?.plan === "pro" ? "pro" : "free",
      expiresAt: membership?.expiresAt?.toISOString() ?? null,
    };
  }

  async setMembership(
    userId: string,
    plan: "free" | "pro",
    expiresAt: string | null
  ): Promise<MembershipRecord> {
    await this.prisma.membership.create({
      data: { userId, plan, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    return { userId, plan, expiresAt };
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    const [reserveAgg, settleAgg, releaseAgg, topupAgg] = await Promise.all([
      this.prisma.creditLedger.aggregate({ where: { userId, type: "reserve" }, _sum: { amount: true } }),
      this.prisma.creditLedger.aggregate({ where: { userId, type: "settle" }, _sum: { amount: true } }),
      this.prisma.creditLedger.aggregate({ where: { userId, type: "release" }, _sum: { amount: true } }),
      this.prisma.creditLedger.aggregate({ where: { userId, type: "topup" }, _sum: { amount: true } }),
    ]);

    const reserved = (reserveAgg._sum.amount ?? 0) - (settleAgg._sum.amount ?? 0) - (releaseAgg._sum.amount ?? 0);
    const available = (topupAgg._sum.amount ?? 0) - (reserveAgg._sum.amount ?? 0) + (releaseAgg._sum.amount ?? 0);
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
      const persisted = await this.prisma.idempotencyRecord.findUnique({
        where: { scope_userId_key: { scope: "credits.reserve", userId, key: idempotencyKey } },
      });
      if (persisted?.responseJson) {
        if (requestHash && persisted.requestHash !== requestHash) {
          throw new Error("idempotency_key_reused_with_different_payload");
        }
        return persisted.responseJson as unknown as CreditReservation;
      }

      const existing = this.reserveByKey.get(`${userId}:${idempotencyKey}`);
      if (existing) return existing;
    }
    if (amount <= 0) throw new Error("invalid_amount");

    const balance = await this.getBalance(userId);
    if (balance.available < amount) throw new Error("insufficient_credits");

    const reservation = await this.prisma.creditReservation.create({
      data: { userId, amount, refJobId },
    });

    await this.prisma.creditLedger.create({
      data: { userId, type: "reserve", amount, reservationId: reservation.id, refJobId },
    });

    const result = {
      id: reservation.id,
      userId: reservation.userId,
      amount: reservation.amount,
      refJobId: reservation.refJobId ?? undefined,
      createdAt: reservation.createdAt.toISOString(),
    };
    if (idempotencyKey) {
      this.reserveByKey.set(`${userId}:${idempotencyKey}`, result);
      await this.prisma.idempotencyRecord.upsert({
        where: { scope_userId_key: { scope: "credits.reserve", userId, key: idempotencyKey } },
        update: { responseJson: this.toJsonValue(result) },
        create: {
          scope: "credits.reserve",
          userId,
          key: idempotencyKey,
          requestHash: requestHash ?? "",
          responseJson: this.toJsonValue(result),
        },
      });
    }
    return result;
  }

  async settle(
    userId: string,
    reservationId: string,
    amount: number,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry> {
    if (idempotencyKey) {
      const persisted = await this.prisma.idempotencyRecord.findUnique({
        where: { scope_userId_key: { scope: "credits.settle", userId, key: idempotencyKey } },
      });
      if (persisted?.responseJson) {
        if (requestHash && persisted.requestHash !== requestHash) {
          throw new Error("idempotency_key_reused_with_different_payload");
        }
        return persisted.responseJson as unknown as CreditLedgerEntry;
      }

      const existing = this.settleByKey.get(`${userId}:${idempotencyKey}`);
      if (existing) return existing;
    }
    if (amount <= 0) throw new Error("invalid_amount");

    const reservation = await this.prisma.creditReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.userId !== userId) throw new Error("reservation_not_found");
    if (amount > reservation.amount) throw new Error("settle_amount_exceeds_reservation");

    await this.prisma.$transaction(async (tx) => {
      await tx.creditReservation.delete({ where: { id: reservationId } });
      await tx.creditLedger.create({
        data: { userId, type: "settle", amount, reservationId, refJobId: reservation.refJobId },
      });
      if (reservation.amount > amount) {
        await tx.creditLedger.create({
          data: {
            userId,
            type: "release",
            amount: reservation.amount - amount,
            reservationId,
            refJobId: reservation.refJobId,
          },
        });
      }
    });

    const entry = await this.prisma.creditLedger.findFirst({
      where: { userId, type: "settle", reservationId },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) throw new Error("settle_failed");

    const result = {
      id: entry.id,
      userId: entry.userId,
      type: "settle",
      amount: entry.amount,
      reservationId: entry.reservationId ?? undefined,
      refJobId: entry.refJobId ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    };
    if (idempotencyKey) {
      this.settleByKey.set(`${userId}:${idempotencyKey}`, result);
      await this.prisma.idempotencyRecord.upsert({
        where: { scope_userId_key: { scope: "credits.settle", userId, key: idempotencyKey } },
        update: { responseJson: this.toJsonValue(result) },
        create: {
          scope: "credits.settle",
          userId,
          key: idempotencyKey,
          requestHash: requestHash ?? "",
          responseJson: this.toJsonValue(result),
        },
      });
    }
    return result;
  }

  async release(
    userId: string,
    reservationId: string,
    idempotencyKey?: string,
    requestHash?: string
  ): Promise<CreditLedgerEntry> {
    if (idempotencyKey) {
      const persisted = await this.prisma.idempotencyRecord.findUnique({
        where: { scope_userId_key: { scope: "credits.release", userId, key: idempotencyKey } },
      });
      if (persisted?.responseJson) {
        if (requestHash && persisted.requestHash !== requestHash) {
          throw new Error("idempotency_key_reused_with_different_payload");
        }
        return persisted.responseJson as unknown as CreditLedgerEntry;
      }

      const existing = this.releaseByKey.get(`${userId}:${idempotencyKey}`);
      if (existing) return existing;
    }
    const reservation = await this.prisma.creditReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.userId !== userId) throw new Error("reservation_not_found");

    await this.prisma.$transaction(async (tx) => {
      await tx.creditReservation.delete({ where: { id: reservationId } });
      await tx.creditLedger.create({
        data: {
          userId,
          type: "release",
          amount: reservation.amount,
          reservationId,
          refJobId: reservation.refJobId,
        },
      });
    });

    const entry = await this.prisma.creditLedger.findFirst({
      where: { userId, type: "release", reservationId },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) throw new Error("release_failed");

    const result = {
      id: entry.id,
      userId: entry.userId,
      type: "release",
      amount: entry.amount,
      reservationId: entry.reservationId ?? undefined,
      refJobId: entry.refJobId ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    };
    if (idempotencyKey) {
      this.releaseByKey.set(`${userId}:${idempotencyKey}`, result);
      await this.prisma.idempotencyRecord.upsert({
        where: { scope_userId_key: { scope: "credits.release", userId, key: idempotencyKey } },
        update: { responseJson: this.toJsonValue(result) },
        create: {
          scope: "credits.release",
          userId,
          key: idempotencyKey,
          requestHash: requestHash ?? "",
          responseJson: this.toJsonValue(result),
        },
      });
    }
    return result;
  }

  async getLedger(userId: string): Promise<CreditLedgerEntry[]> {
    const entries = await this.prisma.creditLedger.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      type: entry.type as CreditLedgerEntry["type"],
      amount: entry.amount,
      reservationId: entry.reservationId ?? undefined,
      refJobId: entry.refJobId ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  async getRenderJobByIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash?: string
  ): Promise<RenderJobSnapshot | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { scope_userId_key: { scope: "render-jobs.create", userId, key: idempotencyKey } },
    });
    if (record && requestHash && record.requestHash !== requestHash) {
      throw new Error("idempotency_key_reused_with_different_payload");
    }
    return (record?.responseJson as unknown as RenderJobSnapshot) ?? null;
  }

  async saveRenderJobIdempotency(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    job: RenderJobSnapshot
  ): Promise<void> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { scope_userId_key: { scope: "render-jobs.create", userId, key: idempotencyKey } },
    });
    if (existing && existing.requestHash !== requestHash) {
      throw new Error("idempotency_key_reused_with_different_payload");
    }

    await this.prisma.idempotencyRecord.upsert({
      where: { scope_userId_key: { scope: "render-jobs.create", userId, key: idempotencyKey } },
      update: { requestHash, responseJson: this.toJsonValue(job) },
      create: {
        scope: "render-jobs.create",
        userId,
        key: idempotencyKey,
        requestHash,
        responseJson: this.toJsonValue(job),
      },
    });
  }

  async cleanupIdempotencyRecords(olderThanIso: string): Promise<number> {
    const cutoff = new Date(olderThanIso);
    const result = await this.prisma.idempotencyRecord.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
