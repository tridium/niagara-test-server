/*jshint devel: true, browser: true *//* eslint-env browser */
/*global define: false, jasmine: false */

define([], function defineKarmaUtils() {
  'use strict';

  /**
   * Add extra behavior from any globals set in niagara-test-server config.
   * @see niagara-test-server/lib/http/routes/globals
   */
  function setupFromGlobals() {
    var g = window.testGlobals;

    if (!g) {
      return;
    }

    var _it = window.it;

    function getCurrentDescribe() {
      var suite = jasmine.getEnv().currentSuite,
          description = '';

      while (suite) {
        if (description) {
          description = ' ' + description;
        }
        description = suite.description + description;
        suite = suite.parentSuite;
      }

      return description;
    }

    window.it = function (description, func) {
      var currentDescribe = getCurrentDescribe(),
          fullSpec = currentDescribe + ' ' + description,
          testOnly = g.testOnly,
          testNever = g.testNever;

      if (testNever && fullSpec.match(testNever)) {
        return;
      }

      if (testOnly && !fullSpec.match(testOnly)) {
        return;
      }

      return _it(description, func);
    };
  }
  
  /**
   * @exports niagara-test-server/karmaUtils
   */
  var exports = {};

  /**
   * So these endless "there is no timestamp" errors pop up because we're using
   * RequireJS to pull files direct from the station. We do this by proxying
   * /module/ through Karma to {stationHost:stationPort}/module/.
   *
   * Karma doesn't like this because it doesn't know about it in its 'files'
   * config. It responds by throwing up these errors in the log. So until Karma
   * makes this configurable let's just hush these errors up already.
   *
   * (We will still get ONE, for loading this very file... better than 200.
   *
   * https://github.com/karma-runner/karma-requirejs/issues/6
   *
   * Note that this function will automatically be called by `setupBrowser`
   * and `setupAndRunSpecs`.
   */
  exports.quietTimestampErrors = function quietTimestampErrors() {
    if (typeof console === 'undefined') {
      return;
    }

    var _error = console.error,
        ERR_STR = 'There is no timestamp for';

    console.error = function (msg) {
      if (String(msg).substr(0, ERR_STR.length) === ERR_STR) {
        //shhhh
      } else {
        _error.apply(this, arguments);
      }
    };
  };

  /**
   * Loads the given RequireJS dependencies (does not do anything with module
   * exports), then execute Karma tests.
   *
   * If `testGlobals.testWithBuiltfiles` and `testGlobals.moduleName` are present, will preload
   * those builtfiles so tests are run in an environment closer to production. Otherwise, any
   * builtfiles will be prevented from loading.
   *
   * @param {Array.<String>} specs RequireJS module IDs of specs to run
   * @param {Function} callback callback to be called after specs are loaded
   * and Karma tests have started
   */
  exports.runSpecs = function runSpecs(specs, callback) {
    runOrDisableBuiltfiles((err) => {
      if (err) {
        console.error(err);
      }
      require(specs, function () {
        try {
          window.__karma__.start();
          callback();
        } catch (e) {
          return callback(e);
        }
      }, callback);
    });
  };

  /**
   * either run builtfiles (when testWithBuiltfiles = true), testing closer to production
   * conditions, or disable them, so they do not affect the test run.
   * @param callback
   */
  function runOrDisableBuiltfiles(callback) {
    const { testWithBuiltfiles, moduleName } = window.testGlobals || {};

    if (!require.specified('baja')) {
      console.log('BajaScript not configured. No builtfiles will be loaded.');
      return callback(null, []);
    }

    retrieveAllBuiltfiles(moduleName, (err, builtfileArrays) => {
      if (err) { return callback(err); }

      if (testWithBuiltfiles) {
        doRequire(builtfileArrays, callback);
      } else {
        flatten(builtfileArrays).forEach((builtfile) => {
          // if not testing with builtfiles, they should be disabled, so we test with real code and
          // debugging is straightforward.
          define(builtfile);
        });
        callback();
      }
    });
  }

  function doForEach(arr, func, callback) {
    if (!arr.length) {
      return callback();
    }
    const [ first, ...rest ] = arr;
    func(first, () => doForEach(rest, func, callback));
  }

  function doRequire(arrayOfDepsArrays, callback) {
    doForEach(arrayOfDepsArrays, (deps, cb) => require(deps, cb), callback);
  }

  function flatten(arrays) {
    return arrays.reduce((a = [], b = []) => [ ...a, ...b ], []);
  }

  function retrieveAllBuiltfiles(moduleName, callback) {
    if (!moduleName) {
      return callback(null, []);
    }

    require([ 'baja!' ], function (baja) {
      baja.registry.getConcreteTypes({ type: 'web:JsBuild' })
        .then((types) => {
          const myModuleBuilds = types.filter((t) => t.getModuleName() === moduleName);
          return baja.importTypes(myModuleBuilds);
        })
        .then((jsBuildTypes) => {
          const builtfileArrays = jsBuildTypes.map((type) => type.getJsDependencies());
          const maxLength = Math.max(...builtfileArrays.map((arr) => arr.length));

          const result = [];
          for (let i = 0; i < maxLength; ++i) {
            result[i] = flatten(builtfileArrays.map((arr) => arr[i]));
          }
          callback(null, result);
        }, callback);
    }, callback);
  }


  /**
   * Sets up browser environment by quieting relentless Karma timestamp errors
   * and logging into the station (using default Jetty login behavior).
   *
   * @param {Object} params
   * @param {String} params.user username to log into the station
   * @param {String} params.pass password to log into the station
   * @param {String} [params.url="/j_security_check"] URL to send the login POST
   * to
   * @param {Function} callback callback to be called when login is complete
   */
  exports.setupBrowser = function setupBrowser(params, callback) {
    if (!params) {
      throw new Error('params object required');
    }

    if (!callback) {
      throw new Error('callback function required');
    }

    var user = params.user,
        pass = params.pass,
        url = params.url || '/j_security_check';

    exports.quietTimestampErrors();

    require([ 'niagara-test-server/browserLogin' ], function (browserLogin) {
      browserLogin.jettyLogin(user, pass, url, function (err) {

        //TODO: bad status is due to CORS not being supported. revisit when karma-proxy becomes a plugin.
        /*
         * if you look at the bottom of lib/middleware/proxy.js in the Karma
         * source, it sets the changeOrigin flag to true which prevents
         * us from successfully POSTing through to /j_security_check on the
         * station. the status code comes back as 0 but we do get the cookie
         * set which is all we need. once we can inject some different behavior
         * via a proxy plugin, we can strip out this check.
         */
        if (err && err !== 'bad status: 0') {
          return callback(err);
        }

        setupFromGlobals();
        
        callback();
      });
    }, callback);
  };



  /**
   * Sets up browser environment, loads specs, and runs Karma tests.
   * (Essentially, just do `setupBrowser` and `runSpecs` in one call.)
   *
   * @param {Object} params
   * @param {String} params.user username to log into the station
   * @param {String} params.pass password to log into the station
   * @param {Array.<String>} params.specs array of module IDs containing Jasmine
   * specs to load. Note that nothing will be done with the export values of
   * these modules - they are just loaded using require().
   * @param {Function} callback callback function to run after all specs have
   * loaded and Karma tests have been run (or an error occurred at any point)
   *
   * @see runSpecs
   * @see setupBrowser
   */
  exports.setupAndRunSpecs = function setupAndRunSpecs(params, callback) {
    if (!callback) {
      throw new Error('callback function required');
    }

    exports.setupBrowser(params, function (err) {
      if (err) {
        return callback(err);
      }

      exports.runSpecs(params.specs, callback);
    });
  };

  return exports;
});
