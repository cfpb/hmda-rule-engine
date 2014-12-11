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

    describe('in', function() {
        it('should return true if property is in values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            expect(engine.in(1, valueNums)).to.be(true);
            expect(engine.in('1', valueStrs)).to.be(true);
            done();
        });

        it('should return false if property not in values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            expect(engine.in(1, valueStrs)).to.be(false);
            expect(engine.in('1', valueNums)).to.be(false);
            expect(engine.in(4, valueNums)).to.be(false);
            expect(engine.in('', valueStrs)).to.be(false);
            done();
        });
    });

    describe('not_in', function() {
        it('should return false if property is in values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            expect(engine.not_in(1, valueNums)).to.be(false);
            expect(engine.not_in('1', valueStrs)).to.be(false);
            done();
        });

        it('should return true if property not in values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            expect(engine.not_in(1, valueStrs)).to.be(true);
            expect(engine.not_in('1', valueNums)).to.be(true);
            expect(engine.not_in(4, valueNums)).to.be(true);
            expect(engine.not_in('', valueStrs)).to.be(true);
            done();
        });
    });

    describe('contains', function() {
        it('should return true if value is in property', function(done) {
            var propNums = [1, 2, 3];
            var propStrs = ['1', '2', '3'];
            expect(engine.contains(propNums, 1)).to.be(true);
            expect(engine.contains(propStrs, '1')).to.be(true);
            expect(engine.contains('foobar', 'oba')).to.be(true);
            done();
        });

        it('should return false if value not in property', function(done) {
            var propNums = [1, 2, 3];
            var propStrs = ['1', '2', '3'];
            expect(engine.contains(propStrs, 1)).to.be(false);
            expect(engine.contains(propNums, '1')).to.be(false);
            expect(engine.contains(propNums, 4)).to.be(false);
            expect(engine.contains(propStrs, '')).to.be(false);
            expect(engine.contains('foobar', 'baz')).to.be(false);
            done();
        });
    });

    describe('does_not_contain', function() {
        it('should return false if value is in property', function(done) {
            var propNums = [1, 2, 3];
            var propStrs = ['1', '2', '3'];
            expect(engine.does_not_contain(propNums, 1)).to.be(false);
            expect(engine.does_not_contain(propStrs, '1')).to.be(false);
            done();
        });

        it('should return false if value not in property', function(done) {
            var propNums = [1, 2, 3];
            var propStrs = ['1', '2', '3'];
            expect(engine.does_not_contain(propStrs, 1)).to.be(true);
            expect(engine.does_not_contain(propNums, '1')).to.be(true);
            expect(engine.does_not_contain(propNums, 4)).to.be(true);
            expect(engine.does_not_contain(propStrs, '')).to.be(true);
            done();
        });
    });

    describe('includes_all', function() {
        it('should return true if property includes all values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            var propNums = [3, 4, 2, 5, 1];
            var propStrs = ['3', '4', '2', '5', '1'];
            expect(engine.includes_all(propNums, valueNums)).to.be(true);
            expect(engine.includes_all(propStrs, valueStrs)).to.be(true);
            done();
        });

        it('should return false if property does not include all values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            var propNums = [3, 4, 2, 5, 1];
            var propStrs = ['3', '4', '2', '5', '1'];
            expect(engine.includes_all(propStrs, valueNums)).to.be(false);
            expect(engine.includes_all(propNums, valueStrs)).to.be(false);
            expect(engine.includes_all(propNums, [6])).to.be(false);
            expect(engine.includes_all(propStrs, [''])).to.be(false);
            done();
        });
    });


    describe('includes_none', function() {
        it('should return false if property includes any values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            var propNums = [3, 4, 2, 5, 1];
            var propStrs = ['3', '4', '2', '5', '1'];
            expect(engine.includes_none(propNums, valueNums)).to.be(false);
            expect(engine.includes_none(propStrs, valueStrs)).to.be(false);
            done();
        });

        it('should return true if property does not include any values', function(done) {
            var valueNums = [1, 2, 3];
            var valueStrs = ['1', '2', '3'];
            var propNums = [3, 4, 2, 5, 1];
            var propStrs = ['3', '4', '2', '5', '1'];
            expect(engine.includes_none(propStrs, valueNums)).to.be(true);
            expect(engine.includes_none(propNums, valueStrs)).to.be(true);
            expect(engine.includes_none(propNums, [6])).to.be(true);
            expect(engine.includes_none(propStrs, [''])).to.be(true);
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

    describe('less_than', function() {
        it('should return true if property is < value', function(done) {
            expect(engine.less_than('4', '5')).to.be(true);
            expect(engine.less_than('4.2', '5.5')).to.be(true);
            expect(engine.less_than('4', '5.5')).to.be(true);
            expect(engine.less_than('4', 5)).to.be(true);
            expect(engine.less_than(4, 5.2)).to.be(true);
            done();
        });

        it('should return false if property is >= value', function(done) {
            expect(engine.less_than('6', '5')).to.be(false);
            expect(engine.less_than('6.4', '5')).to.be(false);
            expect(engine.less_than('6', 5.2)).to.be(false);
            expect(engine.less_than(5.2, 5.2)).to.be(false);
            done();
        });

        it('should return false if property or value is NaN', function(done) {
            expect(engine.less_than('cat', '6')).to.be(false);
            expect(engine.less_than('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('less_than_property', function() {
        it('should return true if first is < second', function(done) {
            expect(engine.less_than_property('4', '5')).to.be(true);
            expect(engine.less_than_property('4.2', '5.5')).to.be(true);
            expect(engine.less_than_property('4', '5.5')).to.be(true);
            expect(engine.less_than_property('4', 5)).to.be(true);
            expect(engine.less_than_property(4, 5.2)).to.be(true);
            done();
        });

        it('should return false if first is >= second', function(done) {
            expect(engine.less_than_property('6', '5')).to.be(false);
            expect(engine.less_than_property('6.4', '5')).to.be(false);
            expect(engine.less_than_property('6', 5.2)).to.be(false);
            expect(engine.less_than_property(5.2, 5.2)).to.be(false);
            done();
        });

        it('should return false if first or second is NaN', function(done) {
            expect(engine.less_than_property('cat', '6')).to.be(false);
            expect(engine.less_than_property('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('greater_than_or_equal', function() {
        it('should return true if property is >= value', function(done) {
            expect(engine.greater_than_or_equal('5', '4')).to.be(true);
            expect(engine.greater_than_or_equal('5.5', '4.2')).to.be(true);
            expect(engine.greater_than_or_equal('5.5', '4')).to.be(true);
            expect(engine.greater_than_or_equal('5', 4)).to.be(true);
            expect(engine.greater_than_or_equal(5, 4.2)).to.be(true);
            expect(engine.greater_than_or_equal(5.2, 5.2)).to.be(true);
            done();
        });

        it('should return false if property is < value', function(done) {
            expect(engine.greater_than_or_equal('5', '6')).to.be(false);
            expect(engine.greater_than_or_equal('5', '6.4')).to.be(false);
            expect(engine.greater_than_or_equal(5.2, '6')).to.be(false);
            done();
        });

        it('should return false if property or value are NaN', function(done) {
            expect(engine.greater_than_or_equal('cat', '6')).to.be(false);
            expect(engine.greater_than_or_equal('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('greater_than_or_equal_property', function() {
        it('should return true if first is >= second', function(done) {
            expect(engine.greater_than_or_equal_property('5', '4')).to.be(true);
            expect(engine.greater_than_or_equal_property('5.5', '4.2')).to.be(true);
            expect(engine.greater_than_or_equal_property('5.5', '4')).to.be(true);
            expect(engine.greater_than_or_equal_property('5', 4)).to.be(true);
            expect(engine.greater_than_or_equal_property(5, 4.2)).to.be(true);
            expect(engine.greater_than_or_equal_property(5.2, 5.2)).to.be(true);
            done();
        });

        it('should return false if first is < second', function(done) {
            expect(engine.greater_than_or_equal_property('5', '6')).to.be(false);
            expect(engine.greater_than_or_equal_property('5', '6.4')).to.be(false);
            expect(engine.greater_than_or_equal_property(5.2, '6')).to.be(false);
            done();
        });

        it('should return false if first or second are NaN', function(done) {
            expect(engine.greater_than_or_equal_property('cat', '6')).to.be(false);
            expect(engine.greater_than_or_equal_property('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('less_than_or_equal', function() {
        it('should return true if property is <= value', function(done) {
            expect(engine.less_than_or_equal('4', '5')).to.be(true);
            expect(engine.less_than_or_equal('4.2', '5.5')).to.be(true);
            expect(engine.less_than_or_equal('4', '5.5')).to.be(true);
            expect(engine.less_than_or_equal('4', 5)).to.be(true);
            expect(engine.less_than_or_equal(4, 5.2)).to.be(true);
            expect(engine.less_than_or_equal(5.2, 5.2)).to.be(true);
            done();
        });

        it('should return false if property is > value', function(done) {
            expect(engine.less_than_or_equal('6', '5')).to.be(false);
            expect(engine.less_than_or_equal('6.4', '5')).to.be(false);
            expect(engine.less_than_or_equal('6', 5.2)).to.be(false);
            done();
        });

        it('should return false if property or value is NaN', function(done) {
            expect(engine.less_than_or_equal('cat', '6')).to.be(false);
            expect(engine.less_than_or_equal('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('less_than_or_equal_property', function() {
        it('should return true if first is <= second', function(done) {
            expect(engine.less_than_or_equal_property('4', '5')).to.be(true);
            expect(engine.less_than_or_equal_property('4.2', '5.5')).to.be(true);
            expect(engine.less_than_or_equal_property('4', '5.5')).to.be(true);
            expect(engine.less_than_or_equal_property('4', 5)).to.be(true);
            expect(engine.less_than_or_equal_property(4, 5.2)).to.be(true);
            expect(engine.less_than_or_equal_property(5.2, 5.2)).to.be(true);
            done();
        });

        it('should return false if first is > second', function(done) {
            expect(engine.less_than_or_equal_property('6', '5')).to.be(false);
            expect(engine.less_than_or_equal_property('6.4', '5')).to.be(false);
            expect(engine.less_than_or_equal_property('6', 5.2)).to.be(false);
            done();
        });

        it('should return false if first or second is NaN', function(done) {
            expect(engine.less_than_or_equal_property('cat', '6')).to.be(false);
            expect(engine.less_than_or_equal_property('5', 'cat')).to.be(false);
            done();
        });
    });

    describe('between', function() {
        it('should return true if property is between start and end', function(done) {
            expect(engine.between('5', 4, '8')).to.be(true);
            expect(engine.between(5.7, '4', '7.94')).to.be(true);
            done();
        });

        it('should return false if property is not between start and end', function(done) {
            expect(engine.between('5', '3', '4')).to.be(false);
            expect(engine.between('5.5', '4.5', 5.49)).to.be(false);
            expect(engine.between(5, 5, 7)).to.be(false);
            expect(engine.between(7.5, '4.2', '7.5')).to.be(false);
            done();
        });

        it('should return false if property, start, or end are NaN', function(done) {
            expect(engine.between('cat', '5', 7)).to.be(false);
            expect(engine.between(5.4, 'cat', 9)).to.be(false);
            expect(engine.between(3, '4.5', 'cat')).to.be(false);
            done();
        });
    });

    describe('starts_with', function() {
        it('should return true if the property starts with value', function(done) {
            expect(engine.starts_with('foobar', 'foo')).to.be(true);
            done();
        });

        it('should return false if the property does not start with value', function(done) {
            expect(engine.starts_with('foobar', 'bar')).to.be(false);
            done();
        });
    });

    describe('ends_with', function() {
        it('should return true if the property ends with value', function(done) {
            expect(engine.ends_with('foobar', 'bar')).to.be(true);
            done();
        });

        it('should return false if the property does not end with value', function(done) {
            expect(engine.ends_with('foobar', 'foo')).to.be(false);
            done();
        });
    });

    describe('is_empty', function() {
        it('should return true if the property is empty', function(done) {
            expect(engine.is_empty('')).to.be(true);
            expect(engine.is_empty('   ')).to.be(true);
            done();
        });

        it('should return false if the property is not empty', function(done) {
            expect(engine.is_empty('foo')).to.be(false);
            expect(engine.is_empty(' o ')).to.be(false);
            done();
        });
    });

    describe('not_empty', function() {
        it('should return true if the property is not empty', function(done) {
            expect(engine.not_empty('foo')).to.be(true);
            expect(engine.not_empty(' o ')).to.be(true);
            done();
        });

        it('should return false if the property is empty', function(done) {
            expect(engine.not_empty('')).to.be(false);
            expect(engine.not_empty('   ')).to.be(false);
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
