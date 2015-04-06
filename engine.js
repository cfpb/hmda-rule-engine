/*global window:false*/
/* global -Promise */
'use strict';

var CSVProcessor = require('./lib/csvprocessor'),
    EngineBaseConditions = require('./lib/engineBaseConditions'),
    EngineCustomConditions = require('./lib/engineCustomConditions'),
    EngineCustomDataLookupConditions = require('./lib/engineCustomDataLookupConditions'),
    EngineApiInterface = require('./lib/engineApiInterface'),
    EngineLocalDB = require('./lib/engineLocalDB'),
    RuleParseAndExec = require('./lib/ruleParseAndExec'),
    RuleProgress = require('./lib/ruleProgress'),
    utils = require('./lib/utils'),
    hmdajson = require('./lib/hmdajson'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore'),
    stream = require('stream'),
    EventEmitter = require('events').EventEmitter,
    Promise = require('bluebird');

function Errors() {
    return {
        syntactical: {},
        validity: {},
        quality: {},
        macro: {},
        special: {}
    };
}

function Progress() {
    return {
        events: new EventEmitter(),
        throttle: 0,
        count: 0,
        estimate: 0
    };
}

/**
 * Construct a new HMDAEngine instance
 * @constructs HMDAEngine
 */
function HMDAEngine() {
    this.apiURL;
    this.currentYear;
    this.errors = new Errors();
    this.progress = new Progress();
    this._DEBUG_LEVEL = 0;
    this._HMDA_JSON = {};
    this._CONCURRENT_RULES = 10;
    this._LOCAL_DB = null;
    this._USE_LOCAL_DB = false;
}

/*
 * -----------------------------------------------------
 * Managed State Getter/Setter
 * -----------------------------------------------------
 */

/**
 * Set the base API URL
 * @param {string} url The URL to the API
 * @example
 * engine.setAPIURL('http://localhost:9000');
 */
HMDAEngine.prototype.setAPIURL = function(url) {
    this.apiURL = url;
};

/**
 * Get the currently set API URL
 * @return {string} The URL to the API
 */
HMDAEngine.prototype.getAPIURL = function() {
    return this.apiURL;
};

/**
 * Set the current year the engine is working against
 * @param {string} year The year
 */
HMDAEngine.prototype.setRuleYear = function(year) {
    this.currentYear = year;
};

/**
 * Get the current year the engine is working against
 * @return {string} The year
 */
HMDAEngine.prototype.getRuleYear = function() {
    return this.currentYear;
};

/**
 * Reset the internal errors object
 */
HMDAEngine.prototype.clearErrors = function() {
    this.errors = new Errors();
};

/**
 * Get the errors object populated after running edits
 * @return {object} The {@link https://github.com/cfpb/hmda-pilot/wiki/Edit-Errors-JSON-schema|errors object}
 */
HMDAEngine.prototype.getErrors = function() {
    return this.errors;
};

/**
 * clears out the counts and estimates for the progress object
 */
HMDAEngine.prototype.clearProgress = function() {
    this.progress.count = 0;
    this.progress.estimate = 0;
};

/**
 * Get the progress object used for task completion events displayed on the progress bar
 * @return {object} Progress object containing an eventemitter for progress notification
 */
HMDAEngine.prototype.getProgress = function() {
    return this.progress;
};


/**
 * Clear the current HMDA JSON object from the engine
 */
HMDAEngine.prototype.clearHmdaJson = function() {
    this._HMDA_JSON = {};
};

/**
 * Get the currently set HMDA JSON object
 * @return {JSONOb} The HMDA JSON object
 */
HMDAEngine.prototype.getHmdaJson = function() {
    return this._HMDA_JSON;
};

/**
 * Manually set the HMDA JSON object, usually set with {@link HMDAEngine#fileToJson|HMDAEngine.prototype.fileToJson()}
 * @param {JSONOb} newHmdaJson The HMDA JSON object
 */
HMDAEngine.prototype.setHmdaJson = function(newHmdaJson) {
    this._HMDA_JSON = newHmdaJson;
};

/**
 * Set the debugging level
 * @param {integer} level Valid values: 1, 2, or 3
 */
HMDAEngine.prototype.setDebug = function(level) {
    this._DEBUG_LEVEL = level;
};

/**
 * Get the currently set debug level
 * @return {integer} The current level
 */
HMDAEngine.prototype.getDebug = function() {
    return this._DEBUG_LEVEL;
};

/**
 * Allow the use of LocalDB to speed up queries during edit processing
 * @param {boolean} bool Valid values: true, false
 */
HMDAEngine.prototype.setUseLocalDB = function(bool) {
    this._USE_LOCAL_DB = bool;
    if (bool) {
        return this.resetDB();
    } else {
        return this.destroyDB();
    }
};


/*
 * -----------------------------------------------------
 * Convenience
 * -----------------------------------------------------
 */

/**
 * Get the available years that have edits defined.
 * Convenience method for {@link https://github.com/cfpb/hmda-rule-spec|SpecAPI.getValidYears}
 * @return {array} Array of valid years
 */
HMDAEngine.prototype.getValidYears = function() {
    return hmdaRuleSpec.getValidYears();
};

/**
 * Get the defined file specification for the year.
 * Convenience method for {@link https://github.com/cfpb/hmda-rule-spec|SpecAPI.getFileSpec}
 * @param  {string} year Year for the file specification
 * @return {object}      Object defining the file specification
 */
HMDAEngine.prototype.getFileSpec = function(year) {
    return hmdaRuleSpec.getFileSpec(year);
};


/*
 * -----------------------------------------------------
 * Parsing
 * -----------------------------------------------------
 */

/**
 * Given a proper HMDA DAT file, and specified year, store a JSON representation
 * of the DAT internally in the engine
 * @param  {file}     file Either a browser FileReader, or stream
 * @param  {string}   year Year for the file specification to process the file against
 * @param  {Function} next callback function in form of callback(err, result)
 * @see {@link HMDAProcessor#process|HMDAProcessor.process()} for more information
 */
HMDAEngine.prototype.fileToJson = function(file, year, next) {
    var spec = hmdaRuleSpec.getFileSpec(year);

    // If file is not an instance of a stream, make it one!
    if (typeof file.on !== 'function') { // use duck type checking to see if file is a stream obj or not
        var s = new stream.Readable();
        s._read = function noop() {};
        s.push(file);
        s.push(null);
        file = s;
    }

    hmdajson.process(file, spec, function(err, result) {
        if (! err && result) {
            this._HMDA_JSON = result;
        }
        next(err, this._HMDA_JSON);
    }.bind(this));
};

/*
 * -----------------------------------------------------
 * Public Interface for Rule Execution
 * -----------------------------------------------------
 */

/**
 * Produces the HMDA Institution Register Summary (IRS) report data
 * @param  {array} loanApplicationRegisters An array of the LARs to process
 * @return {array}                          An array of the results
 */
HMDAEngine.prototype.getTotalsByMSA = function(hmdaFile) {
    // get the msa branch list for depository to reduce calls to API
    var depository = (hmdaFile.transmittalSheet.agencyCode==='7') ? false : true;
    return this.getMetroAreasOnRespondentPanel(hmdaFile.transmittalSheet.agencyCode, hmdaFile.transmittalSheet.respondentID)
    .then(function (branchResult) {
        return Promise.all(_.chain(hmdaFile.loanApplicationRegisters)
        .groupBy('metroArea')
        .pick(function (lar, metroArea) {
            return (!depository && lar.length>=5) ||
                (depository && _.contains(branchResult,metroArea)) ||
                (metroArea==='NA');
        })
        .collect(function(value, key) {
            return this.getMSAName(key).then(function(msaName) {
                var result = {msaCode: key, msaName: msaName, totalLAR: 0, totalLoanAmount: 0, totalConventional: 0, totalFHA: 0, totalVA: 0, totalFSA: 0,
                    total1To4Family: 0, totalMFD: 0, totalMultifamily: 0, totalHomePurchase: 0, totalHomeImprovement: 0, totalRefinance: 0};
                _.each(value, function(element) {
                    result.totalLAR++;
                    result.totalLoanAmount += +element.loanAmount;

                    if (element.loanType === '1') {
                        result.totalConventional++;
                    } else if (element.loanType === '2') {
                        result.totalFHA++;
                    } else if (element.loanType === '3') {
                        result.totalVA++;
                    } else if (element.loanType === '4') {
                        result.totalFSA++;
                    }

                    if (element.propertyType === '1') {
                        result.total1To4Family++;
                    } else if (element.propertyType === '2') {
                        result.totalMFD++;
                    } else if (element.propertyType === '3') {
                        result.totalMultifamily++;
                    }

                    if (element.loanPurpose === '1') {
                        result.totalHomePurchase++;
                    } else if (element.loanPurpose === '2') {
                        result.totalHomeImprovement++;
                    } else if (element.loanPurpose === '3') {
                        result.totalRefinance++;
                    }
                });
                return result;
            });
        }.bind(this))
        .sortBy('msaCode')
        .value());
    }.bind(this));
};

/**
 * Run the Syntactical edits for a given year
 * @param  {string}  year The specific year of the edit specification to work with
 * @return {Promise}      A Promise for the finished edit process
 */
HMDAEngine.prototype.runSyntactical = function(year) {
    /* istanbul ignore if */
    if (this.getDebug()) {
        console.time('time to run syntactical rules');
    }
    this.calcEstimatedTasks(year, ['ts','lar','hmda'], 'syntactical');
    return Promise.all([
        this.runEdits(year, 'ts', 'syntactical'),
        this.runEdits(year, 'lar', 'syntactical'),
        this.runEdits(year, 'hmda', 'syntactical')
    ])
    .then(function() {
        /* istanbul ignore if */
        if (this.getDebug()) {
            console.timeEnd('time to run syntactical rules');
        }
    }.bind(this))
    .catch(function(err) {
        return utils.resolveError(err);
    });
};

/**
 * Run the Validity edits for a given year
 * @param  {string}  year The specific year of the edit specification to work with
 * @return {Promise}      A Promise for the finished edit process
 */
HMDAEngine.prototype.runValidity = function(year) {
    var validityPromise;
    this.calcEstimatedTasks(year, ['ts','lar'], 'validity');
    if (this.shouldUseLocalDB()) {
        validityPromise = this.loadCensusData()
        .then(function() {
            return Promise.all([
                this.runEdits(year, 'ts', 'validity'),
                this.runEdits(year, 'lar', 'validity')
            ]);
        }.bind(this));
    } else {
        validityPromise = Promise.all([
            this.runEdits(year, 'ts', 'validity'),
            this.runEdits(year, 'lar', 'validity')
        ]);
    }
    /* istanbul ignore if */
    if (this.getDebug()) {
        console.time('time to run validity rules');
    }
    return validityPromise
    .then(function() {
        /* istanbul ignore if */
        if (this.getDebug()) {
            console.timeEnd('time to run validity rules');
        }
    }.bind(this))
    .catch(function(err) {
        return utils.resolveError(err);
    });
};

/**
 * Run the Quality edits for a given year
 * @param  {string}  year The specific year of the edit specification to work with
 * @return {Promise}      A Promise for the finished edit process
 */
HMDAEngine.prototype.runQuality = function(year) {
    /* istanbul ignore if */
    if (this.getDebug()) {
        console.time('time to run quality rules');
    }
    this.calcEstimatedTasks(year, ['ts','lar','hmda'], 'quality');
    return Promise.all([
        this.runEdits(year, 'ts', 'quality'),
        this.runEdits(year, 'lar', 'quality'),
        this.runEdits(year, 'hmda', 'quality')
    ])
    .then(function() {
        /* istanbul ignore if */
        if (this.getDebug()) {
            console.timeEnd('time to run quality rules');
        }
    }.bind(this))
    .catch(function(err) {
        return utils.resolveError(err);
    });
};

/**
 * Run the Macro Quality edits for a given year
 * @param  {string}  year The specific year of the edit specification to work with
 * @return {Promise}      A Promise for the finished edit process
 */
HMDAEngine.prototype.runMacro = function(year) {
    /* istanbul ignore if */
    if (this.getDebug()) {
        console.time('time to run macro rules');
    }
    this.calcEstimatedTasks(year, ['hmda'], 'macro');
    return Promise.all([
        this.runEdits(year, 'hmda', 'macro')
    ])
    .then(function() {
        /* istanbul ignore if */
        if (this.getDebug()) {
            console.timeEnd('time to run macro rules');
        }
    }.bind(this))
    .catch(function(err) {
        return utils.resolveError(err);
    });
};

/**
 * Run the Specialized edits (Q029, Q595) for a given year
 * @param  {string}  year The specific year of the edit specification to work with
 * @return {Promise}      A Promise for the finished edit process
 */
HMDAEngine.prototype.runSpecial = function(year) {
    /* istanbul ignore if */
    if (this.getDebug()) {
        console.time('time to run special rules');
    }
    this.calcEstimatedTasks(year, ['hmda'], 'special');
    return Promise.all([
        this.runEdits(year, 'hmda', 'special')
    ])
    .then(function() {
        /* istanbul ignore if */
        if (this.getDebug()) {
            console.timeEnd('time to run special rules');
        }
    }.bind(this))
    .catch(function(err) {
        return utils.resolveError(err);
    });
};

/**
 * Export errors in csv format for an individual edit
 * @param {string} year         The specific year of the file specification to work with
 * @param {string} errorType    The edit category. Valid values: 'syntactical', 'validity', 'quality', 'macro'
 * @param {string} errorID      The ID of the edit to export
 * @param {object} writeStream  Handle to a {@link https://nodejs.org/api/stream.html#stream_class_stream_writable_1|stream.Writable} instance to output to
 * @see {@link CSVProcessor|CSVProcessor} for more info
 */
HMDAEngine.prototype.exportIndividual = function(year, errorType, errorID, writeStream) {
    var csvProcessorIndividual = new CSVProcessor(year, writeStream, 'individual');
    if (this.getErrors()[errorType][errorID]) {
        var errorsIndividual = {};
        errorsIndividual[errorID] = this.getErrors()[errorType][errorID];
        csvProcessorIndividual.write(errorsIndividual);
    }

    csvProcessorIndividual.end();
};

/**
 * Export errors in csv format for all errors of a specific type
 * @param {string} year         The specific year of the file specification to work with
 * @param {string} errorType    The edit category. Valid values: 'syntactical', 'validity', 'quality', 'macro'
 * @param {object} writeStream  Handle to a {@link https://nodejs.org/api/stream.html#stream_class_stream_writable_1|stream.Writable} instance to output to
 * @see {@link CSVProcessor|CSVProcessor} for more info
 */
HMDAEngine.prototype.exportAll = function(year, errorType, writeStream) {
    var csvProcessorAll = new CSVProcessor(year, writeStream, 'all');
    if (this.getErrors()[errorType]) {
        csvProcessorAll.write(this.getErrors()[errorType]);
    }

    csvProcessorAll.end();
};

/*
 * -----------------------------------------------------
 * Extend the Engine with Mixins
 * -----------------------------------------------------
 */

EngineApiInterface.call(HMDAEngine.prototype);
EngineLocalDB.call(HMDAEngine.prototype);
EngineBaseConditions.call(HMDAEngine.prototype);
EngineCustomConditions.call(HMDAEngine.prototype);
EngineCustomDataLookupConditions.call(HMDAEngine.prototype);
RuleParseAndExec.call(HMDAEngine.prototype);
RuleProgress.call(HMDAEngine.prototype);

/*
 * -----------------------------------------------------
 * Set the HMDAEngine as either the exported module for
 * CommonJS (node) or on the root scope (for browsers)
 * -----------------------------------------------------
 */

/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports &&
    typeof window === 'undefined') {
    module.exports = new HMDAEngine();
    global.Promise = Promise;
} else {
    window.HMDAEngine = new HMDAEngine();
    window.Promise = Promise;
}
