import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createTopics } from './create-topics.mjs';

const require = createRequire(import.meta.url);
const { TOPICS } = require('../packages/messaging-kit/dist/events/topics.js');
const expectedTopics = Object.values(TOPICS).flatMap((topic) => [topic, `${topic}.dlq`]);

function admin() {
  return {
    connected: false,
    disconnected: false,
    created: undefined,
    async connect() {
      this.connected = true;
    },
    async disconnect() {
      this.disconnected = true;
    },
    async createTopics(options) {
      this.created = options;
      return false;
    },
    async listTopics() {
      return expectedTopics;
    },
    async fetchTopicMetadata({ topics }) {
      assert.deepEqual(topics, expectedTopics);
    },
  };
}

test('provisions every event topic and DLQ with configured replication and leader wait', async () => {
  const client = admin();
  await createTopics(client, { partitions: 6, replicationFactor: 3 });
  assert.deepEqual(client.created, {
    waitForLeaders: true,
    topics: expectedTopics.map((topic) => ({ topic, numPartitions: 6, replicationFactor: 3 })),
  });
  assert.equal(client.disconnected, true);
});

test('startup checks do not create topics and reject a missing DLQ', async () => {
  const client = admin();
  await createTopics(client, { checkOnly: true });
  assert.equal(client.created, undefined);
  client.listTopics = async () => expectedTopics.slice(0, -1);
  await assert.rejects(createTopics(client, { checkOnly: true }), /Missing Kafka topics/);
  assert.equal(client.disconnected, true);
});

test('disconnects on provisioning failure and propagates the original error', async () => {
  const client = admin();
  const error = new Error('Kafka unavailable');
  client.createTopics = async () => {
    throw error;
  };
  await assert.rejects(createTopics(client), (candidate) => candidate === error);
  assert.equal(client.disconnected, true);
});

test('invalid partition or replication settings fail before connecting', async () => {
  for (const options of [{ partitions: 0 }, { replicationFactor: 1.5 }]) {
    const client = admin();
    await assert.rejects(createTopics(client, options), /positive integers/);
    assert.equal(client.connected, false);
  }
});
