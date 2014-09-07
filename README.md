niagara-test-server
===================

A tiny little HTTP server for use in Niagara unit testing. It knows how to do
a couple things.

moduledev
---------

It can read your `moduledev.properties` file, receive web requests
for Niagara module assets, and retrieve those files from their corresponding
`moduledev` locations. In most cases this won't be needed, since a test station
will be running in `moduledev` mode. In the case that your unit tests can't
start a station, but still need to reference Javascript files in other modules,
use `moduledev`.

To make use of this, proxy requests for `myStation:stationPort/module/` through
to `myServer:testServerPort/module/`.

test globals
------------

Add some globals in the server config:

    globals: {
      hello: 'world',
      foo: 'bar'
    }

Then require `niagara-test-server/globals` via RequireJS. It will give you a
global `testGlobals` object:

    console.log(window.testGlobals.hello); //'world'
    console.log(window.testGlobals.foo); //'bar'

Mostly useful when adding these to your Grunt config. When requiring
`niagara-test-server/public/karmaUtils` you'll magically get some special
behavior when you pass in certain globals:

* `testOnly` - a regex string. Only specs that match this will be run.
* `testNever` - a regex string. Specs that match this will never be run.

static files
------------

It can also serve up files that are located inside the module itself. Put them
in the `/public/` folder. Standard test utility files like logging into the
station should go here.

For instance, `/public/browserLogin.js` is accessible at 
`myServer:testServerPort/public/browserLogin.js`.

If you need it to do something else, you can pass it a ghetto-middleware
listener to receive other web requests as well.

It's useful for unit testing Niagara web apps.

Example
-------

    var config = {
      moduleDevFilePath: 'd:/niagara/r40/niagara_home/etc/moduledev.properties',
      host: '127.0.0.1',
      port: 8091,
      globals: {
        testOnly: '^myModule'
      }
    };
    
    var server = require('niagara-test-server');
    
    server.start(config, function (err, server) {
      if (err) {
        return;
      }
      
      // server is http.Server
      console.log('server started');
    });
