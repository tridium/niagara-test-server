'use strict';

var http = require('http'),
    moduledev = require('./http/routes/moduledev'),
    globals = require('./http/routes/globals'),
    pub = require('./http/routes/public'),
    httpUtils = require('./http/httpUtils'),
    server;

function startListeners(listeners, config, callback) {
  (function startListener(i) {
    if (i >= listeners.length) {
      return callback();
    }

    function next() {
      startListener(i + 1);
    }

    var listener = listeners[i];

    if (typeof listener.accept !== 'function') {
      return callback("listener must have accept() method");
    }
    
    if (typeof listener.start !== 'function') {
      return next();
    }
    
    listener.start(config, function (err) {
      if (err) {
        return callback(err);
      }
      next();
    });
  }(0));
}

function delegateToListeners(listeners, req, res) {
  var i;
  
  for (i = 0; i < listeners.length; i++) {
    if (listeners[i].accept(req, res)) {
      return;
    }
  }
  
  httpUtils.write404(res);
}

function start(config, callback) {
  var listeners = [ moduledev, globals, pub ].concat(config.listeners || []);

  try {

    startListeners(listeners, config, function (err) {
      if (err) {
        return callback(err);
      }

      console.log("niagara-test-server is starting HTTP listener: host " +
        config.host + ", " + " port " + config.port);

      server = http.createServer(function (req, res) {
        delegateToListeners(listeners, req, res);
      }).listen(config.port, config.host);

      console.log("niagara-test-server started successfully.");

      callback(null, server);
    });
  } catch (e) {
    return callback(e);
  }
}

function stop(callback) {
  if (!server) {
    return callback("server not started");
  }
  
  server.close(callback);
}

/**
 * HTTP listener to serve up files specifically for a "testing JS on a station"
 * context. Defines a number of listeners:
 * - /modules/ - route to routes/moduledev.js (for moduledev.properties smarts)
 * - /globals/ - route to routes/globals.js (for Jasmine test smarts)
 * - /public/ - route to routes/public.js (to serve straight from this module)
 */
module.exports = {
  start: start,
  stop: stop
};