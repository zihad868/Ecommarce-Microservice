import type { Server as HttpServer } from 'http';
import type * as grpc from '@grpc/grpc-js';
import type { Logger } from 'pino';

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
  let isShuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    if (config.logger) {
      config.logger.info({ signal, service: config.serviceName }, 'Initiating graceful shutdown');
    } else {
      console.log(`[Shutdown] Initiating graceful shutdown for ${config.serviceName} (${signal})`);
    }

    // Force exit timer in case hanging resources prevent clean exit
    const forceExitTimer = setTimeout(() => {
      const msg = `[Shutdown] Graceful shutdown timed out after ${String(timeoutMs)}ms. Forcing exit.`;
      if (config.logger) {
        config.logger.error(msg);
      } else {
        console.error(msg);
      }
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    try {
      // 1. Stop HTTP server
      if (config.httpServer) {
        await new Promise<void>((resolve) => {
          config.httpServer?.close((err) => {
            if (err && config.logger) {
              config.logger.warn({ err }, 'Error closing HTTP server');
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

      if (config.logger) {
        config.logger.info(`[Shutdown] ${config.serviceName} gracefully stopped`);
      } else {
        console.log(`[Shutdown] ${config.serviceName} gracefully stopped`);
      }

      process.exit(exitCode);
    } catch (err: any) {
      if (config.logger) {
        config.logger.error({ err }, 'Error during graceful shutdown');
      } else {
        console.error('[Shutdown] Error during graceful shutdown:', err);
      }
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
    if (config.logger) {
      config.logger.fatal({ err }, 'Uncaught exception');
    } else {
      console.error('[Process] Uncaught exception:', err);
    }
    void shutdown('uncaughtException', 1);
  });

  process.on('unhandledRejection', (reason: any) => {
    if (config.logger) {
      config.logger.fatal({ reason }, 'Unhandled rejection');
    } else {
      console.error('[Process] Unhandled rejection:', reason);
    }
    void shutdown('unhandledRejection', 1);
  });
};

export default registerGracefulShutdown;
