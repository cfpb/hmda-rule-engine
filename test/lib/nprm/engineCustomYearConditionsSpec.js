/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global mockAPI:false*/
/*global before:false*/
/*global port:false*/

'use strict';

var EngineCustomDataLookupConditions = require('../../../lib/engineCustomDataLookupConditions'),
    EngineCustomYearConditions = require('../../../lib/nprm/engineCustomYearConditions'),
    EngineLocalDB = require('../../../lib/engineLocalDB'),
    EngineApiInterface = require('../../../lib/engineApiInterface'),
    RuleParseAndExec = require('../../../lib/ruleParseAndExec'),
    Engine = function() {
        this.apiURL = 'http://localhost:' + port;
        this._USE_LOCAL_DB = false;
        this.currentYear = 'nprm';
    },
    engine,
    setupCensusAPI = function() {
        mockAPI('get', '/localdb/census/msaCodes/nprm', 200,
            JSON.parse(JSON.stringify(require('../../testdata/api_localdb_census_msaCodes.json'))));
        mockAPI('get', '/localdb/census/stateCounty/nprm', 200,
            JSON.parse(JSON.stringify(require('../../testdata/api_localdb_census_stateCounty.json'))));
        mockAPI('get', '/localdb/census/stateCountyMSA/nprm', 200,
            JSON.parse(JSON.stringify(require('../../testdata/api_localdb_census_stateCountyMSA.json'))));
        mockAPI('get', '/localdb/census/stateCountyTract/nprm', 200,
            JSON.parse(JSON.stringify(require('../../testdata/api_localdb_census_stateCountyTract.json'))));
        mockAPI('get', '/localdb/census/stateCountyTractMSA/nprm', 200,
            JSON.parse(JSON.stringify(require('../../testdata/api_localdb_census_stateCountyTractMSA.json'))));
    };

RuleParseAndExec.call(Engine.prototype);
EngineApiInterface.call(Engine.prototype);
EngineLocalDB.call(Engine.prototype);
EngineCustomDataLookupConditions.call(Engine.prototype);

EngineCustomYearConditions.call(Engine.prototype);

describe('EngineCustomYearConditions', function() {

    before(function(done) {
        Engine.prototype.setHmdaJson = function(json) {
            this._HMDA_JSON = json;
        };
        Engine.prototype.getDebug = function() { return 0; };
        Engine.prototype.postTaskCompletedMessage = function() { };
        Engine.prototype.getRuleYear = function() {
            return this.currentYear;
        };
        Engine.prototype.setUseLocalDB = function(bool) {
            this._USE_LOCAL_DB = bool;
            if (bool) {
                return this.resetDB();
            } else {
                return this.destroyDB();
            }
        };
        engine = new Engine();
        done();
    });

    var hmdaJson = {};

    beforeEach(function() {
        hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/complete-nprm')));
    });

    describe('isValidControlNumber', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/0/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidControlNumber({
                transmittalSheet: {
                    legalEntityID: '0000000001'
                },
                loanApplicationRegisters: [
                ]
            })
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return error array when API response result is false', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/0/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: false}));

            engine.isValidControlNumber({
                transmittalSheet: {
                    legalEntityID: '0000000001'
                }
            })
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0]).to.have.property('lineNumber');
                expect(result[0].lineNumber).to.be('1');
                expect(result[0]).to.have.property('properties');
                expect(result[0].properties).to.have.property('legalEntityID');
                expect(result[0].properties.legalEntityID).to.be('0000000001');
                done();
            });
        });

        it('should return an error array when the API response is true but the control number is not consistent across the file', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/complete-nprm.json')));
            hmdaJson.hmdaFile.loanApplicationRegisters[0].legalEntityID = 'cat';

            engine.isValidControlNumber(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].universalLoanID).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                expect(result[0].properties).to.have.property('legalEntityID');
                expect(result[0].properties.legalEntityID).to.be('cat');
                done();
            });
        });
    });

    describe('hasUniqueLoanNumbers', function() {
        var hmdaFile = {
            loanApplicationRegisters: [
                {
                    universalLoanID: '1',
                    lineNumber: '2'
                },
                {
                    universalLoanID: '1',
                    lineNumber: '3'
                }
            ]
        };

        it('should return array with errors if any LARs have duplicate loanNumbers', function(done) {
            var result = engine.hasUniqueLoanNumbers(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].properties.universalLoanID).to.be('1');
            expect(result[0].lineNumber).to.be('2, 3');
            done();
        });

        it('should return empty array if no LARs have the same loanNumber', function(done) {
            hmdaFile.loanApplicationRegisters[1].universalLoanID = '2';
            var result = engine.hasUniqueLoanNumbers(hmdaFile);

            expect(result.length).to.be(0);
            done();
        });
    });

    describe('isValidMsaMdCountyCensusForNonDepository', function() {
        it('should return true when the respondent is not CRA reporter', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: false}));

            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true if CRA reporter and all the relevant LARs MSAs are good', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            path = '/isValidCensusInMSA/' + engine.getRuleYear() + '/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when we use local data and the result is true', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be.true();
                engine.loadCensusData(engine.getRuleYear())
                .then(function() {
                    var hmdaFile = hmdaJson.hmdaFile;
                    engine.isValidMsaMdCountyCensusForNonDepository(hmdaFile)
                    .then(function(result) {
                        expect(result).to.be.true();
                        engine.setUseLocalDB(false)
                        .then(function() {
                            done();
                        });
                    });
                });
            });
        });

        it('should return false when we use local data and the result is false', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be.true();
                engine.loadCensusData(engine.getRuleYear())
                .then(function() {
                    var hmdaFile = hmdaJson.hmdaFile;
                    hmdaFile.loanApplicationRegisters[1].censusTract = '8000.01';
                    engine.isValidMsaMdCountyCensusForNonDepository(hmdaFile)
                    .then(function(result) {
                        expect(result.length).to.be(1);
                        expect(result[0].properties.metroArea).to.be('06920');
                        expect(result[0].properties.fipsState).to.be('06');
                        expect(result[0].properties.fipsCounty).to.be('034');
                        expect(result[0].properties.censusTract).to.be('8000.01');
                        expect(result[0].lineNumber).to.be('3');
                        expect(result[0].universalLoanID).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                        engine.setUseLocalDB(false)
                        .then(function() {
                            done();
                        });
                    });
                });
            });
        });

        it('should return false when one of the LARs census tract is NA', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            hmdaJson.hmdaFile.loanApplicationRegisters[0].censusTract = 'NA';
            path = '/isValidCensusInMSA/' + engine.getRuleYear() + '/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result[0].lineNumber).to.be('2');
                expect(result.length).to.be(1);
                done();
            });
        });
    });

    describe('isRespondentMBS', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isRespondentMBS/' + engine.getRuleYear() + '/0/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isRespondentMBS('0000000001')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidStateCountyCensusTractCombo', function() {
        it('should return true when API call to isValidCensusCombination result is false', function(done) {
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            var resp = JSON.stringify({result: false});
            mockAPI('get', path, 200, resp);
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when msaCode = the code returned from the API', function(done) {
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            var resp = JSON.stringify({result: true, msa_code: '06920'});
            mockAPI('get', path, 200, resp);
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return false when msaCode != the code returned from the API', function(done) {
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            var resp = JSON.stringify({result: true, msa_code: '35100'});
            mockAPI('get', path, 200, resp, true);
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(3);
                expect(result[0].properties['LAR number']).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                done();
            });
        });

        it('should return error information when metroArea = NA and there is a valid code', function(done) {
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            var resp = JSON.stringify({result: true, msa_code: '35100'});
            mockAPI('get', path, 200, resp);
            var hmdaFile = hmdaJson.hmdaFile;
            _.each(hmdaFile.loanApplicationRegisters, function(element) {
                element.metroArea = 'NA';
            });

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(3);
                expect(result[0].properties['LAR number']).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                expect(result[0].properties['Recommended MSA/MD']).to.be('35100');
                expect(result[0].properties['Reported State Code']).to.be('06');
                expect(result[0].properties['Reported County Code']).to.be('034');
                expect(result[0].properties['Reported Census Tract']).to.be('0100.01');
                done();
            });
        });

        it('should return true when we use local data and can not find combination', function(done) {
            var hmdaFile = hmdaJson.hmdaFile;

            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    engine.isValidStateCountyCensusTractCombo(hmdaFile)
                    .then(function(result) {
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it('should return true when msaCode = the code returned from the API', function(done) {
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return false when using local data and msaCode != the code returned', function(done) {
            var hmdaFile = hmdaJson.hmdaFile;
            _.each(hmdaFile.loanApplicationRegisters, function(element) {
                element.metroArea = '035100';
            });

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(3);
                expect(result[0].properties['LAR number']).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                expect(result[0].properties['Recommended MSA/MD']).to.be('06920');
                expect(result[0].properties['Reported State Code']).to.be('06');
                expect(result[0].properties['Reported County Code']).to.be('034');
                expect(result[0].properties['Reported Census Tract']).to.be('0100.01');
                done();
            });
        });

        it('should return error information when we use local data and metroArea = NA and there is a valid code', function(done) {
            var hmdaFile = hmdaJson.hmdaFile;
            _.each(hmdaFile.loanApplicationRegisters, function(element) {
                element.metroArea = 'NA';
            });

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(3);
                expect(result[0].properties['LAR number']).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                expect(result[0].properties['Recommended MSA/MD']).to.be('06920');
                expect(result[0].properties['Reported State Code']).to.be('06');
                expect(result[0].properties['Reported County Code']).to.be('034');
                expect(result[0].properties['Reported Census Tract']).to.be('0100.01');
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });

    });

    describe('isMetroAreaOnRespondentPanel', function() {
        it('should return true when the respondent is Independent Mortgage comapny or MBS', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: false}));
            path = '/getMetroAreasOnRespondentPanel/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({'msa':['06920']}), true);
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when the action taken is not valid', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }), true);
            var hmdaFile = hmdaJson.hmdaFile;
            _.each(hmdaFile.loanApplicationRegisters, function(element) {
                element.actionTaken = '9';
            });

            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when the respondent has a branch in the msa', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }));
            var hmdaFile = hmdaJson.hmdaFile;

            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return error data when the respondent doesnt have a branch in the msa', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/0/01234567890123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }));
            var hmdaFile = hmdaJson.hmdaFile;
            _.each(hmdaFile.loanApplicationRegisters, function(element) {
                element.metroArea = '35100';
            });
            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].properties['LAR Count']).to.be(3);
                expect(result[0].properties['MSA/MD']).to.be('35100');
                expect(result[0].properties['MSA/MD name']).to.be('New Bern, NC');
                done();
            });
        });
    });

    describe('isTimestampLaterThanDatabase', function() {
        it('should return true when API call to isValidTimestamp API call result is true', function(done) {
            var legalEntityID = '0000001195';
            var timestamp = '201501010000';
            var path =  '/isValidTimestamp/' + engine.getRuleYear() + '/0/' + legalEntityID + '/' + timestamp;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isTimestampLaterThanDatabase(legalEntityID, timestamp)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isChildFI', function() {
        it('should return true when the API response result is true', function(done) {
            var legalEntityID = '1';
            var path = '/isChildFI/' + engine.getRuleYear() + '/0/' + legalEntityID;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isChildFI(legalEntityID)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isTaxIDTheSameAsLastYear', function() {
        it('should return true when the API response result is true', function(done) {
            var legalEntityID = '0000000001';
            var taxID = '23-0916895';
            var year = engine.getRuleYear();
            var path = '/isTaxIDTheSameAsLastYear/' + year + '/0/' + legalEntityID + '/' + taxID;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isTaxIDTheSameAsLastYear(legalEntityID, taxID)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isValidNumLoans', function() {
        it('should return true when the API response result is true', function(done) {
            var hmdaFile = hmdaJson.hmdaFile;
            var legalEntityID = hmdaFile.transmittalSheet.legalEntityID;
            var numLoans = 3;
            var year = engine.getRuleYear();
            var path = '/isValidNumLoans/total/' + year + '/0/' + legalEntityID + '/' + numLoans;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumLoans(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isValidNumHomePurchaseLoans', function() {
        it('should return true when the number of purchase loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/home-purchase-loans.json')));
            var legalEntityID = '0123456789';
            hmdaJson.hmdaFile.transmittalSheet.legalEntityID = legalEntityID;
            var path = '/isValidNumLoans/homePurchase/' + engine.getRuleYear() + '/0/' + legalEntityID + '/10/9';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumHomePurchaseLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumFannieMaeLoans', function() {
        it('should return true when the number of fannie/freddie loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/fanniefreddie-loans.json')));
            var legalEntityID = '0000413208';
            hmdaJson.hmdaFile.transmittalSheet.legalEntityID = legalEntityID;
            var path = '/isValidNumLoans/fannieMae/' + engine.getRuleYear() + '/0/' + legalEntityID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumFannieMaeLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumGinnieMaeFHALoans', function() {
        it('should return true when the number of ginnie fha loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/ginnie-fha-loans.json')));
            var legalEntityID = '0000413208';
            hmdaJson.hmdaFile.transmittalSheet.legalEntityID = legalEntityID;
            var path = '/isValidNumLoans/ginnieMaeFHA/' + engine.getRuleYear() + '/0/' + legalEntityID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumGinnieMaeFHALoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumGinnieMaeVALoans', function() {
        it('should return true when the number of ginnie loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/ginnie-va-loans.json')));
            var legalEntityID = '0000413208';
            hmdaJson.hmdaFile.transmittalSheet.legalEntityID = legalEntityID;
            var path = '/isValidNumLoans/ginnieMaeVA/' + engine.getRuleYear() + '/0/' + legalEntityID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumGinnieMaeVALoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumRefinanceLoans', function() {
        it('should return true when the number of purchase loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../../testdata/refinance-loans.json')));
            var legalEntityID = '0123456789';
            hmdaJson.hmdaFile.transmittalSheet.legalEntityID = legalEntityID;
            var path = '/isValidNumLoans/refinance/' + engine.getRuleYear() + '/0/' + legalEntityID + '/10/9';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumRefinanceLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

});
