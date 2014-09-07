var url = require('url'),
    globalsModule;

function accept(req, res) {
  var pathname = url.parse(req.url).pathname;

  if (pathname.match('/globals')) {
    res.end(globalsModule);
    return true;
  }
}

function start(config, callback) {
  if (config.globals) {
    globalsModule =
      'define([], function () {\n' +
      '  "use strict";\n' +
      '  window.testGlobals = ' + JSON.stringify(config.globals) + ';\n' +
      '});\n';
  }

  callback();
}

/**
 * Sets up a global `testGlobals` object, configured with `config.globals`.
 * This allows for command line flags or other configuration information to
 * be injected directly into the browser for use by unit tests.
 * 
 * See `testOnly` and `testNever` flags in `grunt-niagara` for an example of
 * how this works - these command line flags are processed in the Gruntfile
 * and injected into the browser to filter which Jasmine tests are run.
 */
module.exports = {
  accept: accept,
  start: start
};