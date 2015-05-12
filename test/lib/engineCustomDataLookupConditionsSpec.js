/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global mockAPI:false*/
/*global before:false*/
/*global port:false*/

'use strict';

var EngineCustomDataLookupConditions = require('../../lib/engineCustomDataLookupConditions'),
    EngineLocalDB = require('../../lib/engineLocalDB'),
    EngineApiInterface = require('../../lib/engineApiInterface'),
    RuleParseAndExec = require('../../lib/ruleParseAndExec'),
    Engine = function() {
        this.apiURL = 'http://localhost:' + port;
        this._USE_LOCAL_DB = false;
        this.currentYear = '2013';
    },
    engine,
    setupCensusAPI = function() {
        mockAPI('get', '/localdb/census/msaCodes/2013', 200,
            JSON.parse(JSON.stringify(require('../testdata/api_localdb_census_msaCodes.json'))));
        mockAPI('get', '/localdb/census/stateCounty/2013', 200,
            JSON.parse(JSON.stringify(require('../testdata/api_localdb_census_stateCounty.json'))));
        mockAPI('get', '/localdb/census/stateCountyMSA/2013', 200,
            JSON.parse(JSON.stringify(require('../testdata/api_localdb_census_stateCountyMSA.json'))));
        mockAPI('get', '/localdb/census/stateCountyTract/2013', 200,
            JSON.parse(JSON.stringify(require('../testdata/api_localdb_census_stateCountyTract.json'))));
        mockAPI('get', '/localdb/census/stateCountyTractMSA/2013', 200,
            JSON.parse(JSON.stringify(require('../testdata/api_localdb_census_stateCountyTractMSA.json'))));
    };

RuleParseAndExec.call(Engine.prototype);
EngineApiInterface.call(Engine.prototype);
EngineLocalDB.call(Engine.prototype);
EngineCustomDataLookupConditions.call(Engine.prototype);

describe('EngineCustomDataLookupConditions', function() {

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

    describe('isValidControlNumber', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/1/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidControlNumber({
                transmittalSheet: {
                    agencyCode: '1',
                    respondentID: '0000000001'
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
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/1/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: false}));

            engine.isValidControlNumber({
                transmittalSheet: {
                    agencyCode: '1',
                    respondentID: '0000000001'
                }
            })
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0]).to.have.property('lineNumber');
                expect(result[0].lineNumber).to.be('1');
                expect(result[0]).to.have.property('properties');
                expect(result[0].properties).to.have.property('agencyCode');
                expect(result[0].properties).to.have.property('respondentID');
                expect(result[0].properties.agencyCode).to.be('1');
                expect(result[0].properties.respondentID).to.be('0000000001');
                done();
            });
        });

        it('should return an error array when the API response is true but the control number is not consistent across the file', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            hmdaJson.hmdaFile.loanApplicationRegisters[0].respondentID = 'cat';

            engine.isValidControlNumber(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].loanNumber).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                expect(result[0].properties).to.have.property('agencyCode');
                expect(result[0].properties).to.have.property('respondentID');
                expect(result[0].properties.agencyCode).to.be('9');
                expect(result[0].properties.respondentID).to.be('cat');
                done();
            });
        });
    });

    describe('isValidMetroArea', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidMSA/' + engine.getRuleYear() + '/22220';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidMetroArea('22220')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when metroArea is NA', function(done) {
            expect(engine.isValidMetroArea('NA')).to.be(true);
            done();
        });

        it('should return true when we use local data and result is true', function(done) {
            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    engine.isValidMetroArea('49740')
                    .then(function(result) {
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it('should return false when we use local data and result is false', function(done) {
            engine.isValidMetroArea('22220')
            .then(function(result) {
                expect(result).to.be.false();
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });
    });

    describe('isValidMsaMdCountyCensusForNonDepository', function() {
        var hmdaJson = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        });

        it('should return true when the respondent is not CRA reporter', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: false}));

            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true if CRA reporter and all the relevant LARs MSAs are good', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
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
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be.true();
                engine.loadCensusData(engine.getRuleYear())
                .then(function() {
                    var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be.true();
                engine.loadCensusData(engine.getRuleYear())
                .then(function() {
                    var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
                    hmdaFile.loanApplicationRegisters[1].censusTract = '8000.01';
                    engine.isValidMsaMdCountyCensusForNonDepository(hmdaFile)
                    .then(function(result) {
                        expect(result.length).to.be(1);
                        expect(result[0].properties.metroArea).to.be('06920');
                        expect(result[0].properties.fipsState).to.be('06');
                        expect(result[0].properties.fipsCounty).to.be('034');
                        expect(result[0].properties.censusTract).to.be('8000.01');
                        expect(result[0].lineNumber).to.be('3');
                        expect(result[0].loanNumber).to.be('ABCDEFGHIJKLMNOPQRSTUVWXY');
                        engine.setUseLocalDB(false)
                        .then(function() {
                            done();
                        });
                    });
                });
            });
        });

        it('should return false when one of the LARs census tract is NA', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
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

    describe('isValidMsaMdStateAndCountyCombo', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidMSAStateCounty/' + engine.getRuleYear() + '/22220/05/143';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidMsaMdStateAndCountyCombo('22220', '05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when we use local data and result is true', function(done) {
            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    engine.isValidMsaMdStateAndCountyCombo('49780', '39', '119')
                    .then(function(result) {
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it('should return false when we use local data and result is false', function(done) {
            engine.isValidMsaMdStateAndCountyCombo('22220', '05', '143')
            .then(function(result) {
                expect(result).to.be.false();
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });

    });

    describe('isValidCensusTractCombo', function() {
        it('should return true when the API response result is true for MSA not = NA', function(done) {
            var path = '/isValidCensusTractCombo/' + engine.getRuleYear() + '/05/143/22220/9702.00';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidCensusTractCombo('9702.00', '22220', '05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when the API response result is true for MSA = NA', function(done) {
            var path = '/isValidCensusTractCombo/' + engine.getRuleYear() + '/05/143/NA/9702.00';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));

            engine.isValidCensusTractCombo('9702.00', 'NA', '05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when we use local data and result is true with MSA and Tract !== NA', function(done) {
            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    engine.isValidCensusTractCombo('9128.00', '49780', '39', '119')
                    .then(function(result) {
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it('should return true when we use local data and MSA = NA, but state/count/tract is valid', function(done) {
            engine.isValidCensusTractCombo('9128.00', 'NA', '39', '119')
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when we use local data and Tract = NA, but is small county', function(done) {
            engine.isValidCensusTractCombo('NA', '49540', '28', '163')
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when we use local data and all fields are NA', function(done) {
            expect(engine.isValidCensusTractCombo('NA', 'NA', 'NA', 'NA')).to.be.true();
            done();
        });

        it('should return false when we use local data and Tract = NA, but is not small county', function(done) {
            engine.isValidCensusTractCombo('NA', '49780', '39', '119')
            .then(function(result) {
                expect(result).to.be.false();
                done();
            });
        });

        it('should return false when we use local data and result is false', function(done) {
            engine.isValidCensusTractCombo('9702.00', '22220', '05', '143')
            .then(function(result) {
                expect(result).to.be.false();
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });
    });

    describe('isValidStateAndCounty', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidStateCounty/' + engine.getRuleYear() + '/05/143';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidStateAndCounty('05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true when we use local data and result is true', function(done) {
            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    engine.isValidStateAndCounty('04', '027')
                    .then(function(result) {
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it('should return false when we use local data and result is false', function(done) {
            engine.isValidStateAndCounty('05', '143')
            .then(function(result) {
                expect(result).to.be.false();
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });

        it('should return false when either state or county are NA', function(done) {
            engine.isValidStateAndCounty('NA', '143')
            .then(function(result) {
                expect(result).to.be.false();
                done();
            });
        });
    });

    describe('isRespondentMBS', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isRespondentMBS/' + engine.getRuleYear() + '/9/0000000001';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isRespondentMBS('0000000001', '9')
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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

            engine.isValidStateCountyCensusTractCombo(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return false when using local data and msaCode != the code returned', function(done) {
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: false}));
            path = '/getMetroAreasOnRespondentPanel/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({'msa':['06920']}), true);
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
            var respondentID = '0123456789';
            var agencyCode = '9';
            var metroArea = '06920';

            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return true when the action taken is not valid', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }), true);
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }));
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;

            engine.isMetroAreaOnRespondentPanel(hmdaFile)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return error data when the respondent doesnt have a branch in the msa', function(done) {
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));
            path = '/getMsaName/' + engine.getRuleYear() + '/35100';
            mockAPI('get', path, 200, JSON.stringify({ msaName: 'New Bern, NC' }));
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
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
            var respondentId = '0000001195';
            var timestamp = '201501010000';
            var path =  '/isValidTimestamp/' + engine.getRuleYear() + '/9/' + respondentId + '/' + timestamp;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isTimestampLaterThanDatabase(respondentId, '9', timestamp)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isChildFI', function() {
        it('should return true when the API response result is true', function(done) {
            var respondentID = '1';
            var path = '/isChildFI/' + engine.getRuleYear() + '/9/' + respondentID;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isChildFI(respondentID, '9')
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isTaxIDTheSameAsLastYear', function() {
        it('should return true when the API response result is true', function(done) {
            var respondentID = '0000000001';
            var taxID = '23-0916895';
            var year = engine.getRuleYear();
            var path = '/isTaxIDTheSameAsLastYear/' + year + '/9/' + respondentID + '/' + taxID;
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isTaxIDTheSameAsLastYear(respondentID, '9', taxID)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isValidNumLoans', function() {
        it('should return true when the API response result is true', function(done) {
            var hmdaFile = JSON.parse(JSON.stringify(require('../testdata/complete.json'))).hmdaFile;
            var respondentID = hmdaFile.transmittalSheet.respondentID;
            var numLoans = 3;
            var year = engine.getRuleYear();
            var path = '/isValidNumLoans/total/' + year + '/9/' + respondentID + '/' + numLoans;
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
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/home-purchase-loans.json')));
            var respondentID = '0123456789';
            var path = '/isValidNumLoans/homePurchase/' + engine.getRuleYear() + '/9/' + respondentID + '/10/9';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumHomePurchaseLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidFannieFreddieLoans', function() {
        it('should return true when the number of fannie/freddie loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/fanniefreddie-loans.json')));
            var respondentID = '0000413208';
            var path = '/isValidNumLoans/fannieMae/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
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
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/ginnie-fha-loans.json')));
            var respondentID = '0000413208';
            var path = '/isValidNumLoans/ginnieMaeFHA/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
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
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/ginnie-va-loans.json')));
            var respondentID = '0000413208';
            var path = '/isValidNumLoans/ginnieMaeVA/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
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
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/refinance-loans.json')));
            var respondentID = '0123456789';
            var path = '/isValidNumLoans/refinance/' + engine.getRuleYear() + '/9/' + respondentID + '/10/9';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            engine.isValidNumRefinanceLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('getMSAName', function() {
        it('should return an msa name when given an msa code', function(done) {
            var msaCode = '35100';
            var path = '/getMSAName/' + engine.getRuleYear() + '/' + msaCode;
            mockAPI('get', path, 200, JSON.stringify({msaName: 'New Bern, NC'}));

            engine.getMSAName(msaCode)
            .then(function(msaName) {
                expect(msaName).to.be('New Bern, NC');
                done();
            });
        });
    });

});
