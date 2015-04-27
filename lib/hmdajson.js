/*jshint evil:true*/
'use strict';

var chomp = require('line-chomper').chomp,
    RuleProgress = require('./ruleProgress'),
    specValidator = require('./filespecvalidator'),
    TYPES = require('./filerecordtypes').types;

/**
 * Create a new object that maps an HMDA data file
 * @constructs JSONOb
 * @example
 * // Empty, created with new
 * {
 *     "hmdaFile": {
 *         "transmittalSheet": {},
 *         "loanApplicationRegisters": []
 *     }
 * }
 *
 * // Filled, after [HMDAProcessor.process()]{@link HMDAProcessor#process} has been called
 * {
 *     "hmdaFile": {
 *          "transmittalSheet": {
 *               "recordID": "1",
 *               "respondentID": "0123456789",
 *               "agencyCode": "9",
 *               "timestamp": "201301171330",
 *               "filler": "",
 *               "activityYear": "2013",
 *               "taxID": "99-9999999",
 *               "totalLineEntries": "3000000",
 *               "institutionName": "MIKES SMALL BANK   XXXXXXXXXXX",
 *               "respondentAddress": "1234 Main St       XXXXXXXXXXXXXXXXXXXXX",
 *               "respondentCity": "Sacramento         XXXXXX",
 *               "respondentState": "CA",
 *               "respondentZip": "99999-9999",
 *               "parentName": "MIKES SMALL INC    XXXXXXXXXXX",
 *               "parentAddress": "1234 Kearney St    XXXXXXXXXXXXXXXXXXXXX",
 *               "parentCity": "San Francisco      XXXXXX",
 *               "parentState": "CA",
 *               "parentZip": "99999-1234",
 *               "contactName": "Mrs. Krabappel     XXXXXXXXXXX",
 *               "contactPhone": "916-999-9999",
 *               "contactFax": "999-753-9999",
 *               "respondentEmail": "krabappel@gmail.comXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
 *               "lineNumber": "1"
 *          },
 *          "loanApplicationRegisters": [
 *               {
 *                   "recordID": "2",
 *                   "respondentID": "0123456789",
 *                   "agencyCode": "9",
 *                   "loanNumber": "ABCDEFGHIJKLMNOPQRSTUVWXY",
 *                   "applicationReceivedDate": "20130117",
 *                   "loanType": "4",
 *                   "propertyType": "3",
 *                   "loanPurpose": "2",
 *                   "ownerOccupancy": "1",
 *                   "loanAmount": "10000",
 *                   "preapprovals": "1",
 *                   "actionTaken": "5",
 *                   "actionDate": "20130119",
 *                   "metroArea": "06920",
 *                   "fipsState": "06",
 *                   "fipsCounty": "034",
 *                   "censusTract": "0100.01",
 *                   "applicantEthnicity": "4",
 *                   "coapplicantEthnicity": "5",
 *                   "applicantRace1": "7",
 *                   "applicantRace2": "4",
 *                   "applicantRace3": "3",
 *                   "applicantRace4": "2",
 *                   "applicantRace5": "1",
 *                   "coapplicantRace1": "8",
 *                   "coapplicantRace2": "7",
 *                   "coapplicantRace3": "6",
 *                   "coapplicantRace4": "5",
 *                   "coapplicantRace5": "4",
 *                   "applicantSex": "1",
 *                   "coapplicantSex": "2",
 *                   "applicantIncome": "9000",
 *                   "purchaserType": "0",
 *                   "denialReason1": "9",
 *                   "denialReason2": "8",
 *                   "denialReason3": "7",
 *                   "rateSpread": "01.05",
 *                   "hoepaStatus": "2",
 *                   "lienStatus": "4",
 *                   "filler": "B",
 *                   "lineNumber": "2"
 *               }
 *          ]
 *     }
 * }
 */
var JSONOb = function() {
    this.hmdaFile = {
        transmittalSheet: {},
        loanApplicationRegisters: []
    };
    return this;
};

/**
 * Constructs a prototype function for an object to hold a line record
 * @param  {object} line_spec An object representation of the specification for this line, a sub-object of the {@link https://github.com/cfpb/hmda-rule-spec|file specification}
 * @return {Function}         A constructor function that returns an object to hold data based on the specification
 */
var _getRecordPrototype = function(line_spec) {
    var protoBody = '',
        fields = Object.keys(line_spec),
        fieldsLen = fields.length;

    for (var i = 0; i < fieldsLen; i++) {
        protoBody += 'this.' + fields[i] + '="";';
    }
    protoBody += 'this.lineNumber="";';
    return new Function(protoBody);
};

/**
 * Checks that our file_stream and file_spec exist, and that the file_spec validates
 * @param  {stream} file_stream A {@link https://nodejs.org/api/stream.html#stream_class_stream_readable|readable stream} of the HMDA data file
 * @param  {object} file_spec   {@link https://github.com/cfpb/hmda-rule-spec|The file specification object}
 * @return {string}             An error string
 */
var checkParams = function(file_stream, file_spec) {
    var error = null;
    if (!file_stream) {
        return 'Missing file to process';
    }
    if (!file_spec) {
        return 'Missing file specification';
    }
    error = specValidator.validate(file_spec);
    return error;
};

var doProgress = function(record, idx) {
    if (idx === 0) {
        var entries = +record.totalLineEntries;
        var lenChars = entries.toString().length;
        this.progress.factor = 1;
        if (lenChars > 2) {
            this.progress.factor = Math.pow(10, lenChars - 2);
        }
        this.progress.count = 0;
        this.progress.estimate = Math.floor(entries / this.progress.factor);
    } else {
        if (idx % this.progress.factor === 0) {
            this.postTaskCompletedMessage();
        }
    }
};

/**
 * Create a new instance of the HMDA File Processor
 * @constructs HMDAProcessor
 */
var HMDAProcessor = function() {
    this.jsonobj = new JSONOb();
    this.initProgress();
    this.recordPrototypes = {};

    this.addRecordToJsonFunctions = {};
    this.addRecordToJsonFunctions[TYPES[0]] = function(record) {
        this.jsonobj.hmdaFile.transmittalSheet = record;
    };
    this.addRecordToJsonFunctions[TYPES[1]] = function(record) {
        this.jsonobj.hmdaFile.loanApplicationRegisters.push(record);
    };
};

/**
 * Reset the JSONOb used in the processor to an empty instance
 * @this HMDAProcessor
 */
HMDAProcessor.prototype.resetJsonOb = function() {
    this.jsonobj = new JSONOb();
};

/**
 * Get the JSONOb used in the processor
 * @this HMDAProcessor
 * @return {JSONOb} The JSONOb that represents an HMDA data file
 */
HMDAProcessor.prototype.getJsonObject = function() {
    return this.jsonobj;
};

/**
 * Parses a single line of a HMDA data file into an object that is
 * is suitable for inserting into the JSONOb
 * @param  {string} type      The type of line
 * @param  {object} line_spec An object representation of the specification for this line, a sub-object of the {@link https://github.com/cfpb/hmda-rule-spec|file specification}
 * @param  {string} line      The line to parse
 * @this HMDAProcessor
 * @return {Object}           A result object that contains the record and/or errors
 */
HMDAProcessor.prototype.parseLine = function(type, line_spec, line) {
    var result = { record: (this.recordPrototypes[type] ? new this.recordPrototypes[type]() : {}) },
        fields = Object.keys(line_spec),
        fieldsLen = fields.length,
        lineLen = line.length;

    for (var i = 0; i < fieldsLen; i++) {
        var field = fields[i];
        var prop = line_spec[field];
        if (line_spec.hasOwnProperty(field) && lineLen >= prop.end) {
            var value = line.slice(prop.start - 1, prop.end);
            if (prop.dataType === 'N' && !Number(value) && Number(value) !== 0) {
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

/**
 * Processes an incoming {@link http://www.ffiec.gov/hmda/fileformats.htm|HMDA data file} as a stream into an object suitable to referencing within JavaScript
 * @param  {stream}   file_stream A {@link https://nodejs.org/api/stream.html#stream_class_stream_readable|readable stream} of the HMDA data file
 * @param  {object}   file_spec   {@link https://github.com/cfpb/hmda-rule-spec|The file specification object}
 * @param  {Function} next        callback function
 * @this HMDAProcessor
 * @return {JSONOb}               The object representation of the HMDA data file
 */
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
                var lineNumber = (lineIdx + 1).toString();
                if (result.error) {
                    error = 'Error parsing ' + type + ' at line: ' + lineNumber + ' - ' + result.error;
                    return false;
                }
                var record = result.record;
                record.lineNumber = lineNumber;
                if (this.addRecordToJsonFunctions[type]) {
                    this.addRecordToJsonFunctions[type].apply(this, [record]);
                }
                doProgress.apply(this, [record, lineIdx]);
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

RuleProgress.call(HMDAProcessor.prototype);
module.exports = new HMDAProcessor();
