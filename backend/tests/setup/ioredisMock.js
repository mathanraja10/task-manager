const RedisMock = require('ioredis-mock');

/**
 * ioredis-mock does not track connection state, but the cache service relies
 * on `client.status === 'ready'` (as real ioredis exposes). This adds it, and
 * lets tests simulate an outage with `simulateOutage()`.
 */
class StatefulRedisMock extends RedisMock {
  constructor(url, options = {}) {
    // Connect eagerly: the app's client uses lazyConnect, and the mock rejects
    // commands until connected when the offline queue is disabled.
    super(url, { ...options, lazyConnect: false });
    this.status = 'ready';
  }

  async connect() {
    this.status = 'ready';
  }

  async quit() {
    this.status = 'end';
    return 'OK';
  }

  simulateOutage() {
    this.status = 'reconnecting';
  }

  /** Reconnect. Like real ioredis, emits 'ready' so listeners can react. */
  restore() {
    this.status = 'ready';
    this.emit('ready');
  }
}

module.exports = StatefulRedisMock;
