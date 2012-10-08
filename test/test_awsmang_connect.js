const
vows = require('vows'),
assert = require('assert'),
redis = require('redis'),
http = require('http'),
express = require('express'),
awsmang_connect = require('awsmang-connect'),
Awsmang = require('../lib/awsmang'),
NS = 'test_awsmang_connect';

// some variables will be created and modified by the test batches below
var port, server;

function getUrl(path, callback) {
  var buf = "";
  http.get({host: 'localhost', port: port, path: path}, function(res) {
    res.on('data', function(chunk) {
      buf += chunk;
    });
    res.on('end', function() {
      return callback(null, {code: res.statusCode, text: buf.toString()});
    });
  }).on('error', function(err) {
    return callback(err);
  });
}

vows.describe("awsmang-connect")

.addBatch({
  "Make a server": {
    topic: function() {
      var cb = this.callback;
      server = express.createServer();
      server.configure(function() {
        server.use(server.router);
        server.use(awsmang_connect);
      });
      server.get('/', function(req, res) {
        res.writeHead(200);
        return res.end("ok");
      });
      server.listen(0, function() {
        port = server.address().port;
        cb();
      });
    },

    "for testing": function() {
      assert(port > 0);
    }
  }
})

.addBatch({
  "GET /wsapi/awsbox_status": {
    topic: function() {
      getUrl('/wsapi/awsbox_status', this.callback);
    },

    "returns 200": function(err, status) {
      assert(err === null);
      assert(status.code === 200);
    },

    "returns status": function(err, status) {
      assert(err === null);
      assert(typeof JSON.parse(status.text) === 'object');
    }
  },

  "awsmang": {
    topic: function() {
      var cb = this.callback;
      var awsmang = new Awsmang({
        check_interval: 1,
        redis_namespace: NS
      });
      awsmang.on('update', function(message) {
        awsmang.stopMonitoring('http://localhost:'+port, function(err) {
          return cb(null, message);
        });
      });
      awsmang.startMonitoring('http://localhost:'+port);
    },

    "gets status 200": function(message) {
      assert(message.data.statusCode === 200);
    },

    "gets awsmang_status data": function(message) {
      // for example, cpu data
      assert(!!message.data.cpu);
    }
  }
})

.addBatch({
  "Clean up db": {
    topic: function() {
      var cb = this.callback;
      var deleted = 0;
      var client = redis.createClient();
      client.keys(NS+'*', function(err, keys) {
        var numKeys = keys.length;
        keys.forEach(function(key) {
          client.del(key, function(err, result) {
            if (err) {
              return cb(err);
            }
            deleted += 1;
            if (deleted === numKeys) {
              return cb(null, numKeys);
            }
          });
        });
      });
    },

    "ok": function(err, removed) {
      assert(!err);
      assert(removed);
    }
  }
})

.export(module);