#!/usr/bin/env node
/* -*- mode: js2 -*- */

const
express = require('express'),
path = require('path'),
io = require('socket.io'),
awsmang = require('../lib/awsmang');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'static')));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
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
