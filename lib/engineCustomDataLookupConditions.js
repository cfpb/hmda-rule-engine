/* global -Promise */
'use strict';

var utils = require('./utils'),
    _ = require('underscore'),
    Promise = require('bluebird');

var EngineCustomDataLookupConditions = (function() {
    return function() {

        /* ts-syntactical */
        this.isTimestampLaterThanDatabase = function(respondentId, agencyCode, timestamp) {
            return this.apiGET('isValidTimestamp', [agencyCode, respondentId, timestamp])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        /* hmda-syntactical */
        this.isValidControlNumber = function(hmdaFile) {
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
        this.isValidMetroArea = function(metroArea) {
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

        this.isValidMsaMdStateAndCountyCombo = function(metroArea, fipsState, fipsCounty) {
            if (this.shouldUseLocalDB()) {
                return this.localCensusComboValidation([
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

        this.isValidStateAndCounty = function(fipsState, fipsCounty) {
            if (fipsState === 'NA' || fipsCounty === 'NA') {
                return Promise.resolve()
                .then(function() {
                    return false;
                });
            }
            if (this.shouldUseLocalDB()) {
                return this.localCensusComboValidation([
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

        this.isValidCensusTractCombo = function(censusTract, metroArea, fipsState, fipsCounty) {
            if (censusTract === 'NA' && metroArea === 'NA' && fipsState === 'NA' && fipsCounty === 'NA') {
                return true;
            }

            if (this.shouldUseLocalDB()) {
                return this.localCensusComboValidation([
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
        this.isRespondentMBS = function(respondentID, agencyCode) {
            return this.apiGET('isRespondentMBS', [agencyCode, respondentID])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        /* ts-quality */
        this.isChildFI = function(respondentID, agencyCode) {
            return this.apiGET('isChildFI', [agencyCode, respondentID])
            .then(function(response) {
                return utils.jsonParseResponse(response).result;
            });
        };

        this.isTaxIDTheSameAsLastYear = function(respondentID, agencyCode, taxID) {
            return this.apiGET('isTaxIDTheSameAsLastYear', [agencyCode, respondentID, taxID])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        /* hmda-macro */
        this.isValidNumLoans = function(hmdaFile) {
            var respondentID = hmdaFile.transmittalSheet.respondentID;
            var agencyCode = hmdaFile.transmittalSheet.agencyCode;
            var numLoans = hmdaFile.loanApplicationRegisters.length;
            return this.apiGET('isValidNumLoans/total', [agencyCode, respondentID, numLoans])
            .then(function(body) {
                return utils.resultBodyAsError(body);
            });
        };

        this.isValidNumFannieMaeLoans = function(hmdaFile) {
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

        this.isValidNumGinnieMaeFHALoans = function(hmdaFile) {
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

        this.isValidNumGinnieMaeVALoans = function(hmdaFile) {
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

        this.isValidNumHomePurchaseLoans = function(hmdaFile) {
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

        this.isValidNumRefinanceLoans = function(hmdaFile) {
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

        this.isValidMsaMdCountyCensusForNonDepository = function(hmdaFile) {
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
                                    .then(function (response) {
                                        if (!utils.jsonParseResponse(response).result) {
                                            invalidMSAs.push(element.lineNumber);
                                        }
                                    });
                                }
                            }
                        }
                        return Promise.resolve();
                    }.bind(this), { concurrency: this._CONCURRENT_RULES })
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

        /* hmda-special */
        this.isValidStateCountyCensusTractCombo = function(hmdaFile) {
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
                    return this.localCensusComboValidation([
                        {'state_code': element.fipsState},
                        {'county_code': element.fipsCounty},
                        {'tract': element.censusTract}
                    ], true)
                    .then(function(result) {
                        pushMSA(element, result);
                        this.postTaskCompletedMessage();
                        return;
                    }.bind(this));
                } else {
                    return this.apiGET('isValidCensusCombination', [element.fipsState, element.fipsCounty, element.censusTract])
                    .then(function(response) {
                        pushMSA(element, utils.jsonParseResponse(response));
                        this.postTaskCompletedMessage();
                        return;
                    }.bind(this));
                }
            }.bind(this), { concurrency: this._CONCURRENT_RULES })
            .then(function() {
                if (!invalidMSAs.length) {
                    return true;
                } else {
                    return invalidMSAs;
                }
            });
        };

        this.isMetroAreaOnRespondentPanel = function(hmdaFile) {
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
                                this.postTaskCompletedMessage();
                                if (!result.result) {
                                    invalidMSAs.push(element.metroArea);
                                }
                                return result;
                            }.bind(this));
                        }
                    }.bind(this),  {concurrency: this._CONCURRENT_RULES});
                } else {
                    this.postTaskCompletedMessage(hmdaFile.loanApplicationRegisters.length);
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
                    }.bind(this), { concurrency: this._CONCURRENT_RULES })
                    .then(function() {
                        return errors;
                    });
                }
            }.bind(this));
        };

        this.getMetroAreasOnRespondentPanel = function(agencyCode,respondentID) {
            return this.apiGET('getMetroAreasOnRespondentPanel', [agencyCode, respondentID])
            .then(function(response) {
                return utils.jsonParseResponse(response).msa;
            });
        };

        this.getMSAName = function(msaCode) {
            if (this.shouldUseLocalDB()) {
                return this.localMSALookup(msaCode);
            } else {
                return this.apiGET('getMSAName', [msaCode])
                .then(function(response) {
                    return utils.jsonParseResponse(response).msaName;
                });
            }
        };

        return this;
    };
})();

module.exports = EngineCustomDataLookupConditions;