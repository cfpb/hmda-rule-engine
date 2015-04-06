#!/usr/bin/env node

'use strict';

var outFN = __dirname + '/edit-timing.csv',
    chomp = require('line-chomper').chomp,
    _ = require('lodash'),
    fs = require('fs');

try {
    fs.unlinkSync(outFN);
} catch (e) {
    // don't care, file doesn't exist
}

var header = 'Info,Runtime in Seconds\n';

var convert = function() {
    fs.appendFileSync(outFN, header);
    chomp(process.stdin, function(err, lines) {
        _.each(lines, function(line) {
            console.log(line);
            var arr = _.map(line.split(':'), function(field) {
                field = field.trim();
                if (field.indexOf('ms') !== -1) {
                    field = (field.replace('ms', '') / 1000).toFixed(3);
                } else {
                    field = '"'+field+'"';
                }
                return field;
            });
            var csvline = arr.join(',');
            fs.appendFileSync(outFN, csvline+'\n');
        });
    });
};

convert();
