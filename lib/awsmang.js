/*
 * awsmang - monitor awsboxen
 *
 * emits an 'update' message each time it has something to say
 */

const
util = require('util'),
events = require('events'),
tty = require('tty'),
Logger = require('./logger'),
redis = require('redis').createClient(),
request = require('request'),
CHECK_INTERVAL_SEC = process.env['AWSMANG_INTERVAL'] || 30,
HISTORY_SIZE = process.env['AWSMANG_HISTORY'] || 1000;

/*
 * Try to get '/wsapi/awsbox_status', which the server will provide if
 * it's using the awsbox-connect middleware.  If that's not available,
 * get '/' to verify that the server is alive.
 */
function pingAddress(address, callback) {
  var start = Date.now();

  // timeout?
  request.get(address + '/wsapi/awsbox_status', function(err, res, body) {
    if (err) {
      return callback(err);
    }

    // yay - they have awsbox_status
    if (res.statusCode === 200) {
      var date = Date.now();
      var result = JSON.parse(body);
      result.statusCode = res.statusCode;
      result.data = date,
      result.time = date-start;
      return callback(null, result);
    }

    // no awsbox_status; just get '/'
    else {
      request.get(address, function(err, res, body) {
        var date = Date.now();
        return callback(null, {
          statusCode: res.statusCode,
          date: date,
          time: date - start
        });
      }).on('error', function(err) {
        // get '/' resulted in an error
        return callback(err);
      });
    }
  }).on('error', function(err) {
    // get 'wsapi/awsbox_status' resulted in an error
    return callback(err);
  });
}

/*
 * options:
 *   check_interval          interval between updates (seconds)
 */
function Awsmang(options) {
  events.EventEmitter.call(this);
  var self = this;

  options = options || {};

  // namespace for redis keys
  this.ns = options.redis_namespace || 'awsmang';

  // logger
  this.logger = new Logger();
  this.logger.level = options.log_level || 3;
  this.logger.colors = tty.isatty(process.stdout.fd);

  // start pinging servers
  this.logger.debug("Start pinging servers");
  setInterval(function() {
    self.pingServers();
  }, 1000*(options.check_interval || CHECK_INTERVAL_SEC));
  this.pingServers();

  return this;
};
util.inherits(Awsmang, events.EventEmitter);

Awsmang.prototype.startMonitoring = function(address, callback) {
  redis.sadd(this.ns+':addresses', address, function(err, results) {
    this.emit('addServer', {address: address});
    this.logger.info("added address: " + address);
    if (typeof callback === 'function') {
      callback(err, results);
    }
  }.bind(this));
};

Awsmang.prototype.stopMonitoring = function(address, callback) {
  redis.srem(this.ns+':addresses', address, function(err, results) {
    this.emit('removeServer', {address: address});
    this.logger.info("removed address: " + address);
    if (typeof callback === 'function') {
      callback(err, results);
    }
  }.bind(this));
};

Awsmang.prototype.pingServers = function() {
  var self = this;
  redis.smembers(this.ns+':addresses', function(err, addresses) {
    if (err) {
      self.logger.warn("redis.smembers: " + err);
    } else {
      addresses.forEach(function(address) {
        pingAddress(address, function(err, results) {
          if (err) {
            self.logger.warn(err.toString() + " " + address);
          } else {
            self.logger.info(results.statusCode + "  " + address + " ("+results.time+"ms) ");
          }

          var data = results || {err: err};
          redis.zadd(self.ns+':server:'+address, Date.now(), JSON.stringify(data));
          self.emit('update', {
            address: address,
            data: data
          });

          // keep zset no larger than HISTORY_SIZE
          redis.zremrangebyrank(self.ns+':server:'+address, HISTORY_SIZE, -1);
        });
      });
    }
  });
};

Awsmang.prototype.getStatuses = function(historyCount, callback) {
  var self = this;
  var i = 0;
  redis.smembers(this.ns+':addresses', function(err, addresses) {
    if (err) {
      self.logger.warn("redis.smembers: " + err);
    } else {
      var collected = 0;
      var result = {};
      addresses.forEach(function(address) {
        redis.zrange(self.ns+':server:'+address, 0, historyCount, 'WITHSCORES', function(err, data) {
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

module.exports = Awsmang;