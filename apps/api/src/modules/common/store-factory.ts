import { InMemoryStore } from "./store.js";
import type { Store } from "./store.types.js";
import { PrismaStore } from "./prisma-store.js";

export function createStore(mode = process.env.STORE_MODE): Store {
  if (mode === "prisma") {
    return new PrismaStore();
  }
  return new InMemoryStore();
}
