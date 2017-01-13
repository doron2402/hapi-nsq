'use strict';

const Joi = require('joi');
const Hoek = require('hoek');
const Nsq = require('nsq.js');

const internals = {
  defaults: {
    nsqPort: 4150,
    nsqHost: '127.0.0.1'
  },
  options: Joi.object({
    nsqPort: Joi.number().integer().optional().default(4150).description('nsqd port (default to 4150)'),
    nsqHost: Joi.string().optional().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/).default('127.0.0.1').description('nsq host default to 127.0.0.1'),
    nsqLookup: Joi.array()
      .min(1)
      .items(Joi.string().regex(/[0-9]+.[0-9]+.[0-9]+.[0-9]+:[0-9]+/))
      .allow(null)
      .optional()
      .description('array of nsqlookupd addresses')
  })
};

internals.onPreStop = (writer) => {
  return (server, next) => {
    server.log(['nsq'], 'Closing nsq connection');
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
  const nsqWriterSettings = {};
  // When passing nsqlookupd remove the nsqd attribute
  if (settings.nsqLookup) {
    nsqWriterSettings.nsqlookupd = settings.nsqLookup;
  }
  else {
    nsqWriterSettings.nsqd = [`${settings.nsqHost}:${settings.nsqPort}`];
  }
  // Initialize NSQ Writer
  const nsqWriter = Nsq.writer(nsqWriterSettings);
  nsqWriter.on('error', (err) => {
    server.log(['nsq'], `>>Error (NSQ.Writer) ${err}`);
  });

  //exposing writer
  server.expose('writer', nsqWriter);
  server.expose('nsq', Nsq);

  server.ext([{
    type: 'onPreStop',
    method: internals.onPreStop(nsqWriter)
  }]);

  nsqWriter.on('ready', () => {
    next();
  });
};

exports.register.attributes = {
  pkg: require('../package.json')
};
