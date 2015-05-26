/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global rewire:false*/
/*global _:false*/
/*global mockAPI:false*/
/*global before:false*/
/*global port:false*/
'use strict';

var engine = require('../engine'),
    rewiredEngine = require('./rewiredEngine'),
    levelup = require('level-browserify'),
    http = require('http'),
    stream = require('stream'),
    StringStreamPromise = require('../lib/stringStreamPromise'),
    fs = require('fs'),
    mockAPIURL,
    mockYEAR;

var setupCensusAPI = function() {
    mockAPI('get', '/localdb/census/msaCodes/2013', 200,
        JSON.parse(JSON.stringify(require('./testdata/api_localdb_census_msaCodes.json'))));
    mockAPI('get', '/localdb/census/stateCounty/2013', 200,
        JSON.parse(JSON.stringify(require('./testdata/api_localdb_census_stateCounty.json'))));
    mockAPI('get', '/localdb/census/stateCountyMSA/2013', 200,
        JSON.parse(JSON.stringify(require('./testdata/api_localdb_census_stateCountyMSA.json'))));
    mockAPI('get', '/localdb/census/stateCountyTract/2013', 200,
        JSON.parse(JSON.stringify(require('./testdata/api_localdb_census_stateCountyTract.json'))));
    mockAPI('get', '/localdb/census/stateCountyTractMSA/2013', 200,
        JSON.parse(JSON.stringify(require('./testdata/api_localdb_census_stateCountyTractMSA.json'))));
};

// Set up a simple mock writeable stream for the csv exporter tests
var createCsvTestStream = function(outputStream, expectedOutput, done) {
    var testPromise = StringStreamPromise(outputStream);

    testPromise
    .then(function(output) {
        expect(_.isEqual(expectedOutput, output)).to.be.true();
        done();
    });

    outputStream.end();
};

describe('Engine', function() {
    before(function(done) {
        mockAPIURL = 'http://localhost:' + port;
        mockYEAR = '2013';
        expect(port).to.not.be.undefined();
        expect(port).to.not.be(0);
        done();
    });

    beforeEach(function(done) {
        engine.setAPIURL(mockAPIURL);
        engine.setRuleYear(mockYEAR);
        rewiredEngine.setAPIURL(mockAPIURL);
        rewiredEngine.setRuleYear(mockYEAR);
        mockAPI('clean');
        done();
    });

    describe('Make sure mockAPI is up', function() {
        it('should allow route define and respond with 200 first time, 404 second time called', function(done) {
            mockAPI('get', '/foo', 200, 'bar');

            http.get(mockAPIURL + '/foo', function(resp) {
                expect(resp.statusCode).to.be(200);
                http.get(mockAPIURL + '/foo', function(resp) {
                    expect(resp.statusCode).to.be(404);
                    done();
                });
            });
        });

        it('should allow route define and respond with 200 every time called when persist option enabled', function(done) {
            mockAPI('get', '/bar', 200, 'foo', true);

            http.get(mockAPIURL + '/bar', function(resp) {
                expect(resp.statusCode).to.be(200);
                http.get(mockAPIURL + '/bar', function(resp) {
                    expect(resp.statusCode).to.be(200);
                    done();
                });
            });
        });
    });

    describe('get/set API URL', function() {
        it('should get/set API URL correctly', function(done) {
            expect(engine.getAPIURL()).to.be(mockAPIURL);
            engine.setAPIURL('foo');
            expect(engine.getAPIURL()).to.be('foo');
            done();
        });
    });

    describe('get/set rule year', function() {
        it('should get/set rule year correctly', function(done) {
            expect(engine.getRuleYear()).to.be(mockYEAR);
            engine.setRuleYear('2014');
            expect(engine.getRuleYear()).to.be('2014');
            done();
        });
    });

    describe('get/set/clear HMDA JSON', function() {
        it('should get/set/clear HMDA JSON correctly', function(done) {
            expect(_.isEqual(engine.getHmdaJson(), {}));
            engine.setHmdaJson({'foo':'bar'});
            expect(_.isEqual(engine.getHmdaJson(), {'foo':'bar'}));
            engine.clearHmdaJson();
            expect(_.isEqual(engine.getHmdaJson(), {}));
            done();
        });
    });

    describe('get/clear Progress', function() {
        it('should get/clear Progress correctly', function(done) {
            expect(_.isEqual(engine.getProgress().count, 0));
            engine.getProgress().count = 10;
            engine.clearProgress();
            expect(_.isEqual(engine.getProgress().count, 0));
            done();
        });
    });

    describe('get/set debug level', function() {
        it('should get/set debug level correctly', function(done) {
            expect(engine.getDebug()).to.be(0);
            engine.setDebug(3);
            expect(engine.getDebug()).to.be(3);
            engine.setDebug(0);
            done();
        });
    });

    describe('setUseLocalDB', function() {
        it('should create the db', function(done) {
            expect(engine.shouldUseLocalDB()).to.be(false);
            engine.setUseLocalDB(true)
            .then(function(db) {
                expect(engine.shouldUseLocalDB()).to.be(true);
                expect(db).to.not.be.null();
                engine.setUseLocalDB(false)
                .then(function() {
                    expect(engine.shouldUseLocalDB()).to.be(false);
                    done();
                });
            });
        });
    });

    describe('loadCensusData', function() {
        it('should populate the localdb with data', function(done) {
            engine.setUseLocalDB(true)
            .then(function(db) {
                setupCensusAPI();
                expect(db).to.not.be.undefined();
                expect(engine.shouldUseLocalDB()).to.be(true);
                engine.loadCensusData()
                .then(function() {
                    db.get('/census/msa_code/49740', function(err, value) {
                        var expected = {msa_name: 'Yuma, AZ'};
                        expect(_.isEqual(value, expected)).to.be.true();
                        engine.setUseLocalDB(false)
                        .then(function() {
                            expect(engine.shouldUseLocalDB()).to.be(false);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('getValidYears', function() {
        it('should return list', function(done) {
            var years = engine.getValidYears();
            expect(years).to.not.be.undefined();
            expect(years).to.not.be.empty();
            done();
        });
    });

    describe('getFileSpec', function() {
        it('should return the file spec for a year', function(done) {
            var spec = engine.getFileSpec('2013');
            expect(spec).to.not.be.undefined();
            expect(spec).to.not.be.empty();
            done();
        });
    });

    describe('getFileProgress', function() {
        it('should return a progress object', function(done) {
            var progress = engine.getFileProgress();
            expect(progress).to.have.property('count');
            expect(progress.count).to.be(0);
            expect(progress).to.have.property('estimate');
            expect(progress.estimate).to.be(0);
            done();
        });
    });

    describe('fileToJson', function() {
        it('should return json object when hmda file is valid and provided by stream', function(done) {
            var fs = require('fs');
            var stream = fs.createReadStream('test/testdata/complete.dat');

            engine.fileToJson(stream, 2013, function(err, result) {
                expect(err).to.be.null();
                expect(result).to.have.property('hmdaFile');
                expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                expect(result.hmdaFile.loanApplicationRegisters.length).to.be(3);
                done();
            });
        });

        it('should return json object when hmda file is valid and provided by text', function(done) {
            var fs = require('fs');
            var text = fs.readFile('test/testdata/complete.dat', 'utf8', function(err, text) {
                if (err) { throw err; }

                engine.fileToJson(text, 2013, function(err, result) {
                    expect(err).to.be.null();
                    expect(result).to.have.property('hmdaFile');
                    expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                    expect(result.hmdaFile.loanApplicationRegisters.length).to.be(3);
                    done();
                });
            });
        });
    });

    describe('runSyntactical', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            rewiredEngine.setHmdaJson(hmdaJson);
            rewiredEngine.clearErrors();
        });

        it('should return an unmodified set of errors for passing syntactical edits', function(done) {
            // S013
            var path = '/isValidTimestamp/' + engine.getRuleYear() + '/9/0123456789/201301171330';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            hmdaJson.hmdaFile.loanApplicationRegisters[1].loanNumber = '1000000000000000000000000';
            hmdaJson.hmdaFile.loanApplicationRegisters[2].loanNumber = '2000000000000000000000000';

            rewiredEngine.runSyntactical('2013')
            .then(function(result) {
                expect(Object.keys(rewiredEngine.getErrors().syntactical).length).to.be(0);
                done();
            });
        });

        it('should return a modified set of errors for failing syntactical edits', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = 'cat';
            hmdaJson.hmdaFile.transmittalSheet.activityYear = '2014';
            rewiredEngine.setHmdaJson(hmdaJson);

            // S013
            var path = '/isValidTimestamp/' + engine.getRuleYear() + '/9/0123456789/cat';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            var errors_syntactical = require('./testdata/errors-syntactical.json');

            rewiredEngine.runSyntactical('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors_syntactical)).to.be(true);
                done();
            });
        });

        it('should return an error when there is a connection problem', function(done) {
            engine.setAPIURL('/');

            engine.runSyntactical('2013')
            .catch(function(err) {
                expect(err.message).to.be('There was a problem connecting to the HMDA server. Please check your connection or try again later.');
                done();
            });
        });

        it('should be cancellable', function(done) {
            // S013
            var path = '/isValidTimestamp/' + engine.getRuleYear() + '/9/0123456789/201301171330';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            var prom = rewiredEngine.runSyntactical('2013')
            .then(function() {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });
    });

    describe('runValidity', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            rewiredEngine.setHmdaJson(hmdaJson);
            rewiredEngine.clearErrors();
        });

        it('should return a modified set of errors for failing validity edits', function(done) {
            var errors_validity = require('./testdata/errors-validity.json');
            hmdaJson.hmdaFile.loanApplicationRegisters[1].preapprovals = ' ';

            rewiredEngine.runValidity('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors_validity)).to.be(true);
                done();
            });
        });

        it('should return an error when there is a connection problem', function(done) {
            engine.setAPIURL('/');

            engine.runValidity('2013')
            .catch(function(err) {
                expect(err.message).to.be('There was a problem connecting to the HMDA server. Please check your connection or try again later.');
                done();
            });
        });

        it('should be cancellable', function(done) {
            var prom = rewiredEngine.runValidity('2013')
            .then(function(result) {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });

    });

    describe('runQuality', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            rewiredEngine.setHmdaJson(hmdaJson);
            rewiredEngine.clearErrors();
        });

        it('should return a modified set of errors for failing quality edits', function(done) {

            // Q029
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true, msa_code: '06920'}), true);

            path = '/isChildFI/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            // Q030
            path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            path = '/isValidCensusInMSA/' + engine.getRuleYear() + '/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            hmdaJson.hmdaFile.transmittalSheet.parentName = '                              ';
            var errors_quality = require('./testdata/errors-quality.json');

            rewiredEngine.runQuality('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors_quality)).to.be(true);
                done();
            });
        });

        it('should return an error when there is a connection problem', function(done) {
            engine.setAPIURL('/');

            engine.runQuality('2013')
            .catch(function(err) {
                expect(err.message).to.be('There was a problem connecting to the HMDA server. Please check your connection or try again later.');
                done();
            });
        });

        it('should be cancellable', function(done) {

            // Q029
            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true, msa_code: '06920'}), true);

            path = '/isChildFI/' + engine.getRuleYear() + '/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}));

            // Q030
            path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);
            path = '/isValidCensusInMSA/' + engine.getRuleYear() + '/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            var prom = rewiredEngine.runQuality('2013')
            .then(function(result) {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });

    });

    describe('runMacro', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            rewiredEngine.setHmdaJson(hmdaJson);
            rewiredEngine.clearErrors();
        });

        it('should return an unmodified set of errors for passing macro edits', function(done) {
            var errors = {
                'syntactical': {},
                'validity': {},
                'quality': {},
                'macro': {},
                'special': {}
            };

            rewiredEngine.runMacro('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors)).to.be(true);
                done();
            });
        });

        it('should return an error when there is a connection problem', function(done) {
            engine.setAPIURL('/');
            engine.runMacro('2013')
            .catch(function(err) {
                expect(err.message).to.be('There was a problem connecting to the HMDA server. Please check your connection or try again later.');
                done();
            });
        });

        it('should be cancellable', function(done) {
            var prom = rewiredEngine.runMacro('2013')
            .then(function(result) {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });
    });

    describe('runSpecial', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            rewiredEngine.setHmdaJson(hmdaJson);
            rewiredEngine.clearErrors();
        });

        it('should return an unmodified set of errors for passing special edits', function(done) {
            var errors = {
                'syntactical': {},
                'validity': {},
                'quality': {},
                'macro': {},
                'special': {}
            };

            var path = '/isValidCensusCombination/' + engine.getRuleYear() + '/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({result: true, msa_code: '06920'}), true);

            rewiredEngine.runSpecial('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors)).to.be.true();
                done();
            });
        });
    });

    describe('runLarType', function() {
        it('should return empty errors for a passing lar', function(done) {
            rewiredEngine.clearErrors();
            var lar = '284-15426429304320874623954000000000020130117111100256212013012019740080590098.40255    8    2500508   NA   21                                                                                                                                                                                                                                                                              ';
            var emptyErrors = {
                'syntactical': {},
                'validity': {},
                'quality': {},
                'macro': {},
                'special': {}
            };

            rewiredEngine.runLarType('2013', 'validity', lar)
            .then(function(errors) {
                expect(_.isEqual(emptyErrors, errors)).to.be.true();
                done();
            });
        });

        it('should return a set of errors for a non passing lar', function(done) {
            rewiredEngine.clearErrors();
            var lar = '201234567899ABCDEFGHIJKLMNOPQRSTUVWXY20130117432110000152013011906920060340100.01457432187654129000098701.0524B                                                                                                                                                                                                                                                                            x ';
            var expectedErrors = JSON.parse(JSON.stringify(require('./testdata/errors-validity-single')));

            rewiredEngine.runLarType('2013', 'validity', lar)
            .then(function(errors) {
                errors = JSON.parse(JSON.stringify(errors));
                expect(_.isEqual(expectedErrors, errors)).to.be.true();
                done();
            });
        });

        it('should return a rejected promise for an invalid edit type', function(done) {
            rewiredEngine.clearErrors();
            var lar = '201234567899ABCDEFGHIJKLMNOPQRSTUVWXY20130117432110000152013011906920060340100.01457432187654129000098701.0524B                                                                                                                                                                                                                                                                            x ';

            rewiredEngine.runLarType('2013', 'cat', lar)
            .catch(function(err) {
                expect(err.message).to.be('Invalid edit type: cat');
                done();
            });
        });
    });

    describe('runLar', function() {
        it('should return empty errors for a passing lar', function(done) {
            rewiredEngine.clearErrors();
            var lar = '284-15426429304320874623954000000000020130117111100256212013012019740080590098.40255    8    2500508   NA   21                                                                                                                                                                                                                                                                              ';
            var emptyErrors = {
                'syntactical': {},
                'validity': {},
                'quality': {},
                'macro': {},
                'special': {}
            };

            rewiredEngine.runLar('2013', lar)
            .then(function(errors) {
                expect(_.isEqual(emptyErrors, errors)).to.be.true();
                done();
            });
        });

        it('should return a set of errors for a non passing lar', function(done) {
            rewiredEngine.clearErrors();
            var lar = '201234567899ABCDEFGHIJKLMNOPQRSTUVWXY20130117432110000152013011906920060340100.01457432187654129000098701.0524B                                                                                                                                                                                                                                                                            x ';
            var expectedErrors = JSON.parse(JSON.stringify(require('./testdata/errors-single')));

            rewiredEngine.runLar('2013', lar)
            .then(function(errors) {
                errors = JSON.parse(JSON.stringify(errors));
                expect(_.isEqual(expectedErrors, errors)).to.be.true();
                done();
            });
        });
    });

    describe('getTotalsByMSA', function() {
        it('should group the LARs by metro area and calculate totals for non-depository, filtering out totals < 5', function(done) {
            var hmdaFile = JSON.parse(JSON.stringify(require('./testdata/loans-to-total.json'))).hmdaFile;
            var msaCode = '06920';
            var path = '/getMSAName/' + engine.getRuleYear() + '/' + msaCode;
            mockAPI('get', path, 200, JSON.stringify({msaName: ''}));
            path = '/getMetroAreasOnRespondentPanel/2013/7/0123456789';
            mockAPI('get', path, 200, JSON.stringify({msa: []}));

            engine.getTotalsByMSA(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].msaCode).to.be('06920');
                expect(result[0].totalLAR).to.be(9);
                expect(result[0].totalLoanAmount).to.be(90000);
                expect(result[0].totalHomePurchase).to.be(7);
                expect(result[0].totalHomeImprovement).to.be(0);
                expect(result[0].totalRefinance).to.be(2);
                done();
            });
        });

        it('should group the LARs by metro area and calculate totals for depository, filtering out msas not in branches', function(done) {
            var hmdaFile = JSON.parse(JSON.stringify(require('./testdata/loans-to-total.json'))).hmdaFile;
            hmdaFile.transmittalSheet.agencyCode = '9';
            var msaCode = '35100';
            var path = '/getMSAName/' + engine.getRuleYear() + '/' + msaCode;
            mockAPI('get', path, 200, JSON.stringify({msaName: ''}));
            path = '/getMetroAreasOnRespondentPanel/2013/9/0123456789';
            mockAPI('get', path, 200, JSON.stringify({msa: ['35100']}));

            engine.getTotalsByMSA(hmdaFile)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].msaCode).to.be('35100');
                expect(result[0].totalLAR).to.be(3);
                expect(result[0].totalLoanAmount).to.be(30000);
                expect(result[0].totalFHA).to.be(2);
                expect(result[0].totalVA).to.be(0);
                expect(result[0].totalFSA).to.be(1);
                done();
            });
        });

        it('should be cancellable', function(done) {
            var hmdaFile = JSON.parse(JSON.stringify(require('./testdata/loans-to-total.json'))).hmdaFile;
            var msaCode = '06920';
            var path = '/getMSAName/' + engine.getRuleYear() + '/' + msaCode;
            mockAPI('get', path, 200, JSON.stringify({msaName: ''}));
            path = '/getMetroAreasOnRespondentPanel/2013/7/0123456789';
            mockAPI('get', path, 200, JSON.stringify({msa: []}));

            var prom = engine.getTotalsByMSA(hmdaFile)
            .then(function() {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });

    });

    describe('exportIndividualStream', function() {
        it('should correctly export errors for an individual syntactical edit', function(done) {
            engine.errors = require('./testdata/errors-syntactical');
            var expectedOutput = fs.readFileSync('test/testdata/S270.csv').toString();
            var outputStream = engine.exportIndividualStream('syntactical', 'S270');
            createCsvTestStream(outputStream, expectedOutput, done);
        });

        it('should correctly export errors for S040', function(done) {
            engine.errors = require('./testdata/errors-syntactical');
            var expectedOutput = fs.readFileSync('test/testdata/S040.csv').toString();
            var outputStream = engine.exportIndividualStream('syntactical', 'S040');
            createCsvTestStream(outputStream, expectedOutput, done);
        });

        it('should correctly export errors for an individual macro edit', function(done) {
            engine.errors = require('./testdata/errors-macro');
            var expectedOutput = fs.readFileSync('test/testdata/Q015.csv').toString();
            var outputStream = engine.exportIndividualStream('macro', 'Q015');
            createCsvTestStream(outputStream, expectedOutput, done);
        });
    });

    describe('exportTypeStream', function() {
        it('should correctly export errors for all syntactical edits', function(done) {
            engine.errors = require('./testdata/errors-syntactical');
            var expectedOutput = fs.readFileSync('test/testdata/syntactical.csv').toString();
            var outputStream = engine.exportTypeStream('syntactical');
            createCsvTestStream(outputStream, expectedOutput, done);
        });
    });

    describe('exportIndividualPromise', function() {
        it('should correctly export errors for an individual syntactical edit', function(done) {
            engine.errors = require('./testdata/errors-syntactical');
            var expectedOutput = fs.readFileSync('test/testdata/S270.csv').toString();
            var testPromise = engine.exportIndividualPromise('syntactical', 'S270');

            testPromise.then(function(output) {
                expect(_.isEqual(expectedOutput, output)).to.be.true();
                done();
            });
        });
    });

    describe('exportTypePromise', function() {
        it('should correctly export errors for all syntactical edits', function(done) {
            engine.errors = require('./testdata/errors-syntactical');
            var expectedOutput = fs.readFileSync('test/testdata/syntactical.csv').toString();
            var testPromise = engine.exportTypePromise('syntactical');

            testPromise.then(function(output) {
                expect(_.isEqual(expectedOutput, output)).to.be.true();
                done();
            });
        });
    });

    describe('engineCustomYearConditions', function() {
        it('should correctly mix in conditions for a given year', function(done) {
            engine.setRuleYear('nprm');
            var hmdaFile = require('./testdata/nprm-loan-numbers');

            expect(engine.hasUniqueLoanNumbers(hmdaFile).length).to.be(0);
            hmdaFile.loanApplicationRegisters[1].universalLoanID = '1';
            expect(engine.hasUniqueLoanNumbers(hmdaFile).length).to.be(1);

            engine.setRuleYear(mockYEAR);
            hmdaFile.loanApplicationRegisters[0].loanNumber = '1';
            hmdaFile.loanApplicationRegisters[1].loanNumber = '2';

            expect(engine.hasUniqueLoanNumbers(hmdaFile).length).to.be(0);
            done();
        });
    });
});
