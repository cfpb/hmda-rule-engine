#!/usr/bin/env node

'use strict';

var inFN = __dirname + '/edit-timing.txt';
var outFN = __dirname + '/edit-timing.csv';
var chomp = require('line-chomper').chomp;
var _ = require('underscore');
var fs = require('fs');

var outBuffer = fs.createWriteStream(outFN);

var header = 'Edit ID,Scope,LAR Number,Runtime in Seconds\n';

var convert = function() {
    outBuffer.write(header);
    chomp(inFN, function(err, lines) {
        _.each(lines, function(line) {
            if (line.indexOf('time') !== -1) {
                line = line.replace(':',':::');
            }
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
            outBuffer.write(csvline+'\n');
        });
    });
};

convert();
