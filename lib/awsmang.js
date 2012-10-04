/*
 * awsmang - monitor awsboxen
 */

const
util = require('util'),
events = require('events'),
redis = require('redis'),
request = require('request'),
CHECK_INTERVAL = 1000 * 60;

function Awsmang() {
  events.EventEmitter.call(this);

  this.redis = redis.createClient();
  setInterval(this.pingServers, CHECK_INTERVAL);
};
util.inherits(Awsmang, events.EventEmitter);

Awsmang.prototype = {
  startMonitoring: function(address) {
    this.redis.sadd('awsmang:addresses', address);
  },

  stopMonitoring: function(address) {
    this.redis.srem('awsmang:addresses', address);
  },

  pingServers: function() {
    this.redis.smembers('awsmang:addresses', function(err, addresses) {
      if (!err) {
        addresses.forEach(function(address) {
          request.get(address, function(err, results) {
            console.log(err, results);
            redis.zadd('awsmang:server:'+address, Date.now(), results);
            this.emit('status', {
              address: address,
              err: err,
              data: results
            });
            // keep zset no larger than HISTORY_SIZE
            // redis.zremrangebywhatever ...
          });
        });
      }
    });
  },

  // probably want methods to get whole history for a server,
  // single events, etc.

  getLastServerStatus: function(address, callback) {
  },

  getLastStatus: function(callback) {
  }
};
