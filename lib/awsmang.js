/*
 * awsmang - monitor awsboxen
 *
 * emits an 'update' message each time it has something to say
 */

const
util = require('util'),
events = require('events'),
redis = require('redis').createClient(),
request = require('request'),
CHECK_INTERVAL = 1000 * 10,
HISTORY_SIZE = 1000;

function pingAddress(address, callback) {
  var start = Date.now();
  try {
    // timeout?
    request.get(address, function(err, res, body) {
      callback(null, {
        statusCode: res.statusCode,
        time: (Date.now() - start)
      });
    });
  } catch (err) {
    callback(err);
  }
}

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
    if (err) {
      console.log("ERROR: redis.smembers:", err);
    } else {
      addresses.forEach(function(address) {
        pingAddress(address, function(err, results) {
          var data = results || {err: err};
          redis.zadd('awsmang:server:'+address, Date.now(), JSON.stringify(data));
          self.emit('update', {
            address: address,
            data: data
          });
          // keep zset no larger than HISTORY_SIZE
          redis.zremrangebyrank('awsmang:server:'+address, HISTORY_SIZE, -1);
        });
      });
    }
  });
};

Awsmang.prototype.getStatuses = function(historyCount, callback) {
  var self = this;
  redis.smembers('awsmang:addresses', function(err, addresses) {
    if (err) {
      console.log("ERROR: redis.smembers:", err);
    } else {
      var collected = 0;
      var result = {};
      addresses.forEach(function(address) {
        redis.zrange('awsmang:server:'+address, 0, historyCount, 'WITHSCORES', function(err, data) {
          if (err) {
            return callback(err);
          }
          result[address] = data;
          collected += 1;
          if (collected === addresses.length) {
            return callback(null, result);
          }
        });
      });
    }
  });
};

module.exports = new Awsmang();