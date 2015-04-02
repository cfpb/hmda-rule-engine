/* global -Promise */
'use strict';

var utils = require('./utils'),
    _ = require('underscore'),
    Promise = require('bluebird');

var EngineCustomConditions = (function() {
    return function() {

        var accumulateResult = function(ifResult, thenResult) {
            var result = {'properties': {}};
            var thenKeys = _.keys(thenResult[0].properties);
            result.properties = ifResult.properties;

            for (var i = 0; i < thenKeys.length; i++) {
                result.properties[thenKeys[i]] = thenResult[0].properties[thenKeys[i]];
            }
            return result;
        };

        /* hmda-syntactical */
        this.hasRecordIdentifiersForEachRow = function(hmdaFile) {
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

        this.hasAtLeastOneLAR = function(hmdaFile) {
            if (hmdaFile.loanApplicationRegisters.length > 0) {
                return true;
            }
            var error = {'properties': {}};
            error.properties['Total Loan/Application records in file'] = hmdaFile.loanApplicationRegisters.length;
            return [error];
        };

        this.isValidAgencyCode = function(hmdaFile) {
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

        this.hasUniqueLoanNumbers = function(hmdaFile) {
            var counts = _.groupBy(hmdaFile.loanApplicationRegisters, function(lar) {
                return lar.loanNumber;
            });

            return utils.handleUniqueLoanNumberErrors(counts);
        };

        /* lar-syntactical */
        this.isActionDateInActivityYear = function(actionDate, activityYear) {
            return activityYear === actionDate.slice(0,4);
        };

        /* lar-quality */
        this.isValidLoanAmount = function(loanAmount, applicantIncome) {
            if (!isNaN(+applicantIncome) && loanAmount >= 1000) {
                return loanAmount < 5 * applicantIncome;
            }

            return true;
        };

        this.isLoanAmountFiveTimesIncome = function(loanAmount, applicantIncome) {
            return loanAmount > applicantIncome * 5;
        };

        /* ts-quality */
        this.checkTotalLARCount = function(hmdaFile) {
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
        this.accumulatedIf = function(hmdaFile, ifCond, thenCond) {
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
                        return [accumulateResult(ifResult, thenResult)];
                    }
                    return [];
                });
            }.bind(this));
        };

        this.compareNumEntriesSingle = function(loanApplicationRegisters, rule, cond) {
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

        this.compareNumEntries = function(loanApplicationRegisters, ruleA, ruleB, cond) {
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

        this.isValidNumMultifamilyLoans = function(hmdaFile) {
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


        return this;
    };
})();

module.exports = EngineCustomConditions;