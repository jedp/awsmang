#!/usr/bin/env node
/* -*- mode: js2 -*- */

const
express = require('express'),
socket_io = require('socket.io'),
awsmang = require('../lib/awsmang');

/*
 * express app configuration
 */

var app = module.exports = express.createServer();
app.configure(function(){
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

/*
 * socket.io config
 */

var io = module.exports.io = socket_io.listen(app);
io.set('log level', 1);

io.sockets.on('connection', function(socket) {
  // When a socket connects, send it the lastest status for each server
  awsmang.getStatuses(100, function(err, statuses) {
    Object.keys(statuses).forEach(function(address) {
      socket.volatile.emit('addServer', {address: address, statuses: statuses[address]});
    });
  });
});

awsmang.on('update', function(message) {
  io.sockets.emit('update', message);
});
awsmang.on('removeServer', function(message) {
  io.sockets.emit('removeServer', message);
});
awsmang.on('addServer', function(message) {
  io.sockets.emit('addServer', message);
});
/*
 * There's only one view, and it shows you the monitor
 */

app.get('/', function(req, res) {
  res.render('dashboard');
});

/*
 * API
 *
 * PUT /<address>          start monitoring server at address
 * DELETE /<address>       stop monitoring server at address
 * GET /status             get last status for all servers; returns json
 * GET /status/:<address>  get status for one server; returns json
 */

function sanitizeAddress(input) {
  input = input || "";
  input = input.trim();
  // etc
  return input;
};

app.put('/:address', function(req, res) {
  var address = sanitizeAddress(req.params.address);
  if (address) {
    awsmang.startMonitoring(address);
    return res.send(200);
  }
  return res.send(500);
});

app.delete('/:address', function(req, res) {
  var address = sanitizeAddress(req.params.address);
  if (address) {
    awsmang.stopMonitoring(address);
    return res.send(200);
  }
  return res.send(500);
});

app.get('/status/:address?', function(req, res) {
  var address = req.params.address;
  if (address) {
    // status for one
  } else {
    // status for all
  }
});

// Maybe run

if (!module.parent) {
  app.listen(process.env.PORT || 3000);
  console.log("Listening on port %d in %s mode", app.address().port, app.settings.env);
}
