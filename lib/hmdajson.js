/*jshint evil:true*/
'use strict';

var chomp = require('line-chomper').chomp,
    specValidator = require('./filespecvalidator'),
    TYPES = require('./filerecordtypes');

var JSONOb = function() {
    this.hmdaFile = {
        transmittalSheet: {},
        loanApplicationRegisters: []
    };
    return this;
};

var _getRecordPrototype = function(line_spec) {
    var protoBody = '';
    for (var field in line_spec) {
        protoBody += 'this.' + field + '="";';
    }
    protoBody += 'this.lineNumber="";';
    return new Function(protoBody);
};

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

var HMDAProcessor = function() {
    this.jsonobj = new JSONOb();

    this.recordPrototypes = {};

    this.addRecordToJsonFunctions = {};
    this.addRecordToJsonFunctions[TYPES[0]] = function(record) {
        this.jsonobj.hmdaFile.transmittalSheet = record;
    };
    this.addRecordToJsonFunctions[TYPES[1]] = function(record) {
        this.jsonobj.hmdaFile.loanApplicationRegisters.push(record);
    };
};


HMDAProcessor.prototype.resetJsonOb = function() {
    this.jsonobj = new JSONOb();
};

HMDAProcessor.prototype.getJsonObject = function() {
    return this.jsonobj;
};

HMDAProcessor.prototype.parseLine = function(type, line_spec, line) {
    var result = { record: (this.recordPrototypes[type] ? new this.recordPrototypes[type]() : {}) };
    for(var field in line_spec) {
        if (line_spec.hasOwnProperty(field) && line.length >= line_spec[field].end) {
            var value = line.slice(line_spec[field].start-1, line_spec[field].end);
            if (line_spec[field].dataType === 'N' && !Number(value) && Number(value) !== 0) {
                result.error = '\'' + field + '\' must be a number';
                break;
            }
            result.record[field] = value.trim();
        } else {
            result.error = 'Line is not long enough to contain \'' + field + '\'';
            break;
        }
    }
    return result;
};

HMDAProcessor.prototype.process = function(file_stream, file_spec, next) {
    var error = checkParams(file_stream, file_spec);
    if (error) {
        return next(error, null);
    }
    this.resetJsonOb();
    var lineIdx = 0;
    chomp(
        file_stream,
        {
            trim: false,
            returnLines: false,
            lineCallback: function(line) {
                var type = TYPES[lineIdx] ? TYPES[lineIdx] : TYPES[1];
                var line_spec = file_spec[type];
                if (this.recordPrototypes[type] === undefined) {
                    this.recordPrototypes[type] = _getRecordPrototype(line_spec);
                }
                var result = this.parseLine(type, line_spec, line);
                var lineNumber = (lineIdx+1).toString();
                if (result.error) {
                    error = 'Error parsing ' + type + ' at line: ' + lineNumber + ' - ' + result.error;
                    return false;
                }
                result.record.lineNumber = lineNumber;
                if (this.addRecordToJsonFunctions[type]) {
                    this.addRecordToJsonFunctions[type].apply(this, [result.record]);
                }
                lineIdx++;
                return null;
            }.bind(this)
        },
        function(err, count) {
            if (error) {
                return next(error, null);
            }
            if (err) {
                return next(err, null);
            }
            return next(null, this.getJsonObject());
        }.bind(this)
    );
};

module.exports = new HMDAProcessor();
