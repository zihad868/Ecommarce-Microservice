import CircuitBreaker from 'opossum';
import * as grpc from '@grpc/grpc-js';

export interface ResilientGrpcOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  circuitBreakerOptions?: CircuitBreaker.Options;
}

const DEFAULT_OPTIONS: Required<Omit<ResilientGrpcOptions, 'circuitBreakerOptions'>> = {
  timeoutMs: 5000,
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

// Retryable gRPC error codes (transient network or load failures)
const RETRYABLE_CODES = new Set<number>([
  grpc.status.UNAVAILABLE,
  grpc.status.DEADLINE_EXCEEDED,
  grpc.status.RESOURCE_EXHAUSTED,
  grpc.status.ABORTED,
]);

/**
 * Calculates exponential backoff with full jitter.
 */
const calculateJitteredBackoff = (attempt: number, baseMs: number, maxMs: number): number => {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exponential);
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Executes a unary gRPC call wrapped in a circuit breaker, with deadlines and jittered retries.
 */
export const invokeResilientGrpc = async <TReq, TRes>(
  serviceName: string,
  methodName: string,
  callFn: (
    req: TReq,
    meta: grpc.Metadata,
    options: grpc.CallOptions,
    cb: (err: grpc.ServiceError | null, res: TRes) => void,
  ) => void,
  req: TReq,
  options?: ResilientGrpcOptions,
): Promise<TRes> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs;
  const maxRetries = options?.maxRetries ?? DEFAULT_OPTIONS.maxRetries;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;

  const breakerKey = `${serviceName}.${methodName}`;
  let breaker = circuitBreakers.get(breakerKey);
  if (!breaker) {
    const cbOptions: CircuitBreaker.Options = {
      timeout: timeoutMs + 1000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
      ...options?.circuitBreakerOptions,
    };

    breaker = new CircuitBreaker(async (payload: { req: TReq }) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await new Promise<TRes>((resolve, reject) => {
            const metadata = new grpc.Metadata();
            const deadline = new Date(Date.now() + timeoutMs);

            callFn(
              payload.req,
              metadata,
              { deadline },
              (err: grpc.ServiceError | null, response: TRes) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(response);
                }
              },
            );
          });
          return result;
        } catch (err: any) {
          lastError = err;
          const grpcCode = err?.code;
          if (
            attempt < maxRetries &&
            typeof grpcCode === 'number' &&
            RETRYABLE_CODES.has(grpcCode)
          ) {
            const backoff = calculateJitteredBackoff(attempt, baseDelayMs, maxDelayMs);
            await delay(backoff);
            continue;
          }
          throw err;
        }
      }

      throw lastError ?? new Error('gRPC request failed with unknown error');
    }, cbOptions);

    circuitBreakers.set(breakerKey, breaker);
  }

  return (await breaker.fire({ req })) as TRes;
};
