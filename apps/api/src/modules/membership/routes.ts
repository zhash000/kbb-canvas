import type { FastifyPluginAsync } from "fastify";

import type { Store } from "../common/store.types.js";

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
  }
}

interface MembershipBody {
  userId: string;
  plan: "free" | "pro";
  expiresAt?: string | null;
}

export const membershipRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { userId: string } }>("/membership", async (request) => {
    return await app.store.getMembership(request.query.userId);
  });

  app.post<{ Body: MembershipBody }>("/membership", async (request) => {
    return await app.store.setMembership(
      request.body.userId,
      request.body.plan,
      request.body.expiresAt ?? null
    );
  });
};
