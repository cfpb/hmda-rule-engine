#!/usr/bin/env node

'use strict';

var inFN = __dirname + '/edit-timing.txt';
var outFN = __dirname + '/edit-timing.csv';
var chomp = require('line-chomper').chomp;
var _ = require('underscore');
var fs = require('fs');

try {
    fs.unlinkSync(outFN);
} catch (e) {
    // don't care, file doesn't exist
}

var header = 'Info,Runtime in Seconds\n';

var convert = function() {
    fs.appendFileSync(outFN, header);
    chomp(inFN, function(err, lines) {
        _.each(lines, function(line) {
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
