const
vows = require('vows'),
assert = require('assert'),
redis = require('redis'),
express = require('express'),
Awsmang = require('../lib/awsmang'),
NS = 'test_awsmang';

// some variables will be created and modified by the test batches below
var port, server, mang;

vows.describe("awsmang")

.addBatch({
  "Make a server": {
    topic: function() {
      var cb = this.callback;
      server = express.createServer();
      server.configure(function() {
        server.use(server.router);
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
  "After adding a server": {
    topic: function() {
      var cb = this.callback;
      mang = new Awsmang({
        check_interval: 1,
        redis_namespace: NS
      });
      mang.on('addServer', function(message) {
        return cb(null, message);
      });
      mang.startMonitoring("http://localhost:"+port);
    },

    "we get an addServer message": function(message) {
      assert(message.address = 'http://localhost:'+port);
    },

    "we receive": {
      topic: function() {
        var cb = this.callback;
        mang.on('update', function(message) {
          if (message.address === 'http://localhost:'+port) {
            return cb(null, message);
          }
        });
      },

      "updates": function(message) {
        assert(message.data.statusCode === 200);
      }
    }

  }
})

.addBatch({
  "After removing a server": {
    topic: function() {
      var cb = this.callback;
      mang.on('removeServer', function(message) {
        return cb(null, message);
      });
      mang.stopMonitoring('http://localhost:'+port);
    },

    "we get a removeServer message": function(message) {
      assert(message.address === 'http://localhost:'+port);
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
