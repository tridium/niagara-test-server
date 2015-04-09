/*jshint browser: true */
/*global define: false, ActiveXObject: false */

/**
 * Return a function to log into a station. The station MUST be configured
 * with 'Basic' authentication. (This is not okay for a production station but
 * okay for testing.) Login like this:
 * 
 * <code>
 * browserLogin('username', 'password', '/login', function () {
 *   //start up bajascript, etc.
 * });
 * </code>
 */
define(function () {
  'use strict';

  function doRequest(method, postData, url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {

        //TODO: when going through a Karma proxy, this blows up.
        //the port is different so the resultant 302 violates cross origin
        //policy.
        var status = parseInt(this.status, 10);
        if (status === 200 || status === 302) {
          callback();
        } else {
          callback('bad status: ' + status);
        }
      }
    };

    xhr.send(postData);
  }

  function addCookie(user) {
    document.cookie = 'niagara_userid=' + user + ';path=/;';
  }

  /**
   * Do a straight POST to the Jetty login service. Requires station to be
   * configured with 'basic' authentication.
   *
   * @param {String} user
   * @param {String} pass
   * @param {String|Function} [url='/j_security_check'] URL to POST to (or the
   * callback function)
   * @param {Function} [callback]
   */
  function jettyLoginBasic(user, pass, url, callback) {
    if (typeof url === 'function') {
      callback = url;
      url = '/j_security_check';
    }
    addCookie(user);
    doRequest('POST', 'j_username=' + user + '&j_password=' + pass, url, callback);
  }

  /**
   * Attempt to log in to the station using SCRAM-SHA authentication.
   *
   * @param {String} user
   * @param {String} pass
   * @param {String|Function} [url='/j_security_check'] URL to POST to (or the
   * callback function)
   * @param {Function} [callback]
   */
  function jettyLoginDigest(user, pass, url, callback) {
    if (typeof url === 'function') {
      callback = url;
      url = '/j_security_check';
    }
    addCookie(user);
    require(['/login/auth.min.js'], function () {
      define('sjcl', function () { return sjcl; });
      define('UNorm', function () { return UNorm; });
      define('sendHttp', function () { return sendHttp; });

      require(['ScramSha256Client'], function (ScramSha256Client) {
        ScramSha256Client.authenticate('/', user, pass,{
          ok: function(response){
            console.log('Successfully authenticated!');
            doRequest('GET', '', url, callback);
          },
          fail: function(error){
            callback('Could not authenticate using digest: ' + error);
          }
        });
      });
    });
  }
  
  return {
    jettyLogin: jettyLoginDigest
  };
});

