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
CHECK_INTERVAL = process.env['AWSMANG_INTERVAL'] || 1000 * 10,
HISTORY_SIZE = process.env['AWSMANG_HISTORY'] || 1000;

function pingAddress(address, callback) {
  var start = Date.now();
  try {
    // timeout?
    request.get(address, function(err, res, body) {
      if (err) {
        return callback(err);
      }
      var date = Date.now();
      console.log(address + ': ' + res.statusCode);
      return callback(null, {
        statusCode: res.statusCode,
        date: date,
        time: date - start
      });
    });
  } catch (err) {
    return callback(err);
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

Awsmang.prototype.startMonitoring = function(address) {
  redis.sadd('awsmang:addresses', address);
  this.emit('addServer', {address: address});
};

Awsmang.prototype.stopMonitoring = function(address) {
  redis.srem('awsmang:addresses', address);
  this.emit('removeServer', {address: address});
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
  var i = 0;
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
          var serverInfo = [];
          // data is a list of json-stringified data and timestamp, alternating
          for (i = 0; i < data.length; i+=2) {
            serverInfo.push([JSON.parse(data[i]), parseInt(data[i+1],10)]);
          }
          result[address] = serverInfo;
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