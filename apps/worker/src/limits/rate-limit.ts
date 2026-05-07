export interface DispatchQuota {
  global: number;
  provider: number;
  user: number;
}

export function canDispatch(
  scope: string,
  current: number,
  limit: number
): boolean {
  if (!scope) return false;
  return current < limit;
}

export function canDispatchWithQuota(args: {
  globalInFlight: number;
  providerInFlight: number;
  userInFlight: number;
  quota: DispatchQuota;
}): boolean {
  return (
    args.globalInFlight < args.quota.global &&
    args.providerInFlight < args.quota.provider &&
    args.userInFlight < args.quota.user
  );
}

export function buildRateLimitKeys(args: {
  provider: string;
  userId: string;
}) {
  return {
    global: "rl:global",
    provider: `rl:provider:${args.provider}`,
    user: `rl:user:${args.userId}`,
  };
}
