/*
 * awsmang - monitor awsboxen
 */

const
util = require('util'),
events = require('events'),
redis = require('redis').createClient(),
request = require('request'),
CHECK_INTERVAL = 1000 * 10;

function Awsmang() {
  events.EventEmitter.call(this);
  var self = this;

  console.log("starting to ping servers");

  setInterval(function() { this.pingServers(); }.bind(self), CHECK_INTERVAL);
  this.pingServers();

  return this;
};
util.inherits(Awsmang, events.EventEmitter);

Awsmang.prototype.startMontoring = function(address) {
  redis.sadd('awsmang:addresses', address);
};

Awsmang.prototype.stopMonitoring = function(address) {
  redis.srem('awsmang:addresses', address);
};

Awsmang.prototype.pingServers = function() {
  var self = this;
  redis.smembers('awsmang:addresses', function(err, addresses) {
    console.log("pingServers", err, addresses);
    if (!err) {
      addresses.forEach(function(address) {
        console.log("ping:", address);
        request.get(address, function(err, results) {
          redis.zadd('awsmang:server:'+address, Date.now(), results.body);
          self.emit('status', {
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
};

// probably want methods to get whole history for a server,
// single events, etc.

module.exports = new Awsmang();