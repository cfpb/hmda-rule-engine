/*jshint evil:true*/
/*global window:false*/
'use strict';

var hmdajson = require('./lib/hmdajson'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore'),
    brijSpec = require('brij-spec'),
    stream = require('stream'),
    GET = require('./lib/promise-http-get'),
    moment = require('moment'),
    Q = require('q'),
    CONCURRENT_RULES = 10;

Q.map = require('q-map').map;

var resolveArg = function(arg, contextList) {
    var tokens = arg.split('.');
    for (var i = 0; i < contextList.length; i++) {
        var mappedArg = contextList[i];

        for (var j = 0; j < tokens.length; j++) {
            mappedArg = mappedArg[tokens[j]];
            if (mappedArg === undefined) {
                break;
            }
        }

        if (mappedArg !== undefined) {
            return mappedArg;
        }
    }
    var err = new Error('Failed to resolve argument!');
    err.property = arg;
    throw err;
};

var retrieveProps = function(error, line, properties) {
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        error.properties[property] = resolveArg(property, [line]);
    }
};

var handleArrayErrors = function(hmdaFile, lines, properties) {
    var errors = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var error = {'properties': {}};
        error.lineNumber = line.toString();
        if (line === 1) {
            retrieveProps(error, hmdaFile.transmittalSheet, properties);
        } else {
            var lar = hmdaFile.loanApplicationRegisters[line-2];
            retrieveProps(error, lar, properties);
            error.loanNumber = lar.loanNumber;
        }
        errors.push(error);
    }
    return errors;
};

var handleUniqueLoanNumberErrors = function(counts) {
    var errors = [];
    var loanNumbers = _.keys(counts);
    for (var i = 0; i < loanNumbers.length; i++) {
        var loanNumber = loanNumbers[i];
        if (counts[loanNumber].length > 1) {
            var error = {'properties': {}};
            error.loanNumber = loanNumber;
            error.properties.lineNumbers = [];
            for (var j = 0; j < counts[loanNumber].length; j++) {
                error.properties.lineNumbers.push(counts[loanNumber][j].lineNumber);
            }
            errors.push(error);
        }
    }
    return errors;
};

var resultFromResponse = function(response) {
    var result = JSON.parse(response);
    return result;
};

var resolveError = function(err) {
    if (err.message && err.message === 'Failed to resolve argument!') {
        return Q.reject(new Error('Rule-spec error: Invalid property\nProperty: ' + err.property + ' not found!'));
    } else if (err.message && err.message === 'connect ECONNREFUSED') {
        return Q.reject(new Error('There was a problem connecting to the HMDA server. Please check your connection or try again later.'));
    } else {
        return Q.reject(err);
    }
};

var accumulateResult = function(ifResult, thenResult) {
    var result = {'properties': {}};
    var thenKeys = _.keys(thenResult[0].properties);
    result.properties = ifResult.properties;

    for (var i = 0; i < thenKeys.length; i++) {
        result.properties[thenKeys[i]] = thenResult[0].properties[thenKeys[i]];
    }
    return result;
};

(function() {

    // Set root (global) scope
    var root = this;

    // Constructor of our HMDAEngine
    var HMDAEngine = function(obj) {
        if (obj instanceof HMDAEngine) {
            return obj;
        }
        if (!(this instanceof HMDAEngine)) {
            return new HMDAEngine(obj);
        }
    };

    // Set the HMDAEngine as either the exported module for
    // CommonJS (node) or on the root scope (for browsers)
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = HMDAEngine;
        }
        exports.HMDAEngine = HMDAEngine;
    }
    root.HMDAEngine = HMDAEngine;
    root.Q = Q;

    /*
     * -----------------------------------------------------
     * Managed State
     * -----------------------------------------------------
     */

    var _HMDA_JSON = {},
        _API_BASE_URL,
        _API_RULE_YEAR,
        errors = {
            syntactical: {},
            validity: {},
            quality: {},
            macro: {},
            special: {}
        },
        DEBUG = 0;

    HMDAEngine.setAPIURL = function(url) {
        _API_BASE_URL = url;
    };

    HMDAEngine.getAPIURL = function() {
        return _API_BASE_URL;
    };

    HMDAEngine.setRuleYear = function(year) {
        _API_RULE_YEAR = year;
    };

    HMDAEngine.getRuleYear = function() {
        return _API_RULE_YEAR;
    };

    HMDAEngine.clearErrors = function() {
        errors = {
            syntactical: {},
            validity: {},
            quality: {},
            macro: {},
            special: {}
        };
    };

    HMDAEngine.getErrors = function() {
        return errors;
    };

    HMDAEngine.clearHmdaJson = function() {
        _HMDA_JSON = {};
    };

    HMDAEngine.getHmdaJson = function() {
        return _HMDA_JSON;
    };

    HMDAEngine.setHmdaJson = function(newHmdaJson) {
        _HMDA_JSON = newHmdaJson;
    };

    HMDAEngine.setDebug = function(level) {
        DEBUG = level;
    };

    /*
     * -----------------------------------------------------
     * Convenience
     * -----------------------------------------------------
     */

    HMDAEngine.getValidYears = function() {
        return hmdaRuleSpec.getValidYears();
    };

    HMDAEngine.getFileSpec = function(year) {
        return hmdaRuleSpec.getFileSpec(year);
    };

    /*
     * -----------------------------------------------------
     * Condition Functions
     * -----------------------------------------------------
     */

    HMDAEngine.email_address = function(property) {
        var regex = /^[\w.]*\w+@\w+[\w.]*\w+\.\w+\s*$/;

        return regex.test(property);
    };

    HMDAEngine.zipcode = function(property) {
        var regex = /^\d{5}(?:\s*|-\d{4})$/;

        return regex.test(property);
    };

    HMDAEngine.yyyy_mm_dd_hh_mm_ss = function(property) {
        return moment(property, 'YYYYMMDDHHmmss', true).isValid();
    };

    HMDAEngine.yyyy_mm_dd_hh_mm = function(property) {
        return moment(property, 'YYYYMMDDHHmm', true).isValid();
    };

    HMDAEngine.yyyy_mm_dd = function(property) {
        return moment(property, 'YYYYMMDD', true).isValid();
    };

    HMDAEngine.mm_dd_yyyy = function(property) {
        return moment(property, 'MMDDYYYY', true).isValid();
    };

    HMDAEngine.yyyy = function(property) {
        return moment(property, 'YYYY', true).isValid();
    };

    HMDAEngine.hh_mm = function(property) {
        return moment(property, 'HHmm', true).isValid();
    };

    HMDAEngine.hh_mm_ss = function(property) {
        return moment(property, 'HHmmss', true).isValid();
    };

    HMDAEngine.matches_regex = function(property, regexStr) {
        try {
            var regex = new RegExp(regexStr);
            return regex.test(property);
        } catch (error) {
            return false;
        }
    };

    HMDAEngine.is_true = function(property) {
        return !!property;
    };

    HMDAEngine.is_false = function(property) {
        return !property;
    };

    HMDAEngine.in = function(property, values) {
        return _.contains(values, property);
    };

    HMDAEngine.not_in = function(property, values) {
        return ! _.contains(values, property);
    };

    HMDAEngine.contains = function(property, value) {
        if (_.isArray(property)) {
            return _.contains(property, value);
        }
        if (_.isString(property)) {
            return property.indexOf(value) !== -1;
        }
    };

    HMDAEngine.does_not_contain = function(property, value) {
        return ! _.contains(property, value);
    };

    HMDAEngine.includes_all = function(property, values) {
        return _.every(values, function(value) {
            return _.contains(property, value);
        });
    };

    HMDAEngine.includes_none = function(property, values) {
        return _.every(values, function(value) {
            return ! _.contains(property, value);
        });
    };

    HMDAEngine.is_integer = function(property) {
        return !isNaN(+property) && +property === parseInt(property);
    };

    HMDAEngine.is_float = function(property) {
        return !isNaN(+property) && +property !== parseInt(property);
    };

    HMDAEngine.equal = HMDAEngine.equal_property = function(property, value) {
        return property === value;
    };

    HMDAEngine.not_equal = HMDAEngine.not_equal_property = function(property, value) {
        return property !== value;
    };

    HMDAEngine.greater_than = HMDAEngine.greater_than_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property > +value;
    };

    HMDAEngine.less_than = HMDAEngine.less_than_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property < +value;
    };

    HMDAEngine.greater_than_or_equal = HMDAEngine.greater_than_or_equal_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property >= +value;
    };

    HMDAEngine.less_than_or_equal = HMDAEngine.less_than_or_equal_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property <= +value;
    };

    HMDAEngine.between = function(property, start, end) {
        return !isNaN(+property) && !isNaN(+start) && !isNaN(+end) && +property > +start && +property < +end;
    };

    HMDAEngine.starts_with = function(property, value) {
        return property.lastIndexOf(value, 0) === 0;
    };

    HMDAEngine.ends_with = function(property, value) {
        var position = property.length - value.length;
        var lastIndex = property.indexOf(value, position);
        return lastIndex !== -1 && lastIndex === position;
    };

    HMDAEngine.is_empty = function(property) {
        return property.trim() === '';
    };

    HMDAEngine.not_empty = function(property) {
        return property.trim() !== '';
    };

    /*
     * -----------------------------------------------------
     * Custom Non-API functions
     * -----------------------------------------------------
     */

    HMDAEngine.accumulatedIf = function(hmdaFile, ifCond, thenCond) {
        var currentEngine = this,
            ifCondId,
            thenCondId;

        if (DEBUG > 1) {
            ifCondId = '- accumulatedIf';
            thenCondId = '- accumulatedThen';
        }

        return currentEngine.execRule({'hmdaFile': hmdaFile}, ifCond, ifCondId)
        .then(function(ifResult) {
            if (ifResult.length !== 0 && _.isArray(ifResult)) {
                return [];
            }
            return currentEngine.execRule({'hmdaFile': hmdaFile}, thenCond, thenCondId)
            .then(function(thenResult) {
                if (thenResult.length !== 0 && _.isArray(thenResult)) {
                    return [accumulateResult(ifResult, thenResult)];
                }
                return [];
            });
        });
    };

    /* hmda-syntactical */
    HMDAEngine.hasRecordIdentifiersForEachRow = function(hmdaFile) {
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
        return handleArrayErrors(hmdaFile, records, ['recordID']);
    };

    HMDAEngine.hasAtLeastOneLAR = function(hmdaFile) {
        return hmdaFile.loanApplicationRegisters.length > 0;
    };

    HMDAEngine.isValidAgencyCode = function(hmdaFile) {
        var validAgencies = ['1', '2', '3', '5', '7', '9'];
        var records = [];

        if (! _.contains(validAgencies, hmdaFile.transmittalSheet.agencyCode)) {
            return handleArrayErrors(hmdaFile, [1], ['agencyCode']);
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
        return handleArrayErrors(hmdaFile, records, ['agencyCode']);
    };

    HMDAEngine.hasUniqueLoanNumbers = function(hmdaFile) {
        if (_.unique(hmdaFile.loanApplicationRegisters, _.iteratee('loanNumber')).length === hmdaFile.loanApplicationRegisters.length) {
            return true;
        }

        var counts = _.groupBy(hmdaFile.loanApplicationRegisters, function(lar) {
            return lar.loanNumber;
        });

        return handleUniqueLoanNumberErrors(counts);
    };

    /* lar-syntactical */
    HMDAEngine.isActionDateInActivityYear = function(actionDate, activityYear) {
        return activityYear === actionDate.slice(0,4);
    };

    /* lar-quality */
    HMDAEngine.isValidLoanAmount = function(loanAmount, applicantIncome) {
        if (!isNaN(+applicantIncome) && loanAmount >= 1000) {
            return loanAmount < 5 * applicantIncome;
        }

        return true;
    };

    HMDAEngine.isLoanAmountFiveTimesIncome = function(loanAmount, applicantIncome) {
        return loanAmount > applicantIncome * 5;
    };

    /* ts-quality */
    HMDAEngine.checkTotalLARCount = function(hmdaFile) {
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
    HMDAEngine.compareNumEntriesSingle = function(loanApplicationRegisters, rule, cond) {
        var currentEngine = this,
            count = 0,
            ruleid,
            condid;

        if (DEBUG > 1) {
            ruleid = '- compareNumEntriesSingleRule';
            condid = '- compareNumEntriesSingleCond';
        }

        return Q.map(loanApplicationRegisters, function(lar) {
            return currentEngine.execRule(lar, rule, ruleid)
            .then(function(result) {
                if (result.length === 0) {
                    count += 1;
                }
                return;
            });
        })
        .then(function() {
            var topLevelObj = {};
            topLevelObj[cond.property] = count;
            var calculations = {'properties': {}};
            if (rule.hasOwnProperty('label')) {
                calculations.properties[rule.label] = count;
            }
            return currentEngine.execRule(topLevelObj, cond, condid)
            .then(function(result) {
                if (result.length === 0) {
                    return calculations;
                }
                // A non-empty array is considered an error in execRule
                return [calculations];
            });
        });
    };

    HMDAEngine.compareNumEntries = function(loanApplicationRegisters, ruleA, ruleB, cond) {
        var currentEngine = this,
            countA = 0,
            countB = 0,
            ruleAid,
            ruleBid,
            condid;

        if (DEBUG > 1) {
            ruleAid = '- compareNumEntriesRuleA';
            ruleBid = '- compareNumEntriesRuleB';
            condid = '- compareNumEntriesCond';
        }

        return Q.map(loanApplicationRegisters, function(lar) {
            return currentEngine.execRule(lar, ruleA, ruleAid)
            .then(function(result) {
                if (result.length === 0) {
                    countA += 1;
                }
                return currentEngine.execRule(lar, ruleB, ruleBid)
                .then(function(result) {
                    if (result.length === 0) {
                        countB += 1;
                    }
                    return;
                });
            });
        })
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
            return currentEngine.execRule(topLevelObj, cond, condid)
            .then(function(result) {
                if (result.length === 0) {
                    return calculations;
                }
                // A non-empty array is considered an error in execRule
                return [calculations];
            });
        });

    };

    HMDAEngine.isValidNumMultifamilyLoans = function(hmdaFile) {
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

    var resultBodyAsError = function(body) {
        var result = resultFromResponse(body);
        if (result.result) {
            return true;
        } else {
            delete result.result;
            return [{'properties': result}];
        }
    };

    HMDAEngine.apiGET = function(funcName, params) {
        var url = this.getAPIURL()+'/'+funcName+'/'+this.getRuleYear()+'/'+params.join('/');
        return GET(url);
    };

    /* ts-syntactical */
    HMDAEngine.isTimestampLaterThanDatabase = function(respondentId, agencyCode, timestamp) {
        return this.apiGET('isValidTimestamp', [agencyCode, respondentId, timestamp])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    /* hmda-syntactical */
    HMDAEngine.isValidControlNumber = function(hmdaFile) {
        var agencyCode = hmdaFile.transmittalSheet.agencyCode,
            respondentID = hmdaFile.transmittalSheet.respondentID;
        return this.apiGET('isValidControlNumber',
            [agencyCode, respondentID])
        .then(function(response) {
            var result = resultFromResponse(response).result;
            if (!result) {
                return handleArrayErrors(hmdaFile, [1], ['agencyCode', 'respondentID']);
            } else {
                var lineNumbers = [];
                _.each(hmdaFile.loanApplicationRegisters, function(element, index, list) {
                    if (element.agencyCode !== agencyCode || element.respondentID !== respondentID) {
                        lineNumbers.push(index + 2);
                    }
                });
                if (lineNumbers.length !== 0) {
                    return handleArrayErrors(hmdaFile, lineNumbers, ['agencyCode', 'respondentID']);
                }
            }
            return true;
        });
    };

    /* lar-validity */
    HMDAEngine.isValidMetroArea = function(metroArea) {
        if (metroArea === 'NA') {
            return true;
        }
        return this.apiGET('isValidMSA', [metroArea])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    HMDAEngine.isValidMsaMdStateAndCountyCombo = function(metroArea, fipsState, fipsCounty) {
        return this.apiGET('isValidMSAStateCounty', [metroArea, fipsState, fipsCounty])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    HMDAEngine.isValidStateAndCounty = function(fipsState, fipsCounty) {
        return this.apiGET('isValidStateCounty', [fipsState, fipsCounty])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    HMDAEngine.isValidCensusTractCombo = function(censusTract, metroArea, fipsState, fipsCounty) {
        return this.apiGET('isValidCensusTractCombo', [fipsState, fipsCounty, metroArea, censusTract])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    /* ts-validity */
    HMDAEngine.isRespondentMBS = function(respondentID, agencyCode) {
        return this.apiGET('isRespondentMBS', [agencyCode, respondentID])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    /* lar-quality */
    HMDAEngine.isValidStateCountyCensusTractCombo = function(recordID, metroArea, fipsState, fipsCounty, censusTract) {
       return this.apiGET('isValidCensusCombination', [fipsState, fipsCounty, censusTract])
        .then(function(response) {
            var result = resultFromResponse(response);
            if (result.result) {
                if ((metroArea === 'NA' && result.msa_code!=='') || metroArea!==result.msa_code) {
                    var error = {'properties': {}};
                    error.properties['Recommended MSA/MD'] = result.msa_code;
                    error.properties['LAR number'] = recordID;
                    error.properties['Reported State Code'] = fipsState;
                    error.properties['Reported County Code'] = fipsCounty;
                    error.properties['Reported Census Tract'] = censusTract;
                    return [error];
                }
                return true;
            }
            return false;
        });
    };

    HMDAEngine.isNotIndependentMortgageCoOrMBS = function(respondentID, agencyCode) {
        return this.apiGET('isNotIndependentMortgageCoOrMBS', [agencyCode, respondentID])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    HMDAEngine.isMetroAreaOnRespondentPanel = function(metroArea, respondentID, agencyCode) {
        return this.apiGET('isMetroAreaOnRespondentPanel', [agencyCode, respondentID, metroArea])
        .then(function(response) {
            return resultFromResponse(response).result;
        });
    };

    /* ts-quality */
    HMDAEngine.isChildFI = function(respondentID, agencyCode) {
        return this.apiGET('isChildFI', [agencyCode, respondentID])
        .then(function(body) {
            return resultFromResponse(body).result;
        });
    };

    HMDAEngine.isTaxIDTheSameAsLastYear = function(respondentID, agencyCode, taxID) {
        return this.apiGET('isTaxIDTheSameAsLastYear', [agencyCode, respondentID, taxID])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    /* hmda-macro */
    HMDAEngine.isValidNumLoans = function(hmdaFile) {
        var respondentID = hmdaFile.transmittalSheet.respondentID;
        var agencyCode = hmdaFile.transmittalSheet.agencyCode;
        var numLoans = hmdaFile.loanApplicationRegisters.length;
        return this.apiGET('isValidNumLoans/total', [agencyCode, respondentID, numLoans])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidNumFannieMaeLoans = function(hmdaFile) {
        var numFannieLoans = 0,
            numLoans = 0;
        _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
            if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                _.contains(['1', '2'], element.propertyType) && (element.loanType === '1')) {
                numLoans++;
                if (_.contains(['1', '3'], element.purchaserType)) {
                    numFannieLoans ++;
                }
            }
        });

        var respondentID = hmdaFile.transmittalSheet.respondentID,
            agencyCode = hmdaFile.transmittalSheet.agencyCode;
        return this.apiGET('isValidNumLoans/fannieMae', [agencyCode, respondentID, numLoans, numFannieLoans])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
        var numGinnieLoans = 0,
            numLoans = 0;
        _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
            if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                _.contains(['1', '2'], element.propertyType) && (element.loanType === '2')) {
                numLoans++;
                if (element.purchaserType === '2') {
                    numGinnieLoans ++;
                }
            }
        });

        var respondentID = hmdaFile.transmittalSheet.respondentID,
            agencyCode = hmdaFile.transmittalSheet.agencyCode;
        return this.apiGET('isValidNumLoans/ginnieMaeFHA', [agencyCode, respondentID, numLoans, numGinnieLoans])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidNumGinnieMaeVALoans = function(hmdaFile) {
        var numGinnieLoans = 0,
            numLoans = 0;
        _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
            if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                _.contains(['1', '2'], element.propertyType) && (element.loanType === '3')) {
                numLoans++;
                if (element.purchaserType === '2') {
                    numGinnieLoans ++;
                }
            }
        });

        var respondentID = hmdaFile.transmittalSheet.respondentID,
            agencyCode = hmdaFile.transmittalSheet.agencyCode;
        return this.apiGET('isValidNumLoans/ginnieMaeVA', [agencyCode, respondentID, numLoans, numGinnieLoans])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidNumHomePurchaseLoans = function(hmdaFile) {
        var count = 0;
        _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
            if (element.loanPurpose === '1' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType) && element.purchaserType !== '0') {
                count += 1;
            }
        });

        var respondentID = hmdaFile.transmittalSheet.respondentID,
            agencyCode = hmdaFile.transmittalSheet.agencyCode;
        return this.apiGET('isValidNumLoans/homePurchase', [agencyCode, respondentID, count])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidNumRefinanceLoans = function(hmdaFile) {
        var count = 0;
        _.each(hmdaFile.loanApplicationRegisters, function(element, index, next) {
            if (element.loanPurpose === '3' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType) && element.purchaserType !== '0') {
                count += 1;
            }
        });

        var respondentID = hmdaFile.transmittalSheet.respondentID,
            agencyCode = hmdaFile.transmittalSheet.agencyCode;
        return this.apiGET('isValidNumLoans/refinance', [agencyCode, respondentID, count])
        .then(function(body) {
            return resultBodyAsError(body);
        });
    };

    HMDAEngine.isValidMsaMdCountyCensusForNonDepository = function(hmdaFile) {
        var currentEngine = this,
            invalidMSAs = [];
        return currentEngine.apiGET('isCraReporter', [hmdaFile.transmittalSheet.respondentID])
        .then(function(response) {
            if (resultFromResponse(response).result) {
                var validActionTaken = ['1', '2', '3', '4', '5', '6'];
                return Q.map(hmdaFile.loanApplicationRegisters, function(element) {
                    if (_.contains(validActionTaken, element.actionTaken)) {
                        if (element.censusTract==='NA') {
                            invalidMSAs.push(element.lineNumber);
                            return Q.resolve();
                        } else {
                            return currentEngine.apiGET('isValidCensusInMSA', [element.metroArea, element.fipsState,
                                   element.fipsCounty, element.censusTract])
                            .then(function (response) {
                                if (!resultFromResponse(response).result) {
                                    invalidMSAs.push(element.lineNumber);
                                }
                            });
                        }
                    }
                    return Q.resolve();
                }, CONCURRENT_RULES)
                .then(function() {
                    if (!invalidMSAs.length) {
                        return true;
                    } else {
                        return handleArrayErrors(hmdaFile, invalidMSAs,
                            ['metroArea','fipsState','fipsCounty','censusTract']);
                    }
                });
            } else {
                return true;
            }
        });
    };

    HMDAEngine.getMSAName = function(msaCode) {
        return this.apiGET('getMSAName', [msaCode])
        .then(function(response) {
            return resultFromResponse(response).msaName;
        });
    };

    /*
     * -----------------------------------------------------
     * Parsing
     * -----------------------------------------------------
     */

    var promiseResultName = function(promises) {
        return 'promise' + promises.length + 'result';
    };

    HMDAEngine.fileToJson = function(file, year, next) {
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
                _HMDA_JSON = result;
            }
            next(err, _HMDA_JSON);
        });
    };

    HMDAEngine.parseRuleCustomCall = function(rule, result) {
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
        var resultName = promiseResultName(result.funcs);
        result.body += resultName;
        result.spreads.push(resultName);
        result.funcs.push(func);
    };

    HMDAEngine.parseRuleCondition = function(rule, result) {
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
        var resultName = promiseResultName(result.funcs);
        result.body += resultName;
        result.spreads.push(resultName);
        result.funcs.push(func);
    };

    HMDAEngine.parseRule = function(rule, result) {
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

    HMDAEngine.execRule = function(topLevelObj, rule, ruleid) {
        var result = {
            argIndex: 0,
            args: [],
            funcs: [],
            spreads: [],
            body: '',
            properties: {}
        };

        this.parseRule(rule, result);
        var functionBody = 'return Q.spread([';
        functionBody += result.funcs.join(',');
        functionBody += '], function(';
        functionBody += result.spreads.join(',');
        functionBody += ') { return ' + result.body + ' });';

        var args = _.map(result.args, function(arg) {
            if (typeof(arg) === 'string') {
                var contextList = [topLevelObj, !topLevelObj.hmdaFile ? _HMDA_JSON : {}];        // Context list to search
                return resolveArg(arg, contextList);
            } else {
                return arg;
            }
        });

        if (ruleid) {
            console.time('    ' + ruleid);
        }
        return new Function(functionBody).apply(this, args)
        .then(function(funcResult) {
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

    /*
     * -----------------------------------------------------
     * API Endpoints
     * -----------------------------------------------------
     */

    var addToErrors = function(newErrors, rule, editType, scope) {
        if (errors[editType][rule.id] === undefined) {
            errors[editType][rule.id] = {
                'errors': []
            };
            errors[editType][rule.id].description = rule.description;
            errors[editType][rule.id].explanation = rule.explanation;
            errors[editType][rule.id].scope = scope;
        }

        for (var i = 0; i < newErrors.length; i++) {
            errors[editType][rule.id].errors.push(newErrors[i]);
        }
    };

    HMDAEngine.getExecRulePromise = function(args) {
        if (DEBUG > 2) {
            console.time('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
        }
        return this.execRule(args.topLevelObj, args.rule.rule)
        .then(function(result) {
            if (_.isArray(result) && result.length !== 0) {
                addToErrors(result, args.rule, args.editType, args.scope);
            }
            if (DEBUG > 2) {
                console.timeEnd('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
            }
        });
    };

    HMDAEngine.runEdits = function(year, scope, editType) {
        var currentEngine = this;
        this.setRuleYear(year);
        var rules = hmdaRuleSpec.getEdits(year, scope, editType);

        var topLevelObj;
        switch (scope) {
            case 'ts':
                topLevelObj = _HMDA_JSON.hmdaFile.transmittalSheet;
                break;
            case 'lar':
                topLevelObj = _HMDA_JSON.hmdaFile.loanApplicationRegisters;
                break;
            case 'hmda':
                topLevelObj = _HMDA_JSON;
                break;
        }

        return Q.map(rules, function(currentRule) {
            if (DEBUG > 0) {
                console.time('    ' + currentRule.id + ' - ' + scope);
            }
            var args = {
                'topLevelObj': topLevelObj,
                'rule': currentRule,
                'scope': scope,
                'editType': editType
            };
            if (_.isArray(topLevelObj)) {
                return Q.map(topLevelObj, function(currentTopLevelObj) {
                    args.topLevelObj = currentTopLevelObj;
                    return currentEngine.getExecRulePromise(args);
                }, CONCURRENT_RULES)
                .then(function() {
                    if (DEBUG > 0) {
                        console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                    }
                });
            } else {
                return currentEngine.getExecRulePromise(args)
                .then(function() {
                    if (DEBUG > 0) {
                        console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                    }
                });
            }

        }, CONCURRENT_RULES);

    };

    HMDAEngine.runSyntactical = function(year) {
        if (DEBUG) {
            console.time('time to run syntactical rules');
        }
        return Q.all([
            this.runEdits(year, 'ts', 'syntactical'),
            this.runEdits(year, 'lar', 'syntactical'),
            this.runEdits(year, 'hmda', 'syntactical')
        ])
        .then(function() {
            if (DEBUG) {
                console.timeEnd('time to run syntactical rules');
            }
        })
        .fail(function(err) {
            return resolveError(err);
        });
    };

    HMDAEngine.runValidity = function(year) {
        if (DEBUG) {
            console.time('time to run validity rules');
        }
        return Q.all([
            this.runEdits(year, 'ts', 'validity'),
            this.runEdits(year, 'lar', 'validity')
        ])
        .then(function() {
            if (DEBUG) {
                console.timeEnd('time to run validity rules');
            }
        })
        .fail(function(err) {
            return resolveError(err);
        });
    };

    HMDAEngine.runQuality = function(year) {
        if (DEBUG) {
            console.time('time to run quality rules');
        }
        return Q.all([
            this.runEdits(year, 'ts', 'quality'),
            this.runEdits(year, 'lar', 'quality'),
            this.runEdits(year, 'hmda', 'quality')
        ])
        .then(function() {
            if (DEBUG) {
                console.timeEnd('time to run quality rules');
            }
        })
        .fail(function(err) {
            return resolveError(err);
        });
    };

    HMDAEngine.runMacro = function(year) {
        if (DEBUG) {
            console.time('time to run macro rules');
        }
        return Q.all([
            this.runEdits(year, 'hmda', 'macro')
        ])
        .then(function() {
            if (DEBUG) {
                console.timeEnd('time to run macro rules');
            }
        })
        .fail(function(err) {
            return resolveError(err);
        });
    };

    HMDAEngine.runSpecial = function(year) {
        if (DEBUG) {
            console.time('time to run special rules');
        }
        return Q.all([
            this.runEdits(year, 'lar', 'special')
        ])
        .then(function() {
            if (DEBUG) {
                console.timeEnd('time to run special rules');
            }
        })
        .fail(function(err) {
            return resolveError(err);
        });
    };

}.call((function() {
  return (typeof module !== 'undefined' && module.exports &&
    typeof window === 'undefined') ? global : window;
}())));
