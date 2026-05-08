export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
}

export function computeRetryDelay(attempt: number, baseMs = 500): number {
  const boundedAttempt = Math.max(0, attempt);
  return baseMs * 2 ** boundedAttempt;
}

export function shouldRetryByStatus(statusCode: number): boolean {
  if (statusCode === 429) return true;
  if (statusCode >= 500 && statusCode < 600) return true;
  return false;
}

export function getRetryDecision(args: {
  statusCode: number;
  attempt: number;
  maxAttempts: number;
  baseDelayMs?: number;
}): RetryDecision {
  if (args.attempt >= args.maxAttempts) {
    return { shouldRetry: false, delayMs: 0 };
  }

  if (!shouldRetryByStatus(args.statusCode)) {
    return { shouldRetry: false, delayMs: 0 };
  }

  return {
    shouldRetry: true,
    delayMs: computeRetryDelay(args.attempt, args.baseDelayMs ?? 500),
  };
}
