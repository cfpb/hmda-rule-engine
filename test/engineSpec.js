/*global describe:false*/
/*global it:false*/
/*global expect:false*/
'use strict';

var engine = require('../engine');
var FILE_SPEC = require('./testdata/2013_file_spec.json');


describe('Engine', function() {

    describe('fileToJson', function() {

        it('should return json object when hmda file is valid and provided by stream', function(done) {
            var fs = require('fs');
            var stream = fs.createReadStream('test/testdata/complete.dat');
            engine.fileToJson(stream, FILE_SPEC, function(err, result) {
                expect(err).to.be.null();
                expect(result).to.have.property('hmdaFile');
                expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                expect(result.hmdaFile.loanApplicationRegisters.length).to.be(3);
                done();
            });
        });

    });

    describe('is_true', function() {
        it('should return false if the argument is false', function(done) {
            expect(engine.is_true(0)).to.be(false);
            expect(engine.is_true(false)).to.be(false);
            expect(engine.is_true('')).to.be(false);
            done();
        });

        it('should return true if the argument is true', function(done) {
            expect(engine.is_true(1)).to.be(true);
            expect(engine.is_true(true)).to.be(true);
            expect(engine.is_true(' ')).to.be(true);
            done();
        });
    });

    describe('is_false', function() {
        it('should return true if the argument is false', function(done) {
            expect(engine.is_false(0)).to.be(true);
            expect(engine.is_false(false)).to.be(true);
            expect(engine.is_false('')).to.be(true);
            done();
        });

        it('should return false if the argument is true', function(done) {
            expect(engine.is_false(1)).to.be(false);
            expect(engine.is_false(true)).to.be(false);
            expect(engine.is_false(' ')).to.be(false);
            done();
        });
    });

    describe('is_integer', function() {
        it('should return true if the argument is an integer', function(done) {
            expect(engine.is_integer(5)).to.be(true);
            expect(engine.is_integer(5.0)).to.be(true);
            expect(engine.is_integer('5')).to.be(true);
            expect(engine.is_integer('5.0')).to.be(true);
            done();
        });

        it('should return false if the argument is not an integer', function(done) {
            expect(engine.is_integer(5.5)).to.be(false);
            expect(engine.is_integer('5.5')).to.be(false);
            done();
        });
    });

    describe('is_float', function() {
        it('should return true if the argument is a float', function(done) {
            expect(engine.is_float(5.5)).to.be(true);
            expect(engine.is_float('5.5')).to.be(true);
            done();
        });

        it('should return false if the argument is not a float', function(done) {
            expect(engine.is_float(5)).to.be(false);
            expect(engine.is_float(5.0)).to.be(false);
            expect(engine.is_float('5')).to.be(false);
            expect(engine.is_float('5.0')).to.be(false);
            done();
        });
    });

    describe('equal', function() {
        it('should return true if property and value are equal', function(done) {
            expect(engine.equal('5', '5')).to.be(true);
            expect(engine.equal(5, 5)).to.be(true);
            expect(engine.equal(5.5, 5.5)).to.be(true);
            done();
        });

        it('should return false if property and value are not equal', function(done) {
            expect(engine.equal('5', '6')).to.be(false);
            expect(engine.equal(5, 6)).to.be(false);
            expect(engine.equal(5.5, 6.5)).to.be(false);
            done();
        });

        it('should return false if property and value are equivalent but different types', function(done) {
            expect(engine.equal('5', 5)).to.be(false);
            done();
        });
    });

    describe('equal_property', function() {
        it('should return true if first and second are equal', function(done) {
            expect(engine.equal_property('5', '5')).to.be(true);
            expect(engine.equal_property(5, 5)).to.be(true);
            expect(engine.equal_property(5.5, 5.5)).to.be(true);
            done();
        });

        it('should return false if first and second are not equal', function(done) {
            expect(engine.equal_property('5', '6')).to.be(false);
            expect(engine.equal_property(5, 6)).to.be(false);
            expect(engine.equal_property(5.5, 6.5)).to.be(false);
            done();
        });

        it('should return false if first and second are equivalent but different types', function(done) {
            expect(engine.equal_property('5', 5)).to.be(false);
            done();
        });
    });

    describe('not_equal', function() {
        it('should return false if property and value are equal', function(done) {
            expect(engine.not_equal('5', '5')).to.be(false);
            expect(engine.not_equal(5, 5)).to.be(false);
            expect(engine.not_equal(5.5, 5.5)).to.be(false);
            done();
        });

        it('should return true if property and value are not equal', function(done) {
            expect(engine.not_equal('5', '6')).to.be(true);
            expect(engine.not_equal(5, 6)).to.be(true);
            expect(engine.not_equal(5.5, 6.5)).to.be(true);
            done();
        });

        it('should return true if property and value are equivalent but different types', function(done) {
            expect(engine.not_equal('5', 5)).to.be(true);
            done();
        });
    });     

    describe('not_equal_property', function() {
        it('should return false if first and second are equal', function(done) {
            expect(engine.not_equal_property('5', '5')).to.be(false);
            expect(engine.not_equal_property(5, 5)).to.be(false);
            expect(engine.not_equal_property(5.5, 5.5)).to.be(false);
            done();
        });

        it('should return true if first and second are not equal', function(done) {
            expect(engine.not_equal_property('5', '6')).to.be(true);
            expect(engine.not_equal_property(5, 6)).to.be(true);
            expect(engine.not_equal_property(5.5, 6.5)).to.be(true);
            done();
        });

        it('should return true if first and second are equivalent but different types', function(done) {
            expect(engine.not_equal_property('5', 5)).to.be(true);
            done();
        });
    });

    describe('greater_than', function() {
        it('should return true if property is > value', function(done) {
            expect(engine.greater_than('5', '4')).to.be(true);
            expect(engine.greater_than('5.5', '4.2')).to.be(true);
            expect(engine.greater_than('5.5', '4')).to.be(true);
            expect(engine.greater_than('5', 4)).to.be(true);
            expect(engine.greater_than(5, 4.2)).to.be(true);
            done();
        });

        it('should return false if property is <= value', function(done) {
            expect(engine.greater_than('5', '6')).to.be(false);
            expect(engine.greater_than('5', '6.4')).to.be(false);
            expect(engine.greater_than(5.2, '6')).to.be(false);
            expect(engine.greater_than(5.2, 5.2)).to.be(false);
            done();
        });

        it('should return false if property or value are NaN', function(done) {
            expect(engine.greater_than('cat', '6')).to.be(false);
            expect(engine.greater_than('5', 'cat')).to.be(false);
            done();
        });
    });

        describe('greater_than_property', function() {
        it('should return true if first is > second', function(done) {
            expect(engine.greater_than_property('5', '4')).to.be(true);
            expect(engine.greater_than_property('5.5', '4.2')).to.be(true);
            expect(engine.greater_than_property('5.5', '4')).to.be(true);
            expect(engine.greater_than_property('5', 4)).to.be(true);
            expect(engine.greater_than_property(5, 4.2)).to.be(true);
            done();
        });

        it('should return false if first is <= second', function(done) {
            expect(engine.greater_than_property('5', '6')).to.be(false);
            expect(engine.greater_than_property('5', '6.4')).to.be(false);
            expect(engine.greater_than_property(5.2, '6')).to.be(false);
            expect(engine.greater_than_property(5.2, 5.2)).to.be(false);
            done();
        });

        it('should return false if first or second are NaN', function(done) {
            expect(engine.greater_than_property('cat', '6')).to.be(false);
            expect(engine.greater_than_property('5', 'cat')).to.be(false);
            done();
        });
    });    

    describe('hasRecordIdentifiersForEachRow', function() {

        it('should return true when the HMDA file has correct record identifiers for each row', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '1'
                },
                loanApplicationRegisters: [
                    {
                        recordID: '2'
                    }
                ]
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);
            expect(result).to.be(true);
            done();
        });

        it('should return false when the transmittal sheet does not have a recordID of 1', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '2'
                }
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);
            expect(result).to.be(false);
            done();
        });

        it('should return false when a loan application register does not have a recordID of 2', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    recordID: '1'
                },
                loanApplicationRegisters: [
                    {
                        recordID: '2'
                    },
                    {
                        recordID: '1'
                    },
                    {
                        recordID: '2'
                    }
                ]
            };
            var result = engine.hasRecordIdentifiersForEachRow(hmdaFile);
            expect(result).to.be(false);
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

        it('should return false when there is not at least one loan application register', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: []
            };
            var result = engine.hasAtLeastOneLAR(hmdaFile);
            expect(result).to.be(false);
            done();
        });
    });

    describe('isValidAgencyCode', function() {

        it('should return false if the transmittal sheet has an invalid agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: 11
                }
            };
            var result = engine.isValidAgencyCode(hmdaFile);
            expect(result).to.be(false);
            done();
        });

        it('should return false if a LAR has an invalid agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: 1
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: 11
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);
            expect(result).to.be(false);
            done();
        });

        it('should return false if a LAR has an agency code that does not match the transmittal sheet agency code', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: 1
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: 3
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);
            expect(result).to.be(false);
            done();
        });

        it('should return true if all LARs have the same agency code as the transmittal sheet', function(done) {
            var hmdaFile = {
                transmittalSheet: {
                    agencyCode: 1
                },
                loanApplicationRegisters: [
                    {
                        agencyCode: 1
                    },
                    {
                        agencyCode: 1
                    }
                ]
            };
            var result = engine.isValidAgencyCode(hmdaFile);
            expect(result).to.be(true);
            done();
        });
    });

    describe('hasUniqueLoanNumbers', function() {

        it('should return false if any LARS have duplicate loanNumbers', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: [
                    {
                        loanNumber: 1
                    },
                    {
                        loanNumber: 1
                    }
                ]
            };
            var result = engine.hasUniqueLoanNumbers(hmdaFile);
            expect(result).to.be(false);
            done();
        });

        it('should return false if any LARS have duplicate loanNumbers', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: [
                    {
                        loanNumber: 1
                    },
                    {
                        loanNumber: 2
                    }
                ]
            };
            var result = engine.hasUniqueLoanNumbers(hmdaFile);
            expect(result).to.be(true);
            done();
        });
    });

});
