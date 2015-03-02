/* global -Promise */
'use strict';

var Promise = require('bluebird');
var http = require('http');

var request = function(url) {
    var deferred = Promise.defer();

    if (typeof url !== 'string') {
      deferred.reject(new Error('The URL/path must be a string.'));
    }

    var body = '';
    http.get(url, function(res) {
        if (res.statusCode >= 300) {
            deferred.reject(new Error('Server responded with status code '+ res.statusCode+' for url ' + url));
        }

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            deferred.resolve(body);
        });

    }).on('error', function(e) {
        deferred.reject(e);
    });

    return deferred.promise;
};

module.exports = request;