'use strict';
const Lab = require('lab');
const Hapi = require('hapi');
const Code = require('code');
const Proxyquire = require('proxyquire');
const nsq = {
  options: {},
  writer: (options) => {
    nsq.options.writer = options;
    return {
      on: (event, cb) => cb()
    };
  },
  reader: (options) => {
    nsq.options.reader = options;
    return {
      on: (event, cb) => {
        if (event === 'discard' || event === 'message') {
          return cb({ body: 'foo', finish: function (){} });
        }
        return cb();
      }
    };
  }
};

const Plugin = Proxyquire('../lib', {
  'nsq.js': nsq
});
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const before = lab.before;
const it = lab.it;
const expect = Code.expect;
let server;

describe('NSQ Plugin Options', () => {
  describe('When using nsqd', () => {
    before((done) => {
      server = new Hapi.Server();
      server.connection();
      server.register([{
        register: Plugin,
        options: {
          nsqPort: 5000,
          nsqHost: '127.0.0.2',
          maxInFlight: 1,
          maxAttempts: 2,
          topic: 'test-topic',
          channel: 'test-channel'
        }
      }], (err) => {
        if (err) {
          throw err;
        }
        expect(err).to.be.undefined;
        server.initialize(done);
      });
    });
    it('It should expose the plugin `hapi-nsqjs`', (done) => {
      expect(server.plugins).to.include(['hapi-nsqjs']);
      done();
    });
    it('it should expose nsq reader & writer', (done) => {
      expect(server.plugins['hapi-nsqjs']).to.include(['nsqReader', 'nsqWriter']);
      done();
    });
    it('nsqWriter options', (done) => {
      expect(nsq.options.writer).to.include(['nsqd']);
      expect(nsq.options.writer.nsqd).to.be.an.array();
      expect(nsq.options.writer.nsqd[0]).to.be.equal('127.0.0.2:5000');
      done();
    });
    it('nsqReader options', (done) => {
      expect(nsq.options.reader).to.include([
        'maxInFlight',
        'maxAttempts',
        'maxConnectionAttempts',
        'pollInterval',
        'topic',
        'channel',
        'nsqd'
      ]);
      expect(nsq.options.reader.maxInFlight).to.be.equal(1);
      expect(nsq.options.reader.maxAttempts).to.be.equal(2);
      expect(nsq.options.reader.maxConnectionAttempts).to.be.equal(Infinity);
      expect(nsq.options.reader.pollInterval).to.be.equal(10000);
      expect(nsq.options.reader.topic).to.be.equal('test-topic');
      expect(nsq.options.reader.channel).to.be.equal('test-channel');
      expect(nsq.options.reader.nsqd[0]).to.be.equal('127.0.0.2:5000');
      done();
    });
  });
  describe('When using nsqlookup', () => {
    before((done) => {
      server = new Hapi.Server();
      server.connection();
      server.register([{
        register: Plugin,
        options: {
          nsqLookup: ['127.0.0.1:5000', '128.0.0.1:5000'],
          maxInFlight: 1,
          maxAttempts: 2,
          topic: 'test-topic',
          channel: 'test-channel'
        }
      }], (err) => {
        if (err) {
          throw err;
        }
        expect(err).to.be.undefined;
        server.initialize(done);
      });
    });
    it('It should expose the plugin `hapi-nsqjs`', (done) => {
      expect(server.plugins).to.include(['hapi-nsqjs']);
      done();
    });
    it('it should expose nsq reader & writer', (done) => {
      expect(server.plugins['hapi-nsqjs']).to.include(['nsqReader', 'nsqWriter']);
      done();
    });
    it('nsqWriter options', (done) => {
      expect(nsq.options.writer).to.include(['nsqlookupd']);
      expect(nsq.options.writer.nsqlookupd).to.be.an.array();
      expect(nsq.options.writer.nsqlookupd[0]).to.be.equal('127.0.0.1:5000');
      expect(nsq.options.writer.nsqlookupd[1]).to.be.equal('128.0.0.1:5000');
      done();
    });
    it('nsqReader options', (done) => {
      expect(nsq.options.reader).to.include([
        'maxInFlight',
        'maxAttempts',
        'maxConnectionAttempts',
        'pollInterval',
        'topic',
        'channel',
        'nsqlookupd'
      ]);
      expect(nsq.options.reader.maxInFlight).to.be.equal(1);
      expect(nsq.options.reader.maxAttempts).to.be.equal(2);
      expect(nsq.options.reader.maxConnectionAttempts).to.be.equal(Infinity);
      expect(nsq.options.reader.pollInterval).to.be.equal(10000);
      expect(nsq.options.reader.topic).to.be.equal('test-topic');
      expect(nsq.options.reader.channel).to.be.equal('test-channel');
      expect(nsq.options.reader.nsqlookupd[0]).to.be.equal('127.0.0.1:5000');
      expect(nsq.options.reader.nsqlookupd[1]).to.be.equal('128.0.0.1:5000');
      done();
    });
  });
});
