#!/usr/bin/env node
import { Kafka } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKER || 'localhost:9092').split(',');
const dlqTopic = process.argv[2];

if (!dlqTopic) {
  console.error('Usage: node tools/replay-dlq.mjs <dlq-topic>');
  process.exit(1);
}

const targetTopic = dlqTopic.replace(/\.dlq$/, '');
if (targetTopic === dlqTopic) {
  console.error(`Error: DLQ topic "${dlqTopic}" does not end with ".dlq"`);
  process.exit(1);
}

const kafka = new Kafka({
  clientId: 'dlq-replay-tool',
  brokers,
});

const admin = kafka.admin();
await admin.connect();

let topicOffsets = [];
try {
  topicOffsets = await admin.fetchTopicOffsets(dlqTopic);
} catch (err) {
  console.error(`Failed to fetch offsets for ${dlqTopic}:`, err);
  await admin.disconnect();
  process.exit(1);
}

const totalAvailable = topicOffsets.reduce((acc, p) => acc + (BigInt(p.high) - BigInt(p.low)), 0n);

if (totalAvailable === 0n) {
  console.log(`No messages in ${dlqTopic} to replay.`);
  await admin.disconnect();
  process.exit(0);
}

const producer = kafka.producer();
await producer.connect();

const groupId = `dlq-replay-${Date.now()}`;
const consumer = kafka.consumer({ groupId });
await consumer.connect();
await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

let replayedCount = 0;
let idleTimer;

const cleanupAndExit = async () => {
  if (idleTimer) clearTimeout(idleTimer);
  console.log(`Replayed ${replayedCount} messages from ${dlqTopic} to ${targetTopic}`);
  await consumer.disconnect().catch(() => {});
  await producer.disconnect().catch(() => {});
  await admin.disconnect().catch(() => {});
  process.exit(0);
};

const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    void cleanupAndExit();
  }, 3000);
};

resetIdleTimer();

await consumer.run({
  eachMessage: async ({ message }) => {
    resetIdleTimer();

    let rawBuffer = message.value;
    if (message.value) {
      try {
        const parsed = JSON.parse(message.value.toString('utf8'));
        if (parsed.encoding === 'base64' && typeof parsed.originalMessage === 'string') {
          rawBuffer = Buffer.from(parsed.originalMessage, 'base64');
        }
      } catch {
        // use rawBuffer as is
      }
    }

    const headers = { ...message.headers };
    delete headers['failure-reason'];
    delete headers['original-topic'];

    await producer.send({
      topic: targetTopic,
      messages: [
        {
          key: message.key,
          value: rawBuffer,
          headers,
        },
      ],
    });

    replayedCount++;
    if (replayedCount >= Number(totalAvailable)) {
      setImmediate(() => {
        void cleanupAndExit();
      });
    }
  },
});

