'use strict';

var url = require('url'),
    httpUtils = require('../httpUtils'),
    moduledev = require('niagara-moduledev'),
    md,

    ORD_REGEX = /^ord[\?\/]/,
    MODULE_URL_REGEX = /\/module\//;

function getOrd(url) {
  if (MODULE_URL_REGEX.test(url)) {
    return url;
  }

  if (ORD_REGEX.test(url)) {
    return url.substring(4);
  }
}

function accept(req, res) {
  var pathname = url.parse(req.url).pathname,
      ord = getOrd(pathname);

  if (!ord) { //not an ord, no love
    return false;
  }

  md.getFilePath(ord, function (err, filePath) {
    if (err) {
      console.error(err);
      return httpUtils.write404(res);
    }

    //  console.log(pathname + ' -> ' + filePath);

    httpUtils.getSupportedContentType(filePath, function (contentType) {
      if (contentType) {
        httpUtils.write200(res, filePath, contentType);
      } else {
        httpUtils.write404(res);
      }
    });
  });

  return true;
}

/**
 * Needs path to moduledev.properties as config.moduleDevPath.
 */
function start(config, callback) {
  var path = config.moduleDevFilePath;
  
  if (!path) {
    return callback("config.moduleDevFilePath must be provided");
  }
  
  moduledev.fromFile(path, function (err, reg) {
    if (err) {
      return callback(err);
    }
    
    md = reg;
    callback();
  });
}

/**
 * Web service to intercept requests to /module/, look up the file from
 * moduledev.properties, and serve it up instead.
 */
module.exports = {
  accept: accept,
  start: start
};
