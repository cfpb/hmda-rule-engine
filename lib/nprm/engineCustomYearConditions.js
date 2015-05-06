/* global -Promise */
'use strict';

var utils = require('../utils'),
    _ = require('lodash'),
    Promise = require('bluebird');

var EngineCustomYearConditions = (function() {
    return function() {
        this.isValidControlNumber = function(hmdaFile) {
            var ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;
            return this.apiGET('isValidControlNumber',
                [0, legalEntityID])
            .then(function(response) {
                if (!utils.jsonParseResponse(response).result) {
                    return utils.handleArrayErrors(hmdaFile, [1], ['legalEntityID']);
                } else {
                    var lineNumbers = [],
                        lars = hmdaFile.loanApplicationRegisters,
                        len = lars.length;

                    for (var i = 0; i < len; i++) {
                        var element = lars[i];
                        if (element.legalEntityID !== legalEntityID) {
                            lineNumbers.push(i + 2);
                        }
                    }

                    if (lineNumbers.length !== 0) {
                        return utils.handleArrayErrors(hmdaFile, lineNumbers, ['legalEntityID']);
                    }
                }
                return true;
            });
        };

        this.hasUniqueLoanNumbers = function(hmdaFile) {
            var lars = hmdaFile.loanApplicationRegisters;
            var counts = _.groupBy(lars, function(lar) {
                return lar.universalLoanID;
            });

            return utils.handleUniqueLoanNumberErrors(counts);
        };

        this.isTimestampLaterThanDatabase = function(legalEntityID, timestamp) {
            return this.apiGET('isValidTimestamp', ['0', legalEntityID, timestamp])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        this.isRespondentMBS = function(legalEntityID) {
            return this.apiGET('isRespondentMBS', ['0', legalEntityID])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };
    };
})();

module.exports = EngineCustomYearConditions;
