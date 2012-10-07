const
vows = require('vows'),
assert = require('assert'),
http = require('http'),
express = require('express'),
awsmang_connect = require('awsmang-connect'),
Awsmang = require('../lib/awsmang');

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
      assert(!!status.text);
    }
  }
})

.export(module);