/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global before:false*/

'use strict';

var EngineBaseConditions = require('../../lib/engineBaseConditions'),
    Engine = function() {},
    engine;

EngineBaseConditions.call(Engine.prototype);

describe('EngineBaseConditions', function() {

    before(function(done) {
        engine = new Engine();
        done();
    });

    describe('email_address', function() {
        it('should return true if property is a valid email address', function(done) {
            var test_addresses = [
                'test@test.com                                                     ',
                'test15.cat@test.testing                                           ',
                'test15.cat@test.cat.testing                                       '
            ];

            for (var i = 0; i < test_addresses.length; i++) {
                expect(engine.email_address(test_addresses[i])).to.be(true);
            }
            done();
        });

        it('should return false if property is a malformed email address', function(done) {
            var test_addresses = [
                'test@.test.com                                                    ',
                'test.@test.com                                                    ',
                'te st@test.com                                                    ',
                'te@st@test.com                                                    ',
                'test@test..com                                                    '
            ];

            for (var i = 0; i < test_addresses.length; i++) {
                expect(engine.email_address(test_addresses[i])).to.be(false);
            }
            done();
        });
    });

    describe('zipcode', function() {
        it('should return true if property is a valid zipcode', function(done) {
            expect(engine.zipcode('55555     ')).to.be(true);
            expect(engine.zipcode('55555')).to.be(true);
            expect(engine.zipcode('55555-5555')).to.be(true);
            done();
        });

        it('should return false if property is a malformed zipcode', function(done) {

            // No cats allowed
            expect(engine.zipcode('55cat     ')).to.be(false);

            // Too short
            expect(engine.zipcode('5555      ')).to.be(false);

            // Too short
            expect(engine.zipcode('55555-55  ')).to.be(false);

            // Missing '-'
            expect(engine.zipcode('55555 5555')).to.be(false);

            done();
        });
    });

    describe('yyyy_mm_dd_hh_mm_ss', function() {
        it('should return true if property is a valid date', function(done) {
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140305112715')).to.be(true);
            expect(engine.yyyy_mm_dd_hh_mm_ss('20131231235923')).to.be(true);
            expect(engine.yyyy_mm_dd_hh_mm_ss('20150101000000')).to.be(true);
            done();
        });

        it('should return false if property is not a valid date', function(done) {

            // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm_ss('20141315123215')).to.be(false);

            // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140015123215')).to.be(false);

            // Invalid day (Feb 31)
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140231123215')).to.be(false);

            // Invalid hour
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225241715')).to.be(false);

            // Invalid minutes
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225207815')).to.be(false);

            // Invalid seconds
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225203278')).to.be(false);

            done();
        });

        it('should return false if property is malformed', function(done) {

            // Too short
            expect(engine.yyyy_mm_dd_hh_mm_ss('20141005')).to.be(false);

            // Too long
            expect(engine.yyyy_mm_dd_hh_mm_ss('2014010101010101')).to.be(false);

            // No cats allowed
            expect(engine.yyyy_mm_dd_hh_mm_ss('2014cat0511542')).to.be(false);

            done();
        });
    });

    describe('yyyy_mm_dd_hh_mm', function() {
        it('should return true if property is a valid date', function(done) {
            expect(engine.yyyy_mm_dd_hh_mm('201403051127')).to.be(true);
            expect(engine.yyyy_mm_dd_hh_mm('201312312359')).to.be(true);
            expect(engine.yyyy_mm_dd_hh_mm('201501010000')).to.be(true);
            done();
        });

        it('should return false if property is not a valid date', function(done) {

            // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm('201413151232')).to.be(false);

            // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm('201400151232')).to.be(false);

            // Invalid day (Feb 31)
            expect(engine.yyyy_mm_dd_hh_mm('201402311232')).to.be(false);

            // Invalid hour
            expect(engine.yyyy_mm_dd_hh_mm('201402252417')).to.be(false);

            // Invalid minutes
            expect(engine.yyyy_mm_dd_hh_mm('201402252078')).to.be(false);

            done();
        });

        it('should return false if property is malformed', function(done) {

            // Too short
            expect(engine.yyyy_mm_dd_hh_mm('20141005')).to.be(false);

            // Too long
            expect(engine.yyyy_mm_dd_hh_mm('20140101010101')).to.be(false);

            // No cats allowed
            expect(engine.yyyy_mm_dd_hh_mm('2014cat05115')).to.be(false);

            done();
        });
    });

    describe('yyyy_mm_dd', function() {
        it('should return true if property is a valid date', function(done) {
            expect(engine.yyyy_mm_dd('20140305')).to.be(true);
            expect(engine.yyyy_mm_dd('20131231')).to.be(true);
            expect(engine.yyyy_mm_dd('20150101')).to.be(true);
            done();
        });

        it('should return false if property is not a valid date', function(done) {

            // Invalid month
            expect(engine.yyyy_mm_dd('20141315')).to.be(false);

            // Invalid month
            expect(engine.yyyy_mm_dd('20140015')).to.be(false);

            // Invalid day (Feb 31)
            expect(engine.yyyy_mm_dd('20140231')).to.be(false);

            done();
        });

        it('should return false if property is malformed', function(done) {

            // Too short
            expect(engine.yyyy_mm_dd('201410')).to.be(false);

            // Too long
            expect(engine.yyyy_mm_dd('20140101010101')).to.be(false);

            // No cats allowed
            expect(engine.yyyy_mm_dd('2014cat0')).to.be(false);

            done();
        });
    });

    describe('mm_dd_yyyy', function() {
        it('should return true if property is a valid date', function(done) {
            expect(engine.mm_dd_yyyy('03052014')).to.be(true);
            expect(engine.mm_dd_yyyy('12312013')).to.be(true);
            expect(engine.mm_dd_yyyy('01012015')).to.be(true);
            done();
        });

        it('should return false if property is not a valid date', function(done) {

            // Invalid month
            expect(engine.mm_dd_yyyy('15132014')).to.be(false);

            // Invalid month
            expect(engine.mm_dd_yyyy('15002014')).to.be(false);

            // Invalid day (Feb 31)
            expect(engine.mm_dd_yyyy('32022014')).to.be(false);

            done();
        });

        it('should return false if property is malformed', function(done) {

            // Too short
            expect(engine.mm_dd_yyyy('102014')).to.be(false);

            // Too long
            expect(engine.mm_dd_yyyy('01010101012014')).to.be(false);

            // No cats allowed
            expect(engine.mm_dd_yyyy('0cat2014')).to.be(false);

            done();
        });
    });

    describe('yyyy', function() {
        it('should return true if property is a valid year', function(done) {
            expect(engine.yyyy('2014')).to.be(true);
            expect(engine.yyyy('1997')).to.be(true);
            done();
        });

        it('should return false if property is not a valid year', function(done) {
            expect(engine.yyyy('    ')).to.be(false);

            // No cats allowed
            expect(engine.yyyy('cats')).to.be(false);

            expect(engine.yyyy('205')).to.be(false);
            done();
        });
    });

    describe('hh_mm', function() {
        it('should return true for a valid time', function(done) {
            expect(engine.hh_mm('0512')).to.be(true);
            done();
        });

        it('should return false for a malformed time', function(done) {

            // Invalid hours
            expect(engine.hh_mm('2412')).to.be(false);

            // Invalid minutes
            expect(engine.hh_mm('0186')).to.be(false);

            // No cats allowed
            expect(engine.hh_mm('cats')).to.be(false);

            done();
        });
    });

    describe('hh_mm_ss', function() {
        it('should return true for a valid time', function(done) {
            expect(engine.hh_mm_ss('051255')).to.be(true);
            done();
        });

        it('should return false for a malformed time', function(done) {

            // Invalid hours
            expect(engine.hh_mm_ss('241205')).to.be(false);

            // Invalid minutes
            expect(engine.hh_mm_ss('018651')).to.be(false);

            // Invalid seconds
            expect(engine.hh_mm_ss('041794')).to.be(false);

            // No cats allowed
            expect(engine.hh_mm_ss('cats52')).to.be(false);

            done();
        });
    });

    describe('matches_regex', function() {
        it('should return true if property matches regexStr', function(done) {
            expect(engine.matches_regex('cat', '^cat$')).to.be(true);
            done();
        });

        it('should return false if property does not match regexStr', function(done) {
            expect(engine.matches_regex('cat', '^dog$')).to.be(false);
            done();
        });

        it('should return false if regexStr is a malformed regex', function(done) {
            expect(engine.matches_regex('cat', '^[0-9+$')).to.be(false);
            done();
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
});
