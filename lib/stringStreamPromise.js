/* global -Promise */
'use strict';

var stream = require('stream'),
    Promise = require('bluebird');

var StringStreamPromise = function(inputStream) {
    var output = '';
    var writeStream = new stream.Writable();
    var deferred = Promise.defer();

    writeStream._write = function(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
    };

    writeStream.on('finish', function() {
        deferred.resolve(output);
    });

    inputStream.pipe(writeStream);

    return deferred.promise;
};

module.exports = StringStreamPromise;
