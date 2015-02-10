'use strict';

var Q = require('q');
var http = require('http');

var request = function(url) {
    var defered = Q.defer();

    if (typeof url !== 'string') {
      defered.reject(new Error('The URL/path must be a string.'));
    }

    var body = '';
    http.get(url, function(res) {
        if (res.statusCode >= 300) {
            defered.reject(new Error('Server responded with status code '+ res.statusCode));
        }

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            defered.resolve(body);
        });

    }).on('error', function(e) {
        defered.reject(e);
    });

    return defered.promise;
};

module.exports = request;