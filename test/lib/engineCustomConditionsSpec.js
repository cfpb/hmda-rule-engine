/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global before:false*/

'use strict';

var EngineCustomConditions = require('../../lib/engineCustomConditions'),
    EngineBaseConditions = require('../../lib/engineBaseConditions'),
    RuleParseAndExec = require('../../lib/ruleParseAndExec'),
    Engine = function() {},
    engine;

RuleParseAndExec.call(Engine.prototype);
EngineBaseConditions.call(Engine.prototype);
EngineCustomConditions.call(Engine.prototype);

describe('EngineCustomConditions', function() {

    before(function(done) {
        Engine.prototype.setHmdaJson = function(json) {
            this._HMDA_JSON = json;
        };
        Engine.prototype.getDebug = function() { return 0; };
        Engine.prototype.postTaskCompletedMessage = function() { };
        engine = new Engine();
        done();
    });

    describe('accumulatedIf', function() {
        var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        var ifCond = {
            'property': 'hmdaFile',
            'condition': 'call',
            'function': 'compareNumEntriesSingle',
            'args': [
                'hmdaFile.loanApplicationRegisters',
                {
                    'label': 'Total multifamily applications',
                    'property': 'propertyType',
                    'condition': 'equal',
                    'value': '3'
                },
                {
                    'property': 'result',
                    'condition': 'less_than',
                    'value': '1'
                }
            ]
        };
        var thenCond = {
            'property': 'hmdaFile',
            'condition': 'call',
            'function': 'compareNumEntries',
            'args': [
                'hmdaFile.loanApplicationRegisters',
                {
                    'label': 'Total single family applications',
                    'property': 'propertyType',
                    'condition': 'equal',
                    'value': '1'
                },
                {
                    'label': 'Total loans',
                    'property': 'recordID',
                    'condition': 'equal',
                    'value': '2'
                },
                {
                    'property': 'result',
                    'condition': 'less_than',
                    'value': '.1',
                    'label': 'Single Family % of Total Loan Applications'
                }
            ]
        };

        it('should return an empty array when the if condition fails', function(done) {
            engine.accumulatedIf(hmdaJson.hmdaFile, ifCond, thenCond)
            .then(function(result) {
                expect(Array.isArray(result) && result.length === 0).to.be.true();
                done();
            });
        });

        it('should return an empty array when both conditions pass', function(done) {
            ifCond.args[2].condition = 'greater_than';

            engine.accumulatedIf(hmdaJson.hmdaFile, ifCond, thenCond)
            .then(function(result) {
                expect(Array.isArray(result) && result.length === 0).to.be.true();
                done();
            });
        });

        it('should return an array with an error object when the if condition passes but the then condition fails', function(done) {
            ifCond.args[2].condition = 'greater_than';
            thenCond.args[3].condition = 'greater_than';

            engine.accumulatedIf(hmdaJson.hmdaFile, ifCond, thenCond)
            .then(function(result) {
                expect(Array.isArray(result) && result.length === 1).to.be.true();
                expect(result[0].properties['Total multifamily applications']).to.be(3);
                expect(result[0].properties['Total single family applications']).to.be(0);
                expect(result[0].properties['Total loans']).to.be(3);
                expect(result[0].properties['Single Family % of Total Loan Applications']).to.be('0.00');
                done();
            });
        });
    });

    describe('hasRecordIdentifiersForEachRow', function() {
        it('should return true when the HMDA file has correct record identifiers for each row', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '1',
                    lineNumber: '1'
                },
                loanApplicationRegisters: [
                    {
                        recordID: '2',
                        lineNumber: '2'
                    }
                ]
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);

            expect(result).to.be(true);
            done();
        });

        it('should return a list of errors when the transmittal sheet does not have a recordID of 1', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '2',
                    lineNumber: '1'
                }
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].properties.recordID).to.be('2');
            expect(result[0].lineNumber).to.be('1');
            done();
        });

        it('should return a list of errors when a loan application register does not have a recordID of 2', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '1',
                    lineNumber: '1'
                },
                loanApplicationRegisters: [
                    {
                        recordID: '2',
                        lineNumber: '2'
                    },
                    {
                        recordID: '1',
                        lineNumber: '3'
                    },
                    {
                        recordID: '2',
                        lineNumber: '4'
                    }
                ]
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].properties.recordID).to.be('1');
            expect(result[0].lineNumber).to.be('3');
            done();
        });
    });

    describe('isActionDateInActivityYear', function() {
        it('should return true for an actionDate with activityYear', function(done) {
            var hmdaFile = {
                'transmittalSheet': {
                    'activityYear': '2013'
                },
                'loanApplicationRegisters': [
                    {
                        'actionDate': '20130723'
                    }
                ]
            };

            expect(engine.isActionDateInActivityYear(hmdaFile)).to.be.true();
            done();
        });

        it('should return false for an actionDate not in activityYear', function(done) {
            var hmdaFile = {
                'transmittalSheet': {
                    'activityYear': '2013'
                },
                'loanApplicationRegisters': [
                    {
                        'actionDate': '20140723'
                    }
                ]
            };

            var result = engine.isActionDateInActivityYear(hmdaFile);
            expect(result.length).to.be(1);
            done();
        });

        it('should return true for an actionDate that is an invalid month but in the activity year', function(done) {
            var hmdaFile = {
                'transmittalSheet': {
                    'activityYear': '2014'
                },
                'loanApplicationRegisters': [
                    {
                        'actionDate': '20142014'
                    }
                ]
            };

            expect(engine.isActionDateInActivityYear(hmdaFile)).to.be.true();
            done();
        });
    });

    describe('hasAtLeastOneLAR', function() {
        it('should return true when there is at least one loan application register', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: [
                    {
                        recordID: '2'
                    }
                ]
            };
            var result = engine.hasAtLeastOneLAR(hmdaFile);

            expect(result).to.be(true);
            done();
        });

        it('should return a single record error array when there is not at least one loan application register', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: []
            };
            var result = engine.hasAtLeastOneLAR(hmdaFile);

            expect(result[0].properties['Total Loan/Application records in file']).to.be(0);
            done();
        });
    });

    describe('isValidAgencyCode', function() {
        it('should return a list of errors if the transmittal sheet has an invalid agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: '11',
                    lineNumber: '1'
                }
            };
            var result = engine.isValidAgencyCode(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].lineNumber).to.be('1');
            expect(result[0].properties.agencyCode).to.be('11');
            done();
        });

        it('should return a list of errors if a LAR has an invalid agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: '1',
                    lineNumber: '1'
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: '11',
                        lineNumber: '2'
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].lineNumber).to.be('2');
            expect(result[0].properties.agencyCode).to.be('11');
            done();
        });

        it('should return a list of errors if a LAR has an agency code that does not match the transmittal sheet agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: '1',
                    lineNumber: '1'
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: '3',
                        lineNumber: '2'
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].lineNumber).to.be('2');
            expect(result[0].properties.agencyCode).to.be('3');
            done();
        });

        it('should return true if all LARs have the same agency code as the transmittal sheet', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: '1',
                    lineNumber: '1'
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: '1',
                        lineNumber: '2'
                    },
                    {
                        agencyCode: '1',
                        lineNumber: '3'
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);

            expect(result).to.be(true);
            done();
        });
    });

    describe('hasUniqueLoanNumbers', function() {
        var hmdaFile = {
            loanApplicationRegisters: [
                {
                    loanNumber: '1',
                    lineNumber: '2'
                },
                {
                    loanNumber: '1',
                    lineNumber: '3'
                }
            ]
        };

        it('should return array with errors if any LARs have duplicate loanNumbers', function(done) {
            var result = engine.hasUniqueLoanNumbers(hmdaFile);

            expect(result.length).to.be(1);
            expect(result[0].properties.loanNumber).to.be('1');
            expect(result[0].lineNumber).to.be('2, 3');
            done();
        });

        it('should return empty array if no LARs have the same loanNumber', function(done) {
            hmdaFile.loanApplicationRegisters[1].loanNumber = '2';
            var result = engine.hasUniqueLoanNumbers(hmdaFile);

            expect(result.length).to.be(0);
            done();
        });
    });

    describe('isLoanAmountFiveTimesIncome', function() {
        it('should return true for loanAmount > 5x income', function(done) {
            var loanAmount = '1000',
                applicantIncome = '20';

            expect(engine.isLoanAmountFiveTimesIncome(loanAmount, applicantIncome)).to.be(true);
            done();
        });

        it('should return false for loanAmount <= 5x income', function(done) {
            var loanAmount = '1000',
                applicantIncome = '300';

            expect(engine.isLoanAmountFiveTimesIncome(loanAmount, applicantIncome)).to.be(false);

            applicantIncome = '200';
            expect(engine.isLoanAmountFiveTimesIncome(loanAmount, applicantIncome)).to.be(false);
            done();
        });
    });

    describe('isValidLoanAmount', function() {
        it('should return true for a valid loanAmount', function(done) {
            var loanAmount = '1000',
                applicantIncome = '500';

            expect(engine.isValidLoanAmount(loanAmount, applicantIncome)).to.be(true);
            done();
        });

        it('should return true when applicantIncome is NA', function(done) {
            var loanAmount = '1000',
                applicantIncome = 'NA';

            expect(engine.isValidLoanAmount(loanAmount, applicantIncome)).to.be(true);
            done();
        });

        it('should return true when loanAmount is < 1000', function(done) {
            var loanAmount = '800',
                applicantIncome = '500';

            expect(engine.isValidLoanAmount(loanAmount, applicantIncome)).to.be(true);
            done();
        });

        it('should return false when loanAmount is not valid', function(done) {
            var loanAmount = '3000',
                applicantIncome = '400';

            expect(engine.isValidLoanAmount(loanAmount, applicantIncome)).to.be(false);
            done();
        });
    });

    describe('checkTotalLARCount', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a valid lar count', function(done) {
            topLevelObj.totalLineEntries = '0000003';

            expect(engine.checkTotalLARCount(hmdaJson.hmdaFile)).to.be(true);
            done();
        });

        it('should return error array for an invalid lar count', function(done) {
            expect(_.isArray(engine.checkTotalLARCount(hmdaJson.hmdaFile))).to.be(true);
            done();
        });
    });

    describe('compareNumEntriesSingle', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a passing comparison', function(done) {
            var rule = {
                'property': 'filler',
                'condition': 'equal',
                'value': 'B'
            };
            var cond = {
                'property': 'result',
                'condition': 'less_than',
                'value': '3'
            };

            engine.compareNumEntriesSingle(hmdaJson.hmdaFile.loanApplicationRegisters, rule, cond)
            .then(function(result) {
                expect(_.isArray(result)).to.be(false);
                done();
            });
        });

        it('should return error for a non-passing comparison', function(done) {
            var rule = {
                'label': 'Total Filler',
                'property': 'filler',
                'condition': 'equal',
                'value': 'B'
            };
            var cond = {
                'property': 'result',
                'condition': 'greater_than',
                'value': '2'
            };

            engine.compareNumEntriesSingle(hmdaJson.hmdaFile.loanApplicationRegisters, rule, cond)
            .then(function(result) {
                expect(_.isArray(result)).to.be(true);
                expect(result.length).to.be(1);
                expect(result[0]).to.have.property('properties');
                expect(result[0].properties).to.have.property('Total Filler');
                expect(result[0].properties['Total Filler']).to.be(2);
                done();
            });
        });
    });

    describe('compareNumEntries', function() {
        var hmdaJson = {};
        var topLevelObj = {};
        var ruleA, ruleB, cond;

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);

            ruleA = {
                'property': 'filler',
                'condition': 'equal',
                'value': 'B'
            };
            ruleB = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '2'
            };
            cond = {
                'property': 'result',
                'condition': 'greater_than',
                'value': '.6'
            };
        });

        it('should return true for a passing comparison', function(done) {
            engine.compareNumEntries(hmdaJson.hmdaFile.loanApplicationRegisters, ruleA, ruleB, cond)
            .then(function(result) {
                expect(_.isArray(result)).to.be(false);
                done();
            });
        });

        it('should return false for a non-passing comparison', function(done) {
            cond.condition = 'less_than';

            engine.compareNumEntries(hmdaJson.hmdaFile.loanApplicationRegisters, ruleA, ruleB, cond)
            .then(function(result) {
                expect(_.isArray(result)).to.be.true();
                expect(result.length).to.be(1);
                expect(result[0]).to.have.property('properties');
                done();
            });
        });
    });

    describe('isValidNumMultifamilyLoans', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a valid number of multifamily loans', function(done) {
            for (var i = 0; i < hmdaJson.hmdaFile.loanApplicationRegisters.length; i++) {
                hmdaJson.hmdaFile.loanApplicationRegisters[i].propertyType = '2';
            }

            expect(engine.isValidNumMultifamilyLoans(hmdaJson.hmdaFile)).to.be(true);
            done();
        });

        it('should return true when there are more than 10% multifamily loans but their value is < 10% of the total', function(done) {
            hmdaJson.hmdaFile.loanApplicationRegisters[1].propertyType = '2';
            hmdaJson.hmdaFile.loanApplicationRegisters[2].propertyType = '2';
            hmdaJson.hmdaFile.loanApplicationRegisters[0].loanAmount = '100';

            expect(engine.isValidNumMultifamilyLoans(hmdaJson.hmdaFile)).to.be(true);
            done();
        });

        it('should return false for an invalid number of multifamily loans', function(done) {
            expect(_.isArray(engine.isValidNumMultifamilyLoans(hmdaJson.hmdaFile))).to.be(true);
            done();
        });
    });
});
