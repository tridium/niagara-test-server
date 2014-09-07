'use strict';

var url = require('url'),
    sep = require('path').sep,
    httpUtils = require('../httpUtils');

function getResolveDir() {
  return __dirname + '/public';
}

function accept(req, res) {
  var pathname = url.parse(req.url).pathname;
  
  if (pathname.indexOf('/public/') === 0) {
    
    var cwd = getResolveDir(),
        subPath = pathname.substring('/public/'.length),
        filePath = cwd + sep + subPath;
    
    httpUtils.getSupportedContentType(filePath, function (contentType) {
      if (filePath && contentType) {
        httpUtils.write200(res, filePath);
      } else {
        httpUtils.write404(res);
      }
    });
    
    return true;
  }
}

/**
 * Web service solely to serve up files from the niagara-test-server module.
 */
module.exports = {
  accept: accept
};
