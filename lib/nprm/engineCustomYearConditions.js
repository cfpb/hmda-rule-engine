/* global -Promise */
'use strict';

var utils = require('../utils'),
    _ = require('lodash'),
    Promise = require('bluebird');

var EngineCustomYearConditions = (function() {
    return function() {
        this.zipcode = function(property) {
            var regex = /^\d{5}(?:\s*|\d{4})$/;

            return regex.test(property);
        };

        /* hmda-syntactical */
        this.isValidControlNumber = function(hmdaFile) {
            var ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;
            return this.apiGET('isValidControlNumber',
                ['0', legalEntityID])
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

        var handleUniqueLoanNumberErrors = function(counts) {
            var errors = [];
            var loanNumbers = _.keys(counts);
            for (var i = 0; i < loanNumbers.length; i++) {
                var loanNumber = loanNumbers[i];
                if (counts[loanNumber].length > 1) {
                    var error = {'properties': {'universalLoanID': loanNumber}};
                    var lineNumbers = [];
                    for (var j = 0; j < counts[loanNumber].length; j++) {
                        lineNumbers.push(counts[loanNumber][j].lineNumber);
                    }
                    error.lineNumber = lineNumbers.join(', ');
                    errors.push(error);
                }
            }
            return errors;
        };

        this.hasUniqueLoanNumbers = function(hmdaFile) {
            var lars = hmdaFile.loanApplicationRegisters;
            var counts = _.groupBy(lars, function(lar) {
                return lar.universalLoanID;
            });

            return handleUniqueLoanNumberErrors(counts);
        };

        /* ts-syntactical */
        this.isTimestampLaterThanDatabase = function(legalEntityID, timestamp) {
            return this.apiGET('isValidTimestamp', ['0', legalEntityID, timestamp])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        /* ts-validity */
        this.isRespondentMBS = function(legalEntityID) {
            return this.apiGET('isRespondentMBS', ['0', legalEntityID])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        /* ts-quality */
        this.isChildFI = function(legalEntityID) {
            return this.apiGET('isChildFI', ['0', legalEntityID])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        this.isTaxIDTheSameAsLastYear = function(legalEntityID, taxID) {
            return this.apiGET('isTaxIDTheSameAsLastYear', ['0', legalEntityID, taxID])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        /* hmda-macro */
        this.isValidNumLoans = function(hmdaFile) {
            var ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID,
                numLoans = hmdaFile.loanApplicationRegisters.length;

            return this.apiGET('isValidNumLoans/total', ['0', legalEntityID, numLoans])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumFannieMaeLoans = function(hmdaFile) {
            var numFannieLoans = 0,
                numLoans = 0,
                lars = hmdaFile.loanApplicationRegisters,
                len = lars.length,
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;

            for (var i = 0; i < len; i++) {
                var element = lars[i];
                if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                    _.contains(['1', '2'], element.propertyType) && (element.loanType === '1')) {
                    numLoans++;
                    if (_.contains(['1', '3'], element.purchaserType)) {
                        numFannieLoans++;
                    }
                }
            }

            return this.apiGET('isValidNumLoans/fannieMae', ['0', legalEntityID, numLoans, numFannieLoans])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
            var numGinnieLoans = 0,
                numLoans = 0,
                lars = hmdaFile.loanApplicationRegisters,
                len = lars.length,
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;

            for (var i = 0; i < len; i++) {
                var element = lars[i];
                if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                    _.contains(['1', '2'], element.propertyType) && (element.loanType === '2')) {
                    numLoans++;
                    if (element.purchaserType === '2') {
                        numGinnieLoans++;
                    }
                }
            }

            return this.apiGET('isValidNumLoans/ginnieMaeFHA', ['0', legalEntityID, numLoans, numGinnieLoans])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumGinnieMaeVALoans = function(hmdaFile) {
            var numGinnieLoans = 0,
                numLoans = 0,
                lars = hmdaFile.loanApplicationRegisters,
                len = lars.length,
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;

            for (var i = 0; i < len; i++) {
                var element = lars[i];
                if (_.contains(['1', '3'], element.loanPurpose) && _.contains(['1', '6'], element.actionTaken) &&
                    _.contains(['1', '2'], element.propertyType) && (element.loanType === '3')) {
                    numLoans++;
                    if (element.purchaserType === '2') {
                        numGinnieLoans++;
                    }
                }
            }

            return this.apiGET('isValidNumLoans/ginnieMaeVA', ['0', legalEntityID, numLoans, numGinnieLoans])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumHomePurchaseLoans = function(hmdaFile) {
            var count = 0,
                countSold = 0,
                lars = hmdaFile.loanApplicationRegisters,
                len = lars.length,
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;

            for (var i = 0; i < len; i++) {
                var element = lars[i];
                if (element.loanPurpose === '1' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType)) {
                    count += 1;
                    if (element.purchaserType !== '0') {
                        countSold += 1;
                    }
                }
            }

            return this.apiGET('isValidNumLoans/homePurchase', ['0', legalEntityID, count, countSold])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumRefinanceLoans = function(hmdaFile) {
            var count = 0,
                countSold = 0,
                lars = hmdaFile.loanApplicationRegisters,
                len = lars.length,
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID;

            for (var i = 0; i < len; i++) {
                var element = lars[i];
                if (element.loanPurpose === '3' && _.contains(['1', '6'], element.actionTaken) && _.contains(['1', '2'], element.propertyType)) {
                    count += 1;
                    if (element.purchaserType !== '0') {
                        countSold += 1;
                    }
                }
            }

            return this.apiGET('isValidNumLoans/refinance', ['0', legalEntityID, count, countSold])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidMsaMdCountyCensusForNonDepository = function(hmdaFile) {
            var invalidMSAs = [];
            return this.apiGET('isCraReporter', [hmdaFile.transmittalSheet.legalEntityID])
            .then(function(response) {
                if (utils.jsonParseResponse(response).result) {
                    var validActionTaken = ['1', '2', '3', '4', '5', '6'];
                    return Promise.map(hmdaFile.loanApplicationRegisters, function(element) {
                        if (_.contains(validActionTaken, element.actionTaken)) {
                            if (element.censusTract === 'NA') {
                                invalidMSAs.push(element.lineNumber);
                                return Promise.resolve();
                            } else {
                                if (this.shouldUseLocalDB()) {
                                    return this.localCensusComboValidation([
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
                                    .then(function(response) {
                                        if (!utils.jsonParseResponse(response).result) {
                                            invalidMSAs.push(element.lineNumber);
                                        }
                                    });
                                }
                            }
                        }
                        return;
                    }.bind(this), {concurrency: this._CONCURRENT_LARS})
                    .cancellable()
                    .then(function() {
                        if (!invalidMSAs.length) {
                            return true;
                        } else {
                            return utils.handleArrayErrors(hmdaFile, invalidMSAs,
                                ['metroArea', 'fipsState', 'fipsCounty', 'censusTract']);
                        }
                    });
                } else {
                    return true;
                }
            }.bind(this));
        };

        /* hmda-special */
        this.isValidStateCountyCensusTractCombo = function(hmdaFile) {
            var invalidMSAs = [];

            var pushMSA = function(element, result) {
                if (result.result) {
                    if ((element.metroArea === 'NA' && result.msa_code !== '') || element.metroArea !== result.msa_code) {
                        var error = {
                            'properties': {
                                'Recommended MSA/MD': result.msa_code,
                                'LAR number': element.universalLoanID,
                                'Reported State Code': element.fipsState,
                                'Reported County Code': element.fipsCounty,
                                'Reported Census Tract': element.censusTract
                            }
                        };
                        invalidMSAs.push(error);
                    }
                }
            };

            return Promise.map(hmdaFile.loanApplicationRegisters, function(element) {
                if (this.shouldUseLocalDB()) {
                    return this.localCensusComboValidation([
                        {'state_code': element.fipsState},
                        {'county_code': element.fipsCounty},
                        {'tract': element.censusTract}
                    ], true)
                    .then(function(result) {
                        pushMSA(element, result);
                        return;
                    }.bind(this));
                } else {
                    return this.apiGET('isValidCensusCombination', [element.fipsState, element.fipsCounty, element.censusTract])
                    .then(function(response) {
                        pushMSA(element, utils.jsonParseResponse(response));
                        return;
                    }.bind(this));
                }
            }.bind(this), {concurrency: this._CONCURRENT_LARS})
            .cancellable()
            .then(function() {
                if (!invalidMSAs.length) {
                    return true;
                } else {
                    return invalidMSAs;
                }
            });
        };

        this.isMetroAreaOnRespondentPanel = function(hmdaFile) {
            var invalidMSAs = [],
                ts = hmdaFile.transmittalSheet,
                legalEntityID = ts.legalEntityID,
                lars = hmdaFile.loanApplicationRegisters;
            return this.apiGET('isNotIndependentMortgageCoOrMBS', ['0', legalEntityID])
            .then(function(response) {
                if (utils.jsonParseResponse(response).result === true) {
                    return this.getMetroAreasOnRespondentPanel(legalEntityID)
                    .then(function(msas) {
                        return Promise.map(lars, function(element) {
                            var validActionTaken = ['1', '2', '3', '4', '5', '7', '8'];
                            if (_.contains(validActionTaken, element.actionTaken)) {
                                if (!_.contains(msas, element.metroArea)) {
                                    invalidMSAs.push(element.metroArea);
                                }
                            }
                        }.bind(this),  {concurrency: this._CONCURRENT_LARS})
                        .cancellable();
                    }.bind(this));
                }
            }.bind(this))
            .then(function() {
                if (!invalidMSAs.length) {
                    return true;
                } else {
                    var errors = [],
                        uniqueMSAMap = {};
                    for (var i = 0; i < invalidMSAs.length; i++) {
                        if (uniqueMSAMap[invalidMSAs[i]] === undefined) {
                            uniqueMSAMap[invalidMSAs[i]] = 1;
                        } else {
                            uniqueMSAMap[invalidMSAs[i]]++;
                        }
                    }

                    return Promise.map(_.keys(uniqueMSAMap), function(msaKey) {
                        return this.getMSAName(msaKey)
                        .then(function(msaName) {
                            errors.push({
                                'properties': {
                                    'LAR Count': uniqueMSAMap[msaKey],
                                    'MSA/MD': msaKey,
                                    'MSA/MD name': msaName
                                }
                            });
                            return Promise.resolve();
                        });
                    }.bind(this))
                    .cancellable()
                    .then(function() {
                        return errors;
                    });
                }
            }.bind(this));
        };

        this.getMetroAreasOnRespondentPanel = function(legalEntityID) {
            return this.apiGET('getMetroAreasOnRespondentPanel', ['0', legalEntityID])
            .then(function(response) {
                return utils.jsonParseResponse(response).msa;
            });
        };
    };
})();

module.exports = EngineCustomYearConditions;
