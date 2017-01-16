# hapi-nsq
Hapi-NSQ Hapi.js module for using NSQ

Lead Maintainer: [Doron Segal](https://github.com/doron2402)

# Introduction

If you're using Hapi.js and want to use NSQ this plugin can help you.


# Example

Initializing the plugin (NSQD)
```javascript
server = new Hapi.Server();
server.connection();
server.register([{
  register: require('hapi-nsqjs'),
  options: {
    nsqPort: 4150,
    nsqHost: '127.0.0.1'
  }
}], (err) => {
  if (err) {
    throw err;
  }
  //server is running
});

```

Initializing the plugin (NSQ LOOKUP)
```javascript
server = new Hapi.Server();
server.connection();
server.register([{
  register: require('hapi-nsqjs'),
  options: {
    nsqLookup: ['10.0.0.1:9988','10.0.0.2:9988']
  }
}], (err) => {
  if (err) {
    throw err;
  }
  //server is running
});

```

Publish
```javascript
const TOPIC = 'events'; //Your topic
//Access plugin via server object
server.plugins['hapi-nsqjs'].writer.publish(TOPIC, ['foo', 'bar', 'baz']);
server.plugins['hapi-nsqjs'].writer.publish('events', 'some message here');

// Access the plugin via request
request.server.plugins['hapi-nsqjs'].writer.publish(TOPIC, ['foo', 'bar', 'baz']);
request.server.plugins['hapi-nsqjs'].writer.publish('events', 'some message here');
```

Subscribe
```javascript
// using nsq.js
var nsq = require('nsq.js');
var reader = nsq.reader({
  nsqd: ['0.0.0.0:4150'],
  maxInFlight: 5,
  topic: 'events',
  channel: 'ingestion'
});

reader.on('message', function(msg){
  console.log(msg.body.toString());
  setTimeout(function(){
    msg.finish();
  }, 200);
});
```

Plugin Options:
* `nsqLookup`
    * When using nsqlookupd you need to pass an array with ip:port
    * for ex' ``` nsqLookup: ['127.0.0.1:5000', '128.0.0.1:5000'] ```
* `nsqd`
    * When using nsqd you need to pass host and port
    * for ex' ```javascript { nsqPort: 5000, nsqHost: '127.0.0.2' } ```


# Logs

Logs will be using `server.log['nsq]`

# NSQ Important links
  * for more example using nsq.js checkout [this url](https://github.com/segmentio/nsq.js/tree/master/examples)
  * Great article by Calvin French-Owen from Segment [url](https://segment.com/blog/scaling-nsq/)

# API
Coming Soon 
<!--See the [API Reference](https://github.com/doron2402/hapi-nsq/blob/API.md).-->
