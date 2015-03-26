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

var utils = require('../../lib/utils');

describe('lib/utils', function() {

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

});