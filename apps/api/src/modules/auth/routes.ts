import type { FastifyPluginAsync } from "fastify";

import type { Store } from "../common/store.types.js";

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
  }
}

interface RegisterBody {
  email: string;
  password: string;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterBody }>("/auth/register", async (request, reply) => {
    try {
      const user = await app.store.register(request.body.email, request.body.password);
      return { userId: user.id, email: user.email };
    } catch (error) {
      if (error instanceof Error && error.message === "email_exists") {
        return reply.code(409).send({ message: "email already exists" });
      }
      throw error;
    }
  });

  app.post<{ Body: RegisterBody }>("/auth/login", async (request, reply) => {
    try {
      const user = await app.store.login(request.body.email, request.body.password);
      return { userId: user.id, email: user.email };
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_credentials") {
        return reply.code(401).send({ message: "invalid credentials" });
      }
      throw error;
    }
  });
};
