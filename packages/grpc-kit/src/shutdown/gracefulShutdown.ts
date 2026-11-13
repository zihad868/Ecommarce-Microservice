import type { Server as HttpServer } from 'http';
import type * as grpc from '@grpc/grpc-js';
import type { Logger } from 'pino';
import { createLogger, shutdownTracing } from '@ecommerce/observability';

export interface GracefulShutdownConfig {
  serviceName: string;
  httpServer?: HttpServer;
  grpcServer?: grpc.Server;
  logger?: Logger;
  timeoutMs?: number;
  onShutdown?: () => Promise<void>;
}

/**
 * Registers graceful shutdown handlers for SIGINT, SIGTERM, and unexpected process errors.
 */
export const registerGracefulShutdown = (config: GracefulShutdownConfig): void => {
  const timeoutMs = config.timeoutMs ?? 10000;
  const logger = config.logger ?? createLogger({ serviceName: config.serviceName });
  let isShuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    logger.info({ signal, service: config.serviceName }, 'Initiating graceful shutdown');

    // Force exit timer in case hanging resources prevent clean exit
    const forceExitTimer = setTimeout(() => {
      logger.error(
        `[Shutdown] Graceful shutdown timed out after ${String(timeoutMs)}ms. Forcing exit.`,
      );
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    try {
      // 1. Stop HTTP server
      if (config.httpServer) {
        await new Promise<void>((resolve) => {
          config.httpServer?.close((err) => {
            if (err) {
              logger.warn({ err }, 'Error closing HTTP server');
            }

            resolve();
          });
        });
      }

      // 2. Stop gRPC server
      if (config.grpcServer) {
        await new Promise<void>((resolve) => {
          config.grpcServer?.tryShutdown((err) => {
            if (err) {
              config.grpcServer?.forceShutdown();
            }

            resolve();
          });
        });
      }

      // 3. Service-specific teardown (DB, Redis, Kafka, workers)
      if (config.onShutdown) {
        await config.onShutdown();
      }

      await shutdownTracing();

      logger.info(`[Shutdown] ${config.serviceName} gracefully stopped`);

      process.exit(exitCode);
    } catch (err: unknown) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    void shutdown('unhandledRejection', 1);
  });
};

export default registerGracefulShutdown;
