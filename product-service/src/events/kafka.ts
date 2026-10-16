import { Kafka, type Consumer, type EachMessagePayload, type Producer } from 'kafkajs';
import {
  ORDER_CREATED_DLQ_TOPIC,
  ORDER_CREATED_TOPIC,
  orderCreatedEventSchema,
} from '@ecommerce/common';
import config from '../config';
import prisma from '../utils/prismaClient';
import * as productService from '../services/productService';

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: [config.KAFKA_BROKER],
});

let consumer: Consumer | null = null;
let dlqProducer: Producer | null = null;

const getDlqProducer = async (): Promise<Producer> => {
  if (!dlqProducer) {
    dlqProducer = kafka.producer();
    await dlqProducer.connect();
  }
  return dlqProducer;
};

const sendToDlq = async (
  rawMessage: string,
  errorReason: string,
  eventId?: string,
): Promise<void> => {
  try {
    const producer = await getDlqProducer();
    await producer.send({
      topic: ORDER_CREATED_DLQ_TOPIC,
      messages: [
        {
          key: eventId ?? 'unknown',
          value: JSON.stringify({
            originalMessage: rawMessage,
            error: errorReason,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });
    console.warn(
      `[Kafka DLQ] Sent poison-pill message to ${ORDER_CREATED_DLQ_TOPIC}: ${errorReason}`,
    );
  } catch (dlqErr) {
    console.error('[Kafka DLQ] Failed to forward to DLQ:', dlqErr);
  }
};

export const connectKafkaConsumer = async (): Promise<void> => {
  try {
    consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
    await consumer.connect();

    await consumer.subscribe({
      topic: ORDER_CREATED_TOPIC,
      fromBeginning: false,
    });

    console.log(`Product Service Kafka Consumer connected — listening on "${ORDER_CREATED_TOPIC}"`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        const raw = message.value?.toString();
        if (!raw) return;

        // 1. Validate Schema
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          await sendToDlq(raw, 'Malformed JSON payload');
          return;
        }

        const parseResult = orderCreatedEventSchema.safeParse(parsedJson);
        if (!parseResult.success) {
          await sendToDlq(raw, `Schema validation failure: ${parseResult.error.message}`);
          return;
        }

        const event = parseResult.data;
        console.log(
          `[Kafka] Received from topic "${topic}" partition ${String(partition)}: Event ${event.eventId} for Order ${event.orderId}`,
        );

        // 2. Idempotency Check
        const alreadyProcessed = await prisma.processedEvent.findUnique({
          where: { eventId: event.eventId },
        });

        if (alreadyProcessed) {
          console.log(
            `[Kafka] Event ${event.eventId} already processed at ${alreadyProcessed.createdAt.toISOString()}. Skipping (idempotent).`,
          );
          return;
        }

        // 3. Process items with atomic stock decrement
        try {
          for (const item of event.items) {
            await productService.decrementProductStock(item.productId, item.quantity);
          }

          // Record event as processed
          await prisma.processedEvent.create({
            data: {
              eventId: event.eventId,
              eventType: event.eventType,
            },
          });

          console.log(
            `[Kafka] Successfully processed order ${event.orderId} and recorded event ${event.eventId}`,
          );
        } catch (procErr) {
          const errMsg = procErr instanceof Error ? procErr.message : String(procErr);
          console.error(`[Kafka] Processing failed for event ${event.eventId}:`, errMsg);
          await sendToDlq(raw, errMsg, event.eventId);
        }
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Kafka Consumer connection failed, retrying in 5s...', msg);
    setTimeout(() => {
      void connectKafkaConsumer();
    }, 5000);
  }
};

export const disconnectKafkaConsumer = async (): Promise<void> => {
  if (consumer) {
    await consumer.disconnect();
    console.log('Product Service Kafka Consumer disconnected');
  }
  if (dlqProducer) {
    await dlqProducer.disconnect();
    console.log('Product Service DLQ Producer disconnected');
  }
};
