/*jshint evil:true*/
/*global window:false*/
/* global -Promise */
/* global indexedDB:false */
'use strict';

var EngineBaseConditions = require('./lib/engineBaseConditions'),
    EngineApiInterface = require('./lib/engineApiInterface'),
    utils = require('./lib/utils'),
    hmdajson = require('./lib/hmdajson'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore'),
    brijSpec = require('brij-spec'),
    stream = require('stream'),
    Promise = require('bluebird'),
    CONCURRENT_RULES = 10,
    levelup = require('level-browserify');

function Errors() {
    return {
        syntactical: {},
        validity: {},
        quality: {},
        macro: {},
        special: {}
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
    this._DEBUG_LEVEL = 0;
    this._HMDA_JSON = {};
}

/*
 * -----------------------------------------------------
 * Managed State
 * -----------------------------------------------------
 */

var _LOCAL_DB = null,
    _USE_LOCAL_DB = false;

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

HMDAEngine.prototype.setRuleYear = function(year) {
    this.currentYear = year;
};

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

/*
 * -----------------------------------------------------
 * Local DB
 * -----------------------------------------------------
 */

/**
 * Allow the use of LocalDB to speed up queries during edit processing
 * @param {boolean} bool Valid values: true, false
 */
HMDAEngine.prototype.setUseLocalDB = function(bool) {
    _USE_LOCAL_DB = bool;
    if (bool) {
        return resetDB();
    } else {
        return destroyDB();
    }
};

HMDAEngine.prototype.shouldUseLocalDB = function() {
    return _USE_LOCAL_DB;
};

HMDAEngine.prototype.loadCensusData = function() {
    return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyTractMSA'])
    .then(function() {
        return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyTract']);
    }.bind(this))
    .then(function() {
        return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyMSA']);
    }.bind(this))
    .then(function() {
        return getLocalDataFromAPI.apply(this, ['localdb/census/stateCounty']);
    }.bind(this))
    .then(function() {
        return getLocalDataFromAPI.apply(this, ['localdb/census/msaCodes']);
    }.bind(this));
};

var getLocalDataFromAPI = function(endpoint) {
    return this.apiGET(endpoint)
    .then(function(response) {
        return loadDB(utils.jsonParseResponse(response));
    });
};

var resetDB = function() {
    return destroyDB()
    .then(function() {
        _LOCAL_DB = levelup('hmda', {valueEncoding: 'json'});
        return _LOCAL_DB;
    });
};

var destroyDB = function() {
    var deferred = Promise.defer();

    var realDestroy = function() {
        /* istanbul ignore else */
        if (typeof levelup.destroy === 'function') {
            levelup.destroy('hmda', function(err) {
                if (err) {
                    return deferred.reject(err);
                }
                _LOCAL_DB = null;
                deferred.resolve();
            });
        } else {
            var request = indexedDB.deleteDatabase('IDBWrapper-hmda');
            request.onsuccess = function() {
                _LOCAL_DB = null;
                deferred.resolve();
            };
            request.onerror = function(err) {
                deferred.reject(err);
            };
        }
    };
    if (_LOCAL_DB) {
        _LOCAL_DB.close(function(err) {
            if (err) {
                return deferred.reject(err);
            }
            realDestroy();
        });
    } else {
        realDestroy();
    }
    return deferred.promise;
};

var loadDB = function(data) {
    var deferred = Promise.defer();
    _LOCAL_DB.batch(data, function(err) {
        if (err) {
            return deferred.reject(err);
        }
        deferred.resolve();
    });
    return deferred.promise;
};

var localCensusComboValidation = function(censusparams, resultAsOb) {
    if (resultAsOb === undefined) {
        resultAsOb = false;
    }
    var deferred = Promise.defer();

    var key = '/census';
    var tract, paramsKey;

    for (var i = 0; i < censusparams.length; i++) {
        paramsKey = _.keys(censusparams[i])[0];
        if (censusparams[i] !== undefined && censusparams[i][paramsKey] !== 'NA') {
            key += '/' + paramsKey + '/' + censusparams[i][paramsKey];
        }
        if (paramsKey === 'tract') {
            tract = censusparams[i][paramsKey];
        }
    }
    _LOCAL_DB.get(key, function(err, value) {
        if (err && err.notFound) {
            value = {result: false};
            if (resultAsOb) {
                return deferred.resolve(value);
            }
            return deferred.resolve(false);
        }
        value.result = false;
        if (tract === 'NA' && value.small_county !== '1') {
            if (resultAsOb) {
                return deferred.resolve(value);
            }
            return deferred.resolve(false);
        }
        if (resultAsOb) {
            value.result = true;
            return deferred.resolve(value);
        }
        deferred.resolve(true);
    });

    return deferred.promise;
};

var localMSALookup = function(msaCode) {
    var deferred = Promise.defer();

    var key = '/census/msa_code/' + msaCode;
    _LOCAL_DB.get(key, function(err, value) {
        if ( (err && err.notFound) || msaCode === 'NA' ) {
            return deferred.resolve(false);
        }
        deferred.resolve(value.msa_name);
    });
    return deferred.promise;
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
 * Custom Non-API functions
 * -----------------------------------------------------
 */

HMDAEngine.prototype.accumulatedIf = function(hmdaFile, ifCond, thenCond) {
    var ifCondId,
        thenCondId;
    /* istanbul ignore if */
    if (this.getDebug() > 1) {
        ifCondId = '- accumulatedIf';
        thenCondId = '- accumulatedThen';
    }

    return this.execRule({'hmdaFile': hmdaFile}, ifCond, ifCondId)
    .then(function(ifResult) {
        if (ifResult.length !== 0 && _.isArray(ifResult)) {
            return [];
        }
        return this.execRule({'hmdaFile': hmdaFile}, thenCond, thenCondId)
        .then(function(thenResult) {
            if (thenResult.length !== 0 && _.isArray(thenResult)) {
                return [utils.accumulateResult(ifResult, thenResult)];
            }
            return [];
        });
    }.bind(this));
};

/* hmda-syntactical */
HMDAEngine.prototype.hasRecordIdentifiersForEachRow = function(hmdaFile) {
    var records = [];
    if (hmdaFile.transmittalSheet.recordID !== '1') {
        records.push(1);
    } else {
        for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
            if (hmdaFile.loanApplicationRegisters[i].recordID !== '2') {
                records.push(hmdaFile.loanApplicationRegisters[i].lineNumber);
            }
        }
    }

    if (!records.length) {
        return true;
    }
    return utils.handleArrayErrors(hmdaFile, records, ['recordID']);
};

HMDAEngine.prototype.hasAtLeastOneLAR = function(hmdaFile) {
    if (hmdaFile.loanApplicationRegisters.length > 0) {
        return true;
    }
    var error = {'properties': {}};
    error.properties['Total Loan/Application records in file'] = hmdaFile.loanApplicationRegisters.length;
    return [error];
};

HMDAEngine.prototype.isValidAgencyCode = function(hmdaFile) {
    var validAgencies = ['1', '2', '3', '5', '7', '9'];
    var records = [];

    if (! _.contains(validAgencies, hmdaFile.transmittalSheet.agencyCode)) {
        return utils.handleArrayErrors(hmdaFile, [1], ['agencyCode']);
    }
    var tsAgencyCode = hmdaFile.transmittalSheet.agencyCode;
    for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
        if (hmdaFile.loanApplicationRegisters[i].agencyCode !== tsAgencyCode) {
            records.push(hmdaFile.loanApplicationRegisters[i].lineNumber);
        }
    }
    if (!records.length) {
        return true;
    }
    return utils.handleArrayErrors(hmdaFile, records, ['agencyCode']);
};

HMDAEngine.prototype.hasUniqueLoanNumbers = function(hmdaFile) {
    if (_.unique(hmdaFile.loanApplicationRegisters, _.iteratee('loanNumber')).length === hmdaFile.loanApplicationRegisters.length) {
        return true;
    }

    var counts = _.groupBy(hmdaFile.loanApplicationRegisters, function(lar) {
        return lar.loanNumber;
    });

    return utils.handleUniqueLoanNumberErrors(counts);
};

/* lar-syntactical */
HMDAEngine.prototype.isActionDateInActivityYear = function(actionDate, activityYear) {
    return activityYear === actionDate.slice(0,4);
};

/* lar-quality */
HMDAEngine.prototype.isValidLoanAmount = function(loanAmount, applicantIncome) {
    if (!isNaN(+applicantIncome) && loanAmount >= 1000) {
        return loanAmount < 5 * applicantIncome;
    }

    return true;
};

HMDAEngine.prototype.isLoanAmountFiveTimesIncome = function(loanAmount, applicantIncome) {
    return loanAmount > applicantIncome * 5;
};

/* ts-quality */
HMDAEngine.prototype.checkTotalLARCount = function(hmdaFile) {
    var result = parseInt(hmdaFile.transmittalSheet.totalLineEntries) === hmdaFile.loanApplicationRegisters.length;
    if (!result) {
        var error = {'properties': {}};
        error.properties['Total Loan/Application records reported in transmittal sheet'] = hmdaFile.transmittalSheet.totalLineEntries;
        error.properties['Total Loan/Application records in file'] = hmdaFile.loanApplicationRegisters.length;
        return [error];
    }
    return result;
};

/* hmda-macro */
HMDAEngine.prototype.compareNumEntriesSingle = function(loanApplicationRegisters, rule, cond) {
    var count = 0,
        ruleid,
        condid;
    /* istanbul ignore if */
    if (this.getDebug() > 1) {
        ruleid = '- compareNumEntriesSingleRule';
        condid = '- compareNumEntriesSingleCond';
    }

    var parsedRule = utils.getParsedRule.apply(this, [rule]);
    var functionBody = parsedRule[0];
    var result = parsedRule[1];

    return Promise.map(loanApplicationRegisters, function(lar) {
        return this.execParsedRule(lar, functionBody, result, ruleid)
        .then(function(result) {
            if (result.length === 0) {
                count += 1;
            }
            return;
        });
    }.bind(this))
    .then(function() {
        var topLevelObj = {};
        topLevelObj[cond.property] = count;
        var calculations = {'properties': {}};
        if (rule.hasOwnProperty('label')) {
            calculations.properties[rule.label] = count;
        }
        return this.execRule(topLevelObj, cond, condid)
        .then(function(result) {
            if (result.length === 0) {
                return calculations;
            }
            // A non-empty array is considered an error in execRule
            return [calculations];
        });
    }.bind(this));
};

HMDAEngine.prototype.compareNumEntries = function(loanApplicationRegisters, ruleA, ruleB, cond) {
    var countA = 0,
        countB = 0,
        ruleAid,
        ruleBid,
        condid;
    /* istanbul ignore if */
    if (this.getDebug() > 1) {
        ruleAid = '- compareNumEntriesRuleA';
        ruleBid = '- compareNumEntriesRuleB';
        condid = '- compareNumEntriesCond';
    }

    var parsedRule = utils.getParsedRule.apply(this, [ruleA]);
    var functionBodyA = parsedRule[0];
    var resultA = parsedRule[1];
    parsedRule = utils.getParsedRule.apply(this, [ruleB]);
    var functionBodyB = parsedRule[0];
    var resultB = parsedRule[1];

    return Promise.map(loanApplicationRegisters, function(lar) {
        return this.execParsedRule(lar, functionBodyA, resultA, ruleAid)
        .then(function(result) {
            if (result.length === 0) {
                countA += 1;
            }
            return this.execParsedRule(lar, functionBodyB, resultB, ruleBid)
            .then(function(result) {
                if (result.length === 0) {
                    countB += 1;
                }
                return;
            });
        }.bind(this));
    }.bind(this))
    .then(function() {
        var topLevelObj = {};
        topLevelObj[cond.property] = countA / countB;
        var calculations = {'properties': {}};
        if (ruleA.hasOwnProperty('label')) {
            calculations.properties[ruleA.label] = countA;
        }
        if (ruleB.hasOwnProperty('label')) {
            calculations.properties[ruleB.label] = countB;
        }
        if (cond.hasOwnProperty('label')) {
            calculations.properties[cond.label] = (topLevelObj[cond.property] * 100).toFixed(2);
        }
        // Divide by 0
        if (countB === 0) {
            return calculations;
        }
        return this.execRule(topLevelObj, cond, condid)
        .then(function(result) {
            if (result.length === 0) {
                return calculations;
            }
            // A non-empty array is considered an error in execRule
            return [calculations];
        });
    }.bind(this));
};

HMDAEngine.prototype.isValidNumMultifamilyLoans = function(hmdaFile) {
    var multifamilyCount = 0,
        multifamilyAmount = 0,
        totalAmount = 0;

    _.each(hmdaFile.loanApplicationRegisters, function(element, index, list) {
        if (element.propertyType === '3') {
            multifamilyCount += 1;
            multifamilyAmount += +element.loanAmount;
        }
        totalAmount += +element.loanAmount;
    });
    var percentOfAllLoans = multifamilyCount / hmdaFile.loanApplicationRegisters.length;
    var percentOfAllDollars = multifamilyAmount / totalAmount;
    var calculations = {'properties': {}};
    calculations.properties['Total Multifamily Loans'] = multifamilyCount;
    calculations.properties['Total Loans'] = hmdaFile.loanApplicationRegisters.length;
    calculations.properties['% of Total Loans'] = (percentOfAllLoans*100).toFixed(2);
    calculations.properties['Total Dollar Amount of Multifamily Loans'] = multifamilyAmount;
    calculations.properties['Total Dollar Amount of All Loans'] = totalAmount;
    calculations.properties['% of Total Dollar Amount'] = (percentOfAllDollars*100).toFixed(2);

    if ((percentOfAllLoans < 0.1) || (percentOfAllDollars < 0.1)) {
        return true;
    }
    return [calculations];
};

/*
 * -----------------------------------------------------
 * Custom API functions
 * TODO - Replace with actual impl
 * -----------------------------------------------------
 */

/* ts-syntactical */
HMDAEngine.prototype.isTimestampLaterThanDatabase = function(respondentId, agencyCode, timestamp) {
    return this.apiGET('isValidTimestamp', [agencyCode, respondentId, timestamp])
    .then(function(response) {
        return utils.jsonParseResponse(response).result;
    });
};

/* hmda-syntactical */
HMDAEngine.prototype.isValidControlNumber = function(hmdaFile) {
    var agencyCode = hmdaFile.transmittalSheet.agencyCode,
        respondentID = hmdaFile.transmittalSheet.respondentID;
    return this.apiGET('isValidControlNumber',
        [agencyCode, respondentID])
    .then(function(response) {
        if (!utils.jsonParseResponse(response).result) {
            return utils.handleArrayErrors(hmdaFile, [1], ['agencyCode', 'respondentID']);
        } else {
            var lineNumbers = [];
            _.each(hmdaFile.loanApplicationRegisters, function(element, index, list) {
                if (element.agencyCode !== agencyCode || element.respondentID !== respondentID) {
                    lineNumbers.push(index + 2);
                }
            });
            if (lineNumbers.length !== 0) {
                return utils.handleArrayErrors(hmdaFile, lineNumbers, ['agencyCode', 'respondentID']);
            }
        }
        return true;
    });
};

/* lar-validity */
HMDAEngine.prototype.isValidMetroArea = function(metroArea) {
    if (metroArea === 'NA') {
        return true;
    }
    if (this.shouldUseLocalDB()) {
        return this.getMSAName(metroArea)
        .then(function(name) {
            if (name) {
                return true;
            }
            return false;
        });
    } else {
        return this.apiGET('isValidMSA', [metroArea])
        .then(function(response) {
            return utils.jsonParseResponse(response).result;
        });
    }
};

HMDAEngine.prototype.isValidMsaMdStateAndCountyCombo = function(metroArea, fipsState, fipsCounty) {
    if (this.shouldUseLocalDB()) {
        return localCensusComboValidation([
            {'state_code': fipsState},
            {'county_code': fipsCounty},
            {'msa_code': metroArea}
        ], false)
        .then(function(result) {
            return result;
        });
    } else {
        return this.apiGET('isValidMSAStateCounty', [metroArea, fipsState, fipsCounty])
        .then(function(response) {
            return utils.jsonParseResponse(response).result;
        });
    }
};

HMDAEngine.prototype.isValidStateAndCounty = function(fipsState, fipsCounty) {
    if (fipsState === 'NA' || fipsCounty === 'NA') {
        return Promise.resolve()
        .then(function() {
            return false;
        });
    }
    if (this.shouldUseLocalDB()) {
        return localCensusComboValidation([
            {'state_code': fipsState},
            {'county_code': fipsCounty}
        ], false)
        .then(function(result) {
            return result;
        });
    } else {
        return this.apiGET('isValidStateCounty', [fipsState, fipsCounty])
        .then(function(response) {
            return utils.jsonParseResponse(response).result;
        });
    }
};

HMDAEngine.prototype.isValidCensusTractCombo = function(censusTract, metroArea, fipsState, fipsCounty) {
    if (censusTract === 'NA' && metroArea === 'NA' && fipsState === 'NA' && fipsCounty === 'NA') {
        return true;
    }

    if (this.shouldUseLocalDB()) {
        return localCensusComboValidation([
            {'state_code': fipsState},
            {'county_code': fipsCounty},
            {'tract': censusTract},
            {'msa_code': metroArea}
        ], false)
        .then(function(result) {
            return result;
        });
    } else {
        return this.apiGET('isValidCensusTractCombo', [fipsState, fipsCounty, metroArea, censusTract])
        .then(function(response) {
            return utils.jsonParseResponse(response).result;
        });
    }
};

/* ts-validity */
HMDAEngine.prototype.isRespondentMBS = function(respondentID, agencyCode) {
    return this.apiGET('isRespondentMBS', [agencyCode, respondentID])
    .then(function(response) {
        return utils.jsonParseResponse(response).result;
    });
};

/* lar-quality */
HMDAEngine.prototype.isValidStateCountyCensusTractCombo = function(hmdaFile) {
    var invalidMSAs = [];

    var pushMSA = function(element, result) {
        if (result.result) {
            if ((element.metroArea === 'NA' && result.msa_code !== '') || element.metroArea !== result.msa_code) {
                var error = {'properties': {}};
                error.properties['Recommended MSA/MD'] = result.msa_code;
                error.properties['LAR number'] = element.loanNumber;
                error.properties['Reported State Code'] = element.fipsState;
                error.properties['Reported County Code'] = element.fipsCounty;
                error.properties['Reported Census Tract'] = element.censusTract;
                invalidMSAs.push (error);
            }
        }
    };

    return Promise.map(hmdaFile.loanApplicationRegisters, function(element) {
        if (this.shouldUseLocalDB()) {
            return localCensusComboValidation([
                {'state_code': element.fipsState},
                {'county_code': element.fipsCounty},
                {'tract': element.censusTract}
            ], true)
            .then(function(result) {
                pushMSA(element, result);
                return;
            });
        } else {
            return this.apiGET('isValidCensusCombination', [element.fipsState, element.fipsCounty, element.censusTract])
            .then(function(response) {
                pushMSA(element, utils.jsonParseResponse(response));
                return;
            });
        }
    }.bind(this), { concurrency: CONCURRENT_RULES })
    .then(function() {
        if (!invalidMSAs.length) {
            return true;
        } else {
            return invalidMSAs;
        }
    });
};

HMDAEngine.prototype.isMetroAreaOnRespondentPanel = function(hmdaFile) {
    var invalidMSAs = [];
    return this.apiGET('isNotIndependentMortgageCoOrMBS', [hmdaFile.transmittalSheet.agencyCode, hmdaFile.transmittalSheet.respondentID])
    .then(function(response) {
        if (utils.jsonParseResponse(response).result === true) {
            return Promise.map(hmdaFile.loanApplicationRegisters, function(element) {
                var validActionTaken = ['1', '2', '3', '4', '5', '7', '8'];
                if (_.contains(validActionTaken, element.actionTaken)) {
                    return this.apiGET('isMetroAreaOnRespondentPanel', [element.agencyCode, element.respondentID,
                                        element.metroArea])
                    .then(function(response) {
                        var result = utils.jsonParseResponse(response);
                        if (!result.result) {
                            invalidMSAs.push(element.metroArea);
                        }
                        return result;
                    });
                }
            }.bind(this),  {concurrency: CONCURRENT_RULES});
        }
    }.bind(this))
    .then(function() {
        if (!invalidMSAs.length) {
            return true;
        } else {
            var errors = [],
                uniqueMSAMap = {};
            for (var i=0; i<invalidMSAs.length; i++) {
                if (uniqueMSAMap[invalidMSAs[i]] === undefined) {
                    uniqueMSAMap[invalidMSAs[i]] = 1;
                } else {
                    uniqueMSAMap[invalidMSAs[i]]++;
                }
            }

            return Promise.map(_.keys(uniqueMSAMap), function(msaKey) {
                return this.getMSAName(msaKey)
                .then(function(msaName) {
                    var msaInfo = {
                        'LAR Count': uniqueMSAMap[msaKey],
                        'MSA/MD': msaKey,
                        'MSA/MD name': msaName
                    };

                    errors.push ({'properties': msaInfo});
                    return Promise.resolve();
                });
            }.bind(this), { concurrency: CONCURRENT_RULES })
            .then(function() {
                return errors;
            });
        }
    }.bind(this));
};

/* ts-quality */
HMDAEngine.prototype.isChildFI = function(respondentID, agencyCode) {
    return this.apiGET('isChildFI', [agencyCode, respondentID])
    .then(function(response) {
        return utils.jsonParseResponse(response).result;
    });
};

HMDAEngine.prototype.isTaxIDTheSameAsLastYear = function(respondentID, agencyCode, taxID) {
    return this.apiGET('isTaxIDTheSameAsLastYear', [agencyCode, respondentID, taxID])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

/* hmda-macro */
HMDAEngine.prototype.isValidNumLoans = function(hmdaFile) {
    var respondentID = hmdaFile.transmittalSheet.respondentID;
    var agencyCode = hmdaFile.transmittalSheet.agencyCode;
    var numLoans = hmdaFile.loanApplicationRegisters.length;
    return this.apiGET('isValidNumLoans/total', [agencyCode, respondentID, numLoans])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidNumFannieMaeLoans = function(hmdaFile) {
    var numFannieLoans = 0,
        numLoans = 0;
    _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
        if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
            _.contains(['1', '2'], element.propertyType) && (element.loanType === '1')) {
            numLoans++;
            if (_.contains(['1', '3'], element.purchaserType)) {
                numFannieLoans++;
            }
        }
    });

    var respondentID = hmdaFile.transmittalSheet.respondentID,
        agencyCode = hmdaFile.transmittalSheet.agencyCode;
    return this.apiGET('isValidNumLoans/fannieMae', [agencyCode, respondentID, numLoans, numFannieLoans])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
    var numGinnieLoans = 0,
        numLoans = 0;
    _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
        if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
            _.contains(['1', '2'], element.propertyType) && (element.loanType === '2')) {
            numLoans++;
            if (element.purchaserType === '2') {
                numGinnieLoans++;
            }
        }
    });

    var respondentID = hmdaFile.transmittalSheet.respondentID,
        agencyCode = hmdaFile.transmittalSheet.agencyCode;
    return this.apiGET('isValidNumLoans/ginnieMaeFHA', [agencyCode, respondentID, numLoans, numGinnieLoans])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidNumGinnieMaeVALoans = function(hmdaFile) {
    var numGinnieLoans = 0,
        numLoans = 0;
    _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
        if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
            _.contains(['1', '2'], element.propertyType) && (element.loanType === '3')) {
            numLoans++;
            if (element.purchaserType === '2') {
                numGinnieLoans++;
            }
        }
    });

    var respondentID = hmdaFile.transmittalSheet.respondentID,
        agencyCode = hmdaFile.transmittalSheet.agencyCode;
    return this.apiGET('isValidNumLoans/ginnieMaeVA', [agencyCode, respondentID, numLoans, numGinnieLoans])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidNumHomePurchaseLoans = function(hmdaFile) {
    var count = 0,
        countSold = 0;
    _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
        if (element.loanPurpose === '1' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType)) {
            count += 1;
            if (element.purchaserType !== '0') {
                countSold += 1;
            }
        }
    });

    var respondentID = hmdaFile.transmittalSheet.respondentID,
        agencyCode = hmdaFile.transmittalSheet.agencyCode;
    return this.apiGET('isValidNumLoans/homePurchase', [agencyCode, respondentID, count, countSold])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidNumRefinanceLoans = function(hmdaFile) {
    var count = 0,
        countSold = 0;
    _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
        if (element.loanPurpose === '3' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType)) {
            count += 1;
            if (element.purchaserType !== '0') {
                countSold += 1;
            }
        }
    });

    var respondentID = hmdaFile.transmittalSheet.respondentID,
        agencyCode = hmdaFile.transmittalSheet.agencyCode;
    return this.apiGET('isValidNumLoans/refinance', [agencyCode, respondentID, count, countSold])
    .then(function(body) {
        return utils.resultBodyAsError(body);
    });
};

HMDAEngine.prototype.isValidMsaMdCountyCensusForNonDepository = function(hmdaFile) {
    var invalidMSAs = [];
    return this.apiGET('isCraReporter', [hmdaFile.transmittalSheet.respondentID])
    .then(function(response) {
        if (utils.jsonParseResponse(response).result) {
            var validActionTaken = ['1', '2', '3', '4', '5', '6'];
            return Promise.map(hmdaFile.loanApplicationRegisters, function(element) {
                if (_.contains(validActionTaken, element.actionTaken)) {
                    if (element.censusTract==='NA') {
                        invalidMSAs.push(element.lineNumber);
                        return Promise.resolve();
                    } else {
                        if (this.shouldUseLocalDB()) {
                            return localCensusComboValidation([
                                {'state_code': element.fipsState},
                                {'county_code': element.fipsCounty},
                                {'tract': element.censusTract},
                                {'msa_code': element.metroArea}
                            ], false)
                            .then(function(result) {
                                if (!result) {
                                    invalidMSAs.push(element.lineNumber);
                                }
                            });
                        } else {
                            return this.apiGET('isValidCensusInMSA', [element.metroArea, element.fipsState,
                               element.fipsCounty, element.censusTract])
                            .then(function (response) {
                                if (!utils.jsonParseResponse(response).result) {
                                    invalidMSAs.push(element.lineNumber);
                                }
                            });
                        }
                    }
                }
                return Promise.resolve();
            }.bind(this), { concurrency: CONCURRENT_RULES })
            .then(function() {
                if (!invalidMSAs.length) {
                    return true;
                } else {
                    return utils.handleArrayErrors(hmdaFile, invalidMSAs,
                        ['metroArea','fipsState','fipsCounty','censusTract']);
                }
            });
        } else {
            return true;
        }
    }.bind(this));
};

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

HMDAEngine.prototype.getMetroAreasOnRespondentPanel = function(agencyCode,respondentID) {
    return this.apiGET('getMetroAreasOnRespondentPanel', [agencyCode, respondentID])
    .then(function(response) {
        return utils.jsonParseResponse(response).msa;
    });
};

HMDAEngine.prototype.getMSAName = function(msaCode) {
    if (this.shouldUseLocalDB()) {
        return localMSALookup(msaCode);
    } else {
        return this.apiGET('getMSAName', [msaCode])
        .then(function(response) {
            return utils.jsonParseResponse(response).msaName;
        });
    }
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

HMDAEngine.prototype.parseRuleCustomCall = function(rule, result) {
    var func = '';
    func += 'this.' + rule.function + '(';
    if (rule.args) {
        for (var i=0; i < rule.args.length; i++) {
            func += 'arguments[' + result.argIndex++ + ']';
            if (i !== rule.args.length-1) {
                func += ', ';
            }
            result.args.push(rule.args[i]);
        }
    } else {
        func += 'arguments[' + result.argIndex++ + ']';
        result.args.push(rule.property);
    }
    func += ')';
    var resultName = utils.promiseResultName(result.funcs);
    result.body += resultName;
    result.spreads.push(resultName);
    result.funcs.push(func);
};

HMDAEngine.prototype.parseRuleCondition = function(rule, result) {
    var func = '';
    func += 'this.' + rule.condition + '(arguments[' + result.argIndex++ + ']';
    result.args.push(rule.property);
    var fields = brijSpec.VALID_CONDITIONS[rule.condition].additionalFields;
    if (fields) {
        if (this.ends_with(rule.condition, '_property')) {
            func += ', arguments[' + result.argIndex++ + ']';
            result.args.push(rule[fields[0]]);
        } else {
            for (var i=0; i < fields.length; i++) {
                func += ', ' + JSON.stringify(rule[fields[i]]);
            }
        }
    }
    func += ')';
    var resultName = utils.promiseResultName(result.funcs);
    result.body += resultName;
    result.spreads.push(resultName);
    result.funcs.push(func);
};

HMDAEngine.prototype.parseRule = function(rule, result) {
    if (rule.hasOwnProperty('condition')) {
        if (rule.condition === 'call') {
            this.parseRuleCustomCall(rule, result);
        } else {
            this.parseRuleCondition(rule, result);
        }
    }

    if (rule.hasOwnProperty('if')) {
        result.body += '(';
        this.parseRule(rule.if, result);
        result.body += ' ? ';
        this.parseRule(rule.then, result);
        result.body += ' : true)';
    }

    if (rule.hasOwnProperty('and')) {
        result.body += '(';
        for (var i=0; i < rule.and.length; i++) {
            this.parseRule(rule.and[i], result);
            if (i !== rule.and.length-1) {
                result.body += ' && ';
            }
        }
        result.body += ')';
    }

    if (rule.hasOwnProperty('or')) {
        result.body += '(';
        for (var j=0; j < rule.or.length; j++) {
            this.parseRule(rule.or[j], result);
            if (j !== rule.or.length-1) {
                result.body += ' || ';
            }
        }
        result.body += ')';
    }

    for (var x = 0; x < result.args.length; x++) {
        result.properties[result.args[x]] = true;
    }
};

/*
 * -----------------------------------------------------
 * Rule Execution
 * -----------------------------------------------------
 */

HMDAEngine.prototype.execParsedRule = function(topLevelObj, functionBody, result, ruleid) {
    var args = _.map(result.args, function(arg) {
        if (typeof(arg) === 'string') {
            var contextList = [topLevelObj, !topLevelObj.hmdaFile ? this._HMDA_JSON : {}];        // Context list to search
            return utils.resolveArg(arg, contextList);
        } else {
            return arg;
        }
    }.bind(this));

    /* istanbul ignore if */
    if (ruleid) {
        console.time('    ' + ruleid);
    }
    return new Function(functionBody).apply(this, args)
    .then(function(funcResult) {
        /* istanbul ignore if */
        if (ruleid) {
            console.timeEnd('    ' + ruleid);
        }
        if (funcResult === true) {
            return [];
        } else if (topLevelObj.hmdaFile) {
            return funcResult;
        } else {
            var error = {'properties': {}};

            error.lineNumber = topLevelObj.lineNumber;
            if (topLevelObj.hasOwnProperty('loanNumber')) {
                error.loanNumber = topLevelObj.loanNumber;
            }
            for (var i = 0; i < args.length; i++) {
                error.properties[result.args[i]] = args[i];
            }
            return [error];
        }
    });
};

HMDAEngine.prototype.execRule = function(topLevelObj, rule, ruleid) {
    var parserResult = utils.getParsedRule.apply(this, [rule]);
    var functionBody = parserResult[0];
    var result = parserResult[1];

    return this.execParsedRule(topLevelObj, functionBody, result, ruleid);
};

/*
 * -----------------------------------------------------
 * API Endpoints
 * -----------------------------------------------------
 */

HMDAEngine.prototype.getExecRulePromise = function(args) {
    /* istanbul ignore if */
    if (this.getDebug() > 2) {
        console.time('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
    }
    return this.execParsedRule(args.topLevelObj, args.functionBody, args.result)
    .then(function(result) {
        if (_.isArray(result) && result.length !== 0) {
            utils.addToErrors.apply(this, [result, args.rule, args.editType, args.scope]);
        }
        /* istanbul ignore if */
        if (this.getDebug() > 2) {
            console.timeEnd('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
        }
    }.bind(this));
};

HMDAEngine.prototype.runEdits = function(year, scope, editType) {
    this.setRuleYear(year);
    var rules = hmdaRuleSpec.getEdits(year, scope, editType);

    var topLevelObj;
    switch (scope) {
        case 'ts':
            topLevelObj = this._HMDA_JSON.hmdaFile.transmittalSheet;
            break;
        case 'lar':
            topLevelObj = this._HMDA_JSON.hmdaFile.loanApplicationRegisters;
            break;
        case 'hmda':
            topLevelObj = this._HMDA_JSON;
            break;
    }

    return Promise.map(rules, function(currentRule) {
        /* istanbul ignore if */
        if (this.getDebug() > 0) {
            console.time('    ' + currentRule.id + ' - ' + scope);
        }
        var args = {
            'topLevelObj': topLevelObj,
            'rule': currentRule,
            'scope': scope,
            'editType': editType
        };
        var parsedRule = utils.getParsedRule.apply(this, [currentRule.rule]);
        args.functionBody = parsedRule[0];
        args.result = parsedRule[1];

        if (_.isArray(topLevelObj)) {
            return Promise.map(topLevelObj, function(currentTopLevelObj) {
                args.topLevelObj = currentTopLevelObj;
                return this.getExecRulePromise(args);
            }.bind(this), { concurrency: CONCURRENT_RULES })
            .then(function() {
                /* istanbul ignore if */
                if (this.getDebug() > 0) {
                    console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                }
            }.bind(this));
        } else {
            return this.getExecRulePromise(args)
            .then(function() {
                /* istanbul ignore if */
                if (this.getDebug() > 0) {
                    console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                }
            }.bind(this));
        }
    }.bind(this), { concurrency: CONCURRENT_RULES });
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

// Extend the engine with mixins
EngineBaseConditions.call(HMDAEngine.prototype);
EngineApiInterface.call(HMDAEngine.prototype);

// Set the HMDAEngine as either the exported module for
// CommonJS (node) or on the root scope (for browsers)
/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports &&
    typeof window === 'undefined') {
    module.exports = new HMDAEngine();
    global.Promise = Promise;
} else {
    window.HMDAEngine = new HMDAEngine();
    window.Promise = Promise;
}
