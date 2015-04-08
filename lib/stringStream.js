'use strict';

var stream = require('stream');

var StringStream = function(engineCallback) {
    var output = '';
    var writeStream = new stream.Writable();

    writeStream._write = function(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
    };

    writeStream.on('finish', function() {
        engineCallback(output);
    });

    return writeStream;
};

module.exports = StringStream;