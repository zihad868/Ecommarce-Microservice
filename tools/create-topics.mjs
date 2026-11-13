import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { TOPICS } = require('../packages/messaging-kit/dist/events/topics.js');
const { createKafka } = require('../packages/messaging-kit/dist/kafka.js');

export const createTopics = async (admin, options = {}) => {
  const numPartitions = Number(options.partitions ?? process.env.KAFKA_TOPIC_PARTITIONS ?? 6);
  const replicationFactor = Number(
    options.replicationFactor ?? process.env.KAFKA_REPLICATION_FACTOR ?? 1,
  );

  if (
    !Number.isInteger(numPartitions) ||
    numPartitions < 1 ||
    !Number.isInteger(replicationFactor) ||
    replicationFactor < 1
  ) {
    throw new Error('Topic partitions and replication factor must be positive integers');
  }

  await admin.connect();

  try {
    const topics = Object.values(TOPICS).flatMap((topic) => [topic, `${topic}.dlq`]);

    if (options.checkOnly) {
      const existing = new Set(await admin.listTopics());
      const missing = topics.filter((topic) => !existing.has(topic));

      if (missing.length) throw new Error(`Missing Kafka topics: ${missing.join(', ')}`);
    } else {
      await admin.createTopics({
        waitForLeaders: true,
        topics: topics.map((topic) => ({ topic, numPartitions, replicationFactor })),
      });
    }

    // Fetching metadata waits for all required topics to become usable.
    await admin.fetchTopicMetadata({ topics });
  } finally {
    await admin.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const brokers = (process.env.KAFKA_BROKER ?? 'localhost:9093').split(',');
  await createTopics(createKafka('topic-initializer', brokers).admin(), {
    checkOnly: process.argv.includes('--check'),
  });
}
