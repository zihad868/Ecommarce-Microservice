import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';

let sdk: NodeSDK | undefined;

// Preload this module before importing HTTP or gRPC application code.
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [new HttpInstrumentation(), new GrpcInstrumentation()],
  });
  sdk.start();
}

export const shutdownTracing = async (): Promise<void> => {
  await sdk?.shutdown();
};
