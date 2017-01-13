'use strict';

const Joi = require('joi');
const Hoek = require('hoek');
const Nsq = require('nsq.js');

const internals = {
  defaults: {
    nsqPort: 4150,
    nsqHost: '127.0.0.1',
    maxInFlight: 25,
    maxAttempts: 25,
    topic: 'events',
    channel: 'ingestion'
  },
  options: Joi.object({
    nsqPort: Joi.number().integer().optional().default(4150).description('nsqd port (default to 4150)'),
    nsqHost: Joi.string().optional().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/).default('127.0.0.1').description('nsq host default to 127.0.0.1'),
    maxInFlight: Joi.number().integer().default(25).description('max in flight (default 25)'),
    maxAttempts: Joi.number().integer().default(25).description('max attempts (default 25)'),
    maxConnectionAttempts: Joi.number().integer().default(Infinity).optional().description('max reconnection attempts default(Infinity)'),
    topic: Joi.string().optional().default('topic').description('nsq topic'),
    pollInterval: Joi.number().integer().default(10000).description('nsqlookupd poll interval'),
    channel: Joi.string().optional().default('channel').description('nsq channel'),
    nsqLookup: Joi.array()
      .min(1)
      .items(Joi.string().regex(/[0-9]+.[0-9]+.[0-9]+.[0-9]+:[0-9]+/))
      .allow(null)
      .optional()
      .description('array of nsqlookupd addresses')
  })
};

internals.onPreStop = (reader, writer) => {
  return (server, next) => {
    server.log(['nsq'], 'Closing nsq writer/reader');
    reader.close();
    writer.close();
    return next();
  };
};


exports.register = function (server, options, next) {
  const validateOptions = internals.options.validate(options);
  if (validateOptions.error) {
    return next(validateOptions.error);
  }
  const settings = Hoek.clone(internals.defaults);
  Hoek.merge(settings, validateOptions.value);

  // Call next when both writer and reader are ready
  let counter = 0;
  const callNext = () => {
    if (counter > 0) {
      return next();
    }
    counter++;
  };

  const nsqReaderSettings = {
    maxInFlight: settings.maxInFlight,
    maxAttempts: settings.maxAttempts,
    maxConnectionAttempts: settings.maxConnectionAttempts,
    pollInterval: settings.pollInterval,
    topic: settings.topic,
    channel: settings.channel
  };
  const nsqWriterSettings = {};
  // When passing nsqlookupd remove the nsqd attribute
  if (settings.nsqLookup) {
    nsqReaderSettings.nsqlookupd = settings.nsqLookup;
    nsqWriterSettings.nsqlookupd = settings.nsqLookup;
  }
  else {
    nsqReaderSettings.nsqd = [`${settings.nsqHost}:${settings.nsqPort}`];
    nsqWriterSettings.nsqd = [`${settings.nsqHost}:${settings.nsqPort}`];
  }
  // Initialize Reader and Writer
  const nsqReader = Nsq.reader(nsqReaderSettings);
  const nsqWriter = Nsq.writer(nsqWriterSettings);


  //Reader event listeners
  nsqReader.on('error', (err) => {
    server.log(['nsq'], `>>Error (NSQ.Reader) ${err}`);
  });
  nsqReader.on('discard', (msg) => {
    const body = msg.body.toString();
    server.log(['nsq'], `>>Discard (NSQ.Reader) giving up on ${body}`);
    msg.finish();
  });
  nsqReader.on('ready', () => {
    callNext();
  });
  //Writer event listeners
  nsqWriter.on('ready', () => {
    callNext();
  });
  nsqWriter.on('error', (err) => {
    server.log(['nsq'], `>>Error (NSQ.Writer) ${err}`);
  });

  //exposing writer & reader
  server.expose('nsqReader', nsqReader);
  server.expose('nsqWriter', nsqWriter);

  server.ext([{
    type: 'onPreStop',
    method: internals.onPreStop(nsqReader, nsqWriter)
  }]);
};

exports.register.attributes = {
  pkg: require('../package.json')
};
