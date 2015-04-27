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

var utils = require('../../lib/utils'),
    RuleParseAndExec = require('../../lib/ruleParseAndExec');

describe('lib/utils', function() {

    describe('resultBodyAsError', function() {
        it('if result is false, delete result from response, and return error json', function(done) {
            var body = JSON.stringify({
                result: false,
                foo: 'bar'
            });
            var expected = [
                {
                    properties: {
                        foo: 'bar'
                    }
                }
            ];
            expect(_.isEqual(utils.resultBodyAsError(body), expected));
            done();
        });
    });

    describe('resolveArg', function() {
        var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        var topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
        var contextList = [topLevelObj, hmdaJson.hmdaFile];

        it('should return a value for an existing property in topLevelObj', function(done) {
            expect(utils.resolveArg('parentState', contextList)).to.be('CA');
            done();
        });

        it('should return a value for an existing property in hmdaFile', function(done) {
            expect(utils.resolveArg('transmittalSheet.activityYear', contextList)).to.be('2013');
            done();
        });

        it('should throw an exception for a non-existent property', function(done) {
            expect(function() {
                utils.resolveArg('transmittalSheet.loanPurpose', contextList);
            }).to.throw('Failed to resolve argument!');
            done();
        });
    });

    describe('retrieveProps', function() {
        var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        var topLevelObj = hmdaJson.hmdaFile.transmittalSheet;

        it('should add properties to the error object', function(done) {
            var error = {'properties': {}};
            utils.retrieveProps(error, topLevelObj, ['institutionName', 'respondentZip', 'recordID']);
            var expectedError = {
                'properties': {
                    'institutionName': 'MIKES SMALL BANK   XXXXXXXXXXX',
                    'respondentZip': '99999-9999',
                    'recordID': '1'
                }
            };

            expect(_.isEqual(error, expectedError)).to.be(true);
            done();
        });

        it('should return an exception for a non-existent property', function(done) {
            var error = {'properties': {}};

            expect(function() {
                utils.retrieveProps(error, topLevelObj, ['loanNumber']);
            }).to.throw('Failed to resolve argument!');
            done();
        });

    });

    describe('getParsedRule', function() {
        it('should return the function text and parsed rule for a given single function rule', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'is_true'
            };
            var Engine = function() {};
            RuleParseAndExec.call(Engine.prototype);
            var engine = new Engine();
            var result = utils.getParsedRule.apply(engine, [rule]);
            var parsedRule = {
                argIndex: 1,
                args: ['foo'],
                funcs: ['this.is_true(arguments[0])'],
                spreads: ['promise0result'],
                body: 'promise0result',
                properties: {foo: true}
            };

            expect(result[0]).to.be('return Promise.resolve(this.is_true(arguments[0]));');
            expect(_.isEqual(result[1], parsedRule)).to.be.true();
            done();
        });
        it('should return the function text and parsed rule for a given combination function rule', function(done) {
            var rule = {
                'and': [
                    {
                        'property': 'foo',
                        'condition': 'is_true'
                    },
                    {
                        'property': 'bar',
                        'condition': 'is_false'
                    }
                ]
            };
            var Engine = function() {};
            RuleParseAndExec.call(Engine.prototype);
            var engine = new Engine();
            var result = utils.getParsedRule.apply(engine, [rule]);
            var parsedRule = {
                argIndex: 2,
                args: ['foo', 'bar'],
                funcs: ['this.is_true(arguments[0])', 'this.is_false(arguments[1])'],
                spreads: ['promise0result', 'promise1result'],
                body: '(promise0result && promise1result)',
                properties: {foo: true, bar: true}
            };

            expect(result[0]).to.be('return Promise.join(this.is_true(arguments[0]),this.is_false(arguments[1]), function(promise0result,promise1result) { return (promise0result && promise1result) });');
            expect(_.isEqual(result[1], parsedRule)).to.be.true();
            done();
        });
    });

    describe('handleArrayErrors', function() {
        it('should return a list of errors for a list of line numbers', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            var array_errors = require('../testdata/array-errors.json');

            expect(_.isEqual(utils.handleArrayErrors(hmdaJson.hmdaFile, [1, 3], ['recordID', 'filler']), array_errors)).to.be(true);
            done();
        });
    });

    describe('handleUniqueLoanNumberErrors', function() {
        it('should return a list of errors for a list of line counts', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            var counts = require('../testdata/counts.json');
            var errors = require('../testdata/loan-number-errors.json');

            expect(_.isEqual(utils.handleUniqueLoanNumberErrors(counts), errors)).to.be(true);
            done();
        });
    });

    describe('resolveError', function() {
        it('should reject on failed resolved argument', function(done) {
            var err = new Error();
            err.message = 'Failed to resolve argument!';
            err.property = 'foo';
            utils.resolveError(err)
            .catch(function(err) {
                expect(err.toString()).to.be('Error: Rule-spec error: Invalid property\nProperty: foo not found!');
                done();
            });
        });

        it('should reject with original error', function(done) {
            var err = new Error('FAIL');
            utils.resolveError(err)
            .catch(function(err) {
                expect(err.toString()).to.be('Error: FAIL');
                done();
            });
        });
    });

});
