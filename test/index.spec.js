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
  nsq: {
    reader: () => {}
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
  it('it should expose nsq writer', (done) => {
    expect(server.plugins['hapi-nsqjs']).to.include(['writer']);
    done();
  });
});
