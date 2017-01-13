'use strict';
const Lab = require('lab');
const Hapi = require('hapi');
const Code = require('code');
const Proxyquire = require('proxyquire');
const nsq = {
  messages: [],
  writer: () => {
    return {
      on: (event, cb) => {
        if (event === 'ready') {
          return cb();
        }
      },
      publish: (topic, msg) => {
        nsq.messages.push(msg);
      }
    };
  },
  reader: () => {
    return {
      on: (event, cb) => {
        if (event === 'ready') {
          return cb();
        }
        else if (event === 'message') {
          return cb(nsq.messages.pop());
        }
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

describe('NSQ Plugin', () => {
  before((done) => {
    server = new Hapi.Server();
    server.connection();
    server.register([Plugin], (err) => {
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
  it('Should be able to publish a message', (done) => {
    server.plugins['hapi-nsqjs'].nsqWriter.publish('events', 'foo');
    server.plugins['hapi-nsqjs'].nsqReader.on('message', (msg) => {
      expect(msg).to.equal('foo');
      done();
    });
  });
});
