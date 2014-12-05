'use strict';

var chomp = require('line-chomper').chomp;
var specValidator = require('./filespecvalidator');
var TYPES = require('./filerecordtypes');

var _JSONOBJ = {};

var _addTransmittalSheet = function(record) {
    _JSONOBJ.hmdaFile.transmittalSheet = record;
};

var _addLoanApplicationRegister = function(record) {
    _JSONOBJ.hmdaFile.loanApplicationRegisters.push(record);
};


var typeFunctions = {};
typeFunctions[TYPES[0]] = _addTransmittalSheet;
typeFunctions[TYPES[1]] = _addLoanApplicationRegister;

var checkParams = function(file_stream, file_spec) {
    var error = null;
    if (! file_stream) {
        return 'Missing file to process';
    }
    if (! file_spec) {
        return 'Missing file specification';
    }
    error = specValidator.validate(file_spec);
    return error;
};

var HMDAJson = function() {
    var processor = {};

    processor.resetJsonOb = function() {
        _JSONOBJ = {
            hmdaFile: {
                transmittalSheet: {},
                loanApplicationRegisters: []
            }
        };
    };

    processor.addToJsonOb = function(type, record) {
        var func = typeFunctions[type];
        if (func) {
            func(record);
        }
    };

    processor.getJsonObject = function() {
        return _JSONOBJ;
    };

    processor.parseLine = function(line_spec, line) {
        var record = {};
        for(var field in line_spec) {
            if (line_spec.hasOwnProperty(field) && line.length >= line_spec[field].end) {
                record[field] = line.slice(line_spec[field].start-1, line_spec[field].end);
            } else {
                return false;
            }
        }
        return record;
    };

    processor.process = function(file_stream, file_spec, next) {
        var error = checkParams(file_stream, file_spec);
        if (error) {
            return next(error, null);
        }
        processor.resetJsonOb();
        chomp(file_stream, {trim: false}, function(err, lines) {
            for (var lineIdx=0; lineIdx < lines.length; lineIdx++) {
                var type = TYPES[lineIdx] ? TYPES[lineIdx] : TYPES[1];
                var line_spec = file_spec[type];
                var record = processor.parseLine(line_spec, lines[lineIdx]);
                if (! record) {
                    error = 'Error parsing ' + type + ' at line: ' + (lineIdx+1);
                    return next(error, null);
                }
                processor.addToJsonOb(type, record);
            }
            return next(error, processor.getJsonObject());
        });
    };

    return processor;
};

module.exports = new HMDAJson();
