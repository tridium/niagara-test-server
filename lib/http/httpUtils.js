'use strict';

var fs = require('fs'),
    contentTypes = {
      'js': 'text/javascript',
      'css': 'text/css',
      'htm': 'text/html',
      'html': 'text/html',
      'txt': 'text/plain'
    };

/**
 * Is this a file a unit test would need?
 */
function getSupportedContentType(filePath, callback) {
  if (filePath) {
    fs.exists(filePath, function (exists) {
      if (exists) {
        var extension = filePath.substring(filePath.lastIndexOf('.') + 1) || 'txt';
        
        extension = extension.toLowerCase();
        
        callback(contentTypes[extension]);
      } else {
        callback();
      }
    });
  }
}

/**
 * Send the contents of the file back to the client. No caching
 */
function streamFile(filePath, res) {
  var readStream = fs.createReadStream(filePath);
  
  readStream.on('data', function (data) {
    res.write(data);
  });
  
  readStream.on('end', function () {
    res.end('\n');
  });
}

/**
 * File was found and supported, send 200 OK back to client and stream the
 * file to them
 */
function write200(res, filePath) {
  var extension = filePath.substring(filePath.lastIndexOf('.') + 1) || 'txt';
  
  extension = extension.toLowerCase();
  
  res.writeHead(200, { 'Content-Type': contentTypes[extension] });
  
  streamFile(filePath, res);
}

/**
 * File was not found
 */
function write404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.write('404 not found');
  res.end(); 
}

module.exports = {
  getSupportedContentType: getSupportedContentType,
  streamFile: streamFile,
  write200: write200,
  write404: write404
};
