/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global rewire:false*/
/*global _:false*/
/*global mockAPI:false*/
'use strict';

var engine = require('../engine'),
    rewiredEngine = require('./rewiredEngine'),
    http = require('http'),
    mockAPIURL,
    mockYEAR;

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
            http.get(mockAPIURL+'/foo', function(resp) {
                expect(resp.statusCode).to.be(200);
                http.get(mockAPIURL+'/foo', function(resp) {
                    expect(resp.statusCode).to.be(404);
                    done();
                });
            });
        });

        it('should allow route define and respond with 200 every time called when persist option enabled', function(done) {
            mockAPI('get', '/bar', 200, 'foo', true);
            http.get(mockAPIURL+'/bar', function(resp) {
                expect(resp.statusCode).to.be(200);
                http.get(mockAPIURL+'/bar', function(resp) {
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
            var text = fs.readFile('test/testdata/complete.dat', 'utf8', function (err, text) {
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
                'test@.test.com                                                    ', // @.
                'test.@test.com                                                    ', // .@
                'te st@test.com                                                    ', // Space in address
                'te@st@test.com                                                    ', // Double '@''
                'test@test..com                                                    '  // Double '.'
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
            expect(engine.zipcode('55cat     ')).to.be(false);      // No cats allowed
            expect(engine.zipcode('5555      ')).to.be(false);      // Too short
            expect(engine.zipcode('55555-55  ')).to.be(false);      // Too short
            expect(engine.zipcode('55555 5555')).to.be(false);      // Missing '-'
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
            expect(engine.yyyy_mm_dd_hh_mm_ss('20141315123215')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140015123215')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140231123215')).to.be(false);   // Invalid day (Feb 31)
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225241715')).to.be(false);   // Invalid hour
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225207815')).to.be(false);   // Invalid minutes
            expect(engine.yyyy_mm_dd_hh_mm_ss('20140225203278')).to.be(false);   // Invalid seconds
            done();
        });

        it('should return false if property is malformed', function(done) {
            expect(engine.yyyy_mm_dd_hh_mm_ss('20141005')).to.be(false);         // Too short
            expect(engine.yyyy_mm_dd_hh_mm_ss('2014010101010101')).to.be(false); // Too long
            expect(engine.yyyy_mm_dd_hh_mm_ss('2014cat0511542')).to.be(false);   // No cats allowed
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
            expect(engine.yyyy_mm_dd_hh_mm('201413151232')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm('201400151232')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd_hh_mm('201402311232')).to.be(false);   // Invalid day (Feb 31)
            expect(engine.yyyy_mm_dd_hh_mm('201402252417')).to.be(false);   // Invalid hour
            expect(engine.yyyy_mm_dd_hh_mm('201402252078')).to.be(false);   // Invalid minutes
            done();
        });

        it('should return false if property is malformed', function(done) {
            expect(engine.yyyy_mm_dd_hh_mm('20141005')).to.be(false);       // Too short
            expect(engine.yyyy_mm_dd_hh_mm('20140101010101')).to.be(false); // Too long
            expect(engine.yyyy_mm_dd_hh_mm('2014cat05115')).to.be(false);   // No cats allowed
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
            expect(engine.yyyy_mm_dd('20141315')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd('20140015')).to.be(false);   // Invalid month
            expect(engine.yyyy_mm_dd('20140231')).to.be(false);   // Invalid day (Feb 31)
            done();
        });

        it('should return false if property is malformed', function(done) {
            expect(engine.yyyy_mm_dd('201410')).to.be(false);       // Too short
            expect(engine.yyyy_mm_dd('20140101010101')).to.be(false); // Too long
            expect(engine.yyyy_mm_dd('2014cat0')).to.be(false);   // No cats allowed
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
            expect(engine.mm_dd_yyyy('15132014')).to.be(false);   // Invalid month
            expect(engine.mm_dd_yyyy('15002014')).to.be(false);   // Invalid month
            expect(engine.mm_dd_yyyy('32022014')).to.be(false);   // Invalid day (Feb 31)
            done();
        });

        it('should return false if property is malformed', function(done) {
            expect(engine.mm_dd_yyyy('102014')).to.be(false);       // Too short
            expect(engine.mm_dd_yyyy('01010101012014')).to.be(false); // Too long
            expect(engine.mm_dd_yyyy('0cat2014')).to.be(false);   // No cats allowed
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
            expect(engine.yyyy('cats')).to.be(false);           // No cats allowed
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
            expect(engine.hh_mm('2412')).to.be(false);          // Invalid hours
            expect(engine.hh_mm('0186')).to.be(false);          // Invalid minutes
            expect(engine.hh_mm('cats')).to.be(false);          // No cats allowed
            done();
        });
    });

    describe('hh_mm_ss', function() {
        it('should return true for a valid time', function(done) {
            expect(engine.hh_mm_ss('051255')).to.be(true);
            done();
        });

        it('should return false for a malformed time', function(done) {
            expect(engine.hh_mm_ss('241205')).to.be(false);     // Invalid hours
            expect(engine.hh_mm_ss('018651')).to.be(false);     // Invalid minutes
            expect(engine.hh_mm_ss('041794')).to.be(false);     // Invalid seconds
            expect(engine.hh_mm_ss('cats52')).to.be(false);     // No cats allowed
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

    describe('accumulatedIf', function() {
        var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
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
        it('should return false if any LARs have duplicate loanNumbers', function(done) {
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
            var result = engine.hasUniqueLoanNumbers(hmdaFile);
            expect(result.length).to.be(1);
            expect(result[0].loanNumber).to.be('1');
            expect(result[0].properties.lineNumbers.length).to.be(2);
            expect(result[0].properties.lineNumbers[0]).to.be('2');
            done();
        });

        it('should return true if no LARs have the same loanNumber', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: [
                    {
                        loanNumber: '1',
                        lineNumber: '2'
                    },
                    {
                        loanNumber: '2',
                        lineNumber: '3'
                    }
                ]
            };
            var result = engine.hasUniqueLoanNumbers(hmdaFile);
            expect(result).to.be(true);
            done();
        });
    });

    describe('isActionDateInActivityYear', function() {
        it('should return true for an actionDate with activityYear', function(done) {
            var actionDate = '20130723';
            var activityYear = '2013';

            expect(engine.isActionDateInActivityYear(actionDate, activityYear)).to.be(true);
            done();
        });

        it('should return false for an actionDate not in activityYear', function(done) {
            var actionDate = '20140723';
            var activityYear = '2013';

            expect(engine.isActionDateInActivityYear(actionDate, activityYear)).to.be(false);
            done();
        });

        it('should return true for an actionDate that is an invalid date but in the activity year', function(done) {
            var actionDate = '20142014';    // Invalid month
            var activityYear = '2014';

            expect(engine.isActionDateInActivityYear(actionDate, activityYear)).to.be(true);
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
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a valid lar count', function(done) {
            topLevelObj.totalLineEntries = '0000003';
            expect(engine.checkTotalLARCount(hmdaJson.hmdaFile)).to.be(true);
            done();
        });

        it('should return error array for an invalid lar count', function(done) {
            expect(engine.checkTotalLARCount(hmdaJson.hmdaFile) instanceof Array).to.be(true);
            done();
        });
    });

    describe('compareNumEntriesSingle', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
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
                expect(result instanceof Array).to.be(false);
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
                expect(result instanceof Array).to.be(true);
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

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a passing comparison', function(done) {
            var ruleA = {
                'property': 'filler',
                'condition': 'equal',
                'value': 'B'
            };
            var ruleB = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '2'
            };
            var cond = {
                'property': 'result',
                'condition': 'greater_than',
                'value': '.6'
            };

            engine.compareNumEntries(hmdaJson.hmdaFile.loanApplicationRegisters, ruleA, ruleB, cond)
            .then(function(result) {
                expect(result instanceof Array).to.be(false);
                done();
            });
        });

        it('should return false for a non-passing comparison', function(done) {
            var ruleA = {
                'property': 'filler',
                'condition': 'equal',
                'value': 'B'
            };
            var ruleB = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '2'
            };
            var cond = {
                'property': 'result',
                'condition': 'less_than',
                'value': '.6'
            };

            engine.compareNumEntries(hmdaJson.hmdaFile.loanApplicationRegisters, ruleA, ruleB, cond)
            .then(function(result) {
                expect(result instanceof Array).to.be.true();
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
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
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
            expect(engine.isValidNumMultifamilyLoans(hmdaJson.hmdaFile) instanceof Array).to.be(true);
            done();
        });
    });

    describe('isValidControlNumber', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/1/0000000001';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidControlNumber({
                transmittalSheet: {
                    agencyCode: '1',
                    respondentID: '0000000001'
            }})
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return error array when API response result is false', function(done) {
            var path = '/isValidControlNumber/' + engine.getRuleYear() + '/1/0000000001';
            mockAPI('get', path, 200, JSON.stringify({ result: false }));
            engine.isValidControlNumber({
                transmittalSheet: {
                    agencyCode: '1',
                    respondentID: '0000000001'
            }})
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

            var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
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
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
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
    });


    describe('isValidMsaMdCountyCensusForNonDepository', function() {
        var hmdaJson = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
        });

        it('should return true when the respondent is not CRA reporter', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({ result: false }));
            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return true if CRA reporter and all the relevant LARs MSAs are good', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            path = '/isValidCensusInMSA/'+engine.getRuleYear()+'/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({ result: true }), true);

            engine.isValidMsaMdCountyCensusForNonDepository(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });

        it('should return false when one of the LARs census tract is NA', function(done) {
            var path = '/isCraReporter/' + engine.getRuleYear() + '/0123456789';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            hmdaJson.hmdaFile.loanApplicationRegisters[0].censusTract = 'NA';
            path = '/isValidCensusInMSA/'+engine.getRuleYear()+'/06920/06/034/0100.01';
            mockAPI('get', path, 200, JSON.stringify({ result: true }), true);

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
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidMsaMdStateAndCountyCombo('22220', '05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidCensusTractCombo', function() {
        it('should return true when the API response result is true for MSA not = NA', function(done) {
            var path = '/isValidCensusTractCombo/' + engine.getRuleYear() + '/05/143/22220/9702.00';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
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
    });

    describe('isValidStateAndCounty', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isValidStateCounty/' + engine.getRuleYear() + '/05/143';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidStateAndCounty('05', '143')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isRespondentMBS', function() {
        it('should return true when the API response result is true', function(done) {
            var path = '/isRespondentMBS/' + engine.getRuleYear() + '/9/0000000001';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isRespondentMBS('0000000001', '9')
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidStateCountyCensusTractCombo', function() {
        it('should return true when API call to isValidCensusCombination result is true', function(done) {
            var metroArea = '35100';
            var state = '37';
            var county = '103';
            var tract = '5010.02';
            var path =  '/isValidCensusCombination/' + engine.getRuleYear() + '/' +
                        state + '/' + county + '/' + tract;
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidStateCountyCensusTractCombo(metroArea, state, county, tract)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });

        it('should return false when statecensustract combo is valid, but msa is NA', function(done) {
            var metroArea = 'NA';
            var state = '37';
            var county = '103';
            var tract = '5010.02';
            var path =  '/isValidCensusCombination/' + engine.getRuleYear() + '/' +
                        state + '/' + county + '/' + tract;
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidStateCountyCensusTractCombo(metroArea, state, county, tract)
            .then(function(result) {
                expect(result).to.be.false();
                done();
            });
        });
    });

    describe('isNotIndependentMortgageCoOrMBS', function() {
        it('should return true when the API response result is true', function(done) {
            var agencyCode = '1';
            var respondentID = '1';
            var path = '/isNotIndependentMortgageCoOrMBS/' + engine.getRuleYear() + '/' +
                agencyCode + '/' + respondentID;
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isNotIndependentMortgageCoOrMBS(respondentID, agencyCode)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isMetroAreaOnRespondentPanel', function() {
        it('should return true when the API response result is true', function(done) {
            var respondentID = '1';
            var agencyCode = '1';
            var metroArea = '1';
            var path = '/isMetroAreaOnRespondentPanel/' + engine.getRuleYear() + '/' +
                agencyCode + '/' + respondentID + '/' + metroArea;
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isMetroAreaOnRespondentPanel(metroArea, respondentID, agencyCode)
            .then(function(result) {
                expect(result).to.be.true();
                done();
            });
        });
    });

    describe('isTimestampLaterThanDatabase', function() {
        it('should return true when API call to isValidTimestamp API call result is true', function(done) {
            var respondentId = '0000001195';
            var timestamp = '201501010000';
            var path =  '/isValidTimestamp/' + engine.getRuleYear() + '/9/' + respondentId + '/' + timestamp;
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
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
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
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
            var hmdaFile = JSON.parse(JSON.stringify(require('./testdata/complete.json'))).hmdaFile;
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
            var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/home-purchase-loans.json')));

            var respondentID = '0123456789';
            var path = '/isValidNumLoans/homePurchase/' + engine.getRuleYear() + '/9/' + respondentID + '/10';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidNumHomePurchaseLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidFannieFreddieLoans', function() {
        it('should return true when the number of fannie/freddie loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/fanniefreddie-loans.json')));

            var respondentID = '0000413208';
            var path = '/isValidNumLoans/fannieMae/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidNumFannieMaeLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumGinnieMaeFHALoans', function() {
        it('should return true when the number of ginnie fha loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/ginnie-fha-loans.json')));

            var respondentID = '0000413208';
            var path = '/isValidNumLoans/ginnieMaeFHA/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidNumGinnieMaeFHALoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumGinnieMaeVALoans', function() {
        it('should return true when the number of ginnie loans is valid', function(done) {
            var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/ginnie-va-loans.json')));

            var respondentID = '0000413208';
            var path = '/isValidNumLoans/ginnieMaeVA/' + engine.getRuleYear() + '/9/' + respondentID + '/6/3';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidNumGinnieMaeVALoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('isValidNumRefinanceLoans', function() {
        it('should return true when the number of purchase loans is valid', function(done) {
           var hmdaJson = JSON.parse(JSON.stringify(require('./testdata/refinance-loans.json')));

            var respondentID = '0123456789';
            var path = '/isValidNumLoans/refinance/' + engine.getRuleYear() + '/9/' + respondentID + '/10';
            mockAPI('get', path, 200, JSON.stringify({ result: true }));
            engine.isValidNumRefinanceLoans(hmdaJson.hmdaFile)
            .then(function(result) {
                expect(result).to.be(true);
                done();
            });
        });
    });

    describe('parseRule', function() {
        var result;

        beforeEach(function() {
            result = {
                argIndex: 0,
                args: [],
                funcs: [],
                spreads: [],
                body: '',
                properties: {}
            };
        });

        it('should parse a rule with a simple property test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'is_true'
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value string test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal',
                'value': '1'
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal(arguments[0], "1")');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value number test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal',
                'value': 1
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal(arguments[0], 1)');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value array test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'in',
                'values': ['1', '2', '3']
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.in(arguments[0], ["1","2","3"])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-property test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal_property',
                'value': 'bar'
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal_property(arguments[0], arguments[1])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value-value test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'between',
                'start': '1',
                'end': '9'
            };
            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.between(arguments[0], "1", "9")');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with an if-then test into a function string', function(done) {
            var rule = {
                'if': {
                    'property': 'foo',
                    'condition': 'is_true'
                },
                'then': {
                    'property': 'bar',
                    'condition': 'is_false'
                }
            };
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' ? ' + result.spreads[1] + ' : true)');
            done();
        });

        it('should parse a rule with an and grouping into a function string', function(done) {
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
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' && ' + result.spreads[1] + ')');
            done();
        });

        it('should parse a rule with an or grouping into a function string', function(done) {
            var rule = {
                'or': [
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
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' || ' + result.spreads[1] + ')');
            done();
        });

        it('should parse a rule with a complex and/or grouping into a function string', function(done) {
            var rule = {
                'and': [
                    {
                        'or': [
                            {
                                'property': 'foo',
                                'condition': 'is_true'
                            },
                            {
                                'property': 'bar',
                                'condition': 'is_false'
                            }
                        ]
                    },
                    {
                        'or': [
                            {
                                'property': 'animal',
                                'condition': 'equal',
                                'value': 'cow'
                            },
                            {
                                'property': 'fruit',
                                'condition': 'equal',
                                'value': 'banana'
                            }
                        ]
                    }
                ]
            };
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(4);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.funcs[2]).to.be('this.equal(arguments[2], "cow")');
            expect(result.funcs[3]).to.be('this.equal(arguments[3], "banana")');
            expect(result.spreads.length).to.be(4);
            expect(result.body).to.be('((' + result.spreads[0] + ' || ' + result.spreads[1] + ') && (' + result.spreads[2] + ' || ' + result.spreads[3] + '))');
            done();
        });

        it('should parse a complex rule with an if-then and an and grouping into a string', function(done) {
            var rule = {
                'if': {
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
                },
                'then': {
                    'property': 'baz',
                    'condition': 'equal',
                    'value': '3'
                }
            };
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(3);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.funcs[2]).to.be('this.equal(arguments[2], "3")');
            expect(result.spreads.length).to.be(3);
            expect(result.body).to.be('((' + result.spreads[0] + ' && ' + result.spreads[1] + ') ? ' + result.spreads[2] + ' : true)');
            done();
        });

        it('should parse a rule with a custom function call into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'call',
                'function': 'isFooValid'
            };
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(1);
            expect(result.funcs[0]).to.be('this.isFooValid(arguments[0])');
            expect(result.spreads.length).to.be(1);
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a custom function call and list of args into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'call',
                'function': 'isFooValid',
                'args': ['foo', 'bar', 'baz']
            };
            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(1);
            expect(result.funcs[0]).to.be('this.isFooValid(arguments[0], arguments[1], arguments[2])');
            expect(result.spreads.length).to.be(1);
            expect(result.body).to.be(result.spreads[0]);
            done();
        });
    });

    describe('execRule', function() {
        var hmdaJson = {};
        var topLevelObj = {};
        var rule;

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should return true for a passing function rule', function(done) {
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'hasRecordIdentifiersForEachRow'
            };

            engine.execRule(hmdaJson, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return list of errors for a non-passing function rule', function(done) {
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'hasRecordIdentifiersForEachRow'
            };

            hmdaJson.hmdaFile.loanApplicationRegisters[0].recordID = '3';

            engine.execRule(hmdaJson, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].properties.recordID).to.be('3');
                done();
            });
        });

        it('should return true for a passing email_address format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.respondentEmail = 'krabapple@gmail.com';

            rule = {
                'property': 'respondentEmail',
                'condition': 'email_address'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing email_address format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.respondentEmail = 'krabapple.@gmail.com';

            rule = {
                'property': 'respondentEmail',
                'condition': 'email_address'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.respondentEmail).to.be('krabapple.@gmail.com');
                done();
            });
        });

        it('should return true for a passing zipcode format condition rule', function(done) {
            rule = {
                'property': 'parentZip',
                'condition': 'zipcode'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing zipcode format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.parentZip = '555-1234';

            rule = {
                'property': 'parentZip',
                'condition': 'zipcode'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.parentZip).to.be('555-1234');
                done();
            });
        });

        it('should return true for a passing yyyy_mm_dd_hh_mm_ss format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp += '37';

            rule = {
                'property': 'timestamp',
                'condition': 'yyyy_mm_dd_hh_mm_ss'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing yyyy_mm_dd_hh_mm_ss format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = hmdaJson.hmdaFile.transmittalSheet.timestamp  + '98';

            rule = {
                'property': 'timestamp',
                'condition': 'yyyy_mm_dd_hh_mm_ss'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('20130117133098');
                done();
            });

        });

        it('should return true for a passing matches_regex rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'matches_regex',
                'value': '[0-9]{12}'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing matches_regex rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'matches_regex',
                'value': '[0-9]{15}'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing is_integer rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_integer',
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_integer rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_integer'
            };

            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013.01171330';

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('2013.01171330');
                done();
            });
        });

        it('should return true for a passing is_float rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_float'
            };

            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013.01171330';
            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_float rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_float'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing equal rule', function(done) {
            topLevelObj = hmdaJson.hmdaFile.loanApplicationRegisters[0];

            rule = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '2'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing equal rule', function(done) {
            topLevelObj = hmdaJson.hmdaFile.loanApplicationRegisters[0];

            rule = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '1'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].properties.recordID).to.be('2');
                done();
            });
        });

        it('should return true for a passing equal_property rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'equal_property',
                'value': 'activityYear'
            };

            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013';
            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing equal_property rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'equal_property',
                'value': 'activityYear'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing between rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'between',
                'start': '2012',
                'end': '2014'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing between rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'between',
                'start': '2012',
                'end': '2013'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing is_empty rule', function(done) {
            rule = {
                'property': 'filler',
                'condition': 'is_empty'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_empty rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'is_empty'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing in rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'in',
                'values': ['2012', '2013']
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing in rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'in',
                'values': ['2012', '2014']
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'equal',
                    'value': '201301171330'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
            });

            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2014'
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'equal',
                    'value': '201301171330'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return true for a complex passing if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'if': {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    'then': {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm'
                    }
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing complex if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'if': {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    'then': {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm_ss'
                    }
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing and rule', function(done) {
            rule = {
                'and': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2013'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return true for a passing complex and rule', function(done) {
            rule = {
                'if': {
                    'and': [
                        {
                            'property': 'activityYear',
                            'condition': 'equal',
                            'value': '2013'
                        },
                        {
                            'property': 'timestamp',
                            'condition': 'equal',
                            'value': '201301171330'
                        }
                    ]
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'yyyy_mm_dd_hh_mm'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing and rule', function(done) {
            rule = {
                'and': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2013'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    {
                        'property': 'taxID',
                        'condition': 'is_empty'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                expect(result[0].properties.taxID).to.be('99-9999999');
                done();
            });
        });

        it('should return a list of errors for a non-passing and rule', function(done) {
            rule = {
                'if': {
                    'and': [
                        {
                            'property': 'activityYear',
                            'condition': 'equal',
                            'value': '2013'
                        },
                        {
                            'property': 'timestamp',
                            'condition': 'equal',
                            'value': '201301171330'
                        }
                    ]
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'yyyy_mm_dd_hh_mm_ss'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing or rule', function(done) {
            rule = {
                'or': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2015'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing or rule', function(done) {
            rule = {
                'or': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2015'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm_ss'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing S270 rule', function(done) {
            rule = {
                'property': 'actionDate',
                'condition': 'call',
                'function': 'isActionDateInActivityYear',
                'args': ['actionDate', 'hmdaFile.transmittalSheet.activityYear']
            };

            topLevelObj = hmdaJson.hmdaFile.loanApplicationRegisters[0];
            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });
    });

    describe('resolveArg', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
            engine.clearErrors();
        });

        it('should return a value for an existing property in topLevelObj', function(done) {
            var resolveArg = rewiredEngine.__get__('resolveArg');
            var contextList = [topLevelObj, hmdaJson.hmdaFile];
            expect(resolveArg('parentState', contextList)).to.be('CA');
            done();
        });

        it('should return a value for an existing property in hmdaFile', function(done) {
            var resolveArg = rewiredEngine.__get__('resolveArg');
            var contextList = [topLevelObj, hmdaJson.hmdaFile];
            expect(resolveArg('transmittalSheet.activityYear', contextList)).to.be('2013');
            done();
        });

        it('should throw an exception for a non-existent property', function(done) {
            var resolveArg = rewiredEngine.__get__('resolveArg');
            var contextList = [topLevelObj, hmdaJson.hmdaFile];

            expect(function() {
                resolveArg('transmittalSheet.loanPurpose', contextList);
            }).to.throw('Failed to resolve argument!');
            done();
        });
    });

    describe('retrieveProps', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
            engine.clearErrors();
        });

        it('should add properties to the error object', function(done) {
            var error = {'properties': {}};
            var retrieveProps = rewiredEngine.__get__('retrieveProps');
            retrieveProps(error, topLevelObj, ['institutionName', 'respondentZip', 'recordID']);

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
            var retrieveProps = rewiredEngine.__get__('retrieveProps');

            expect(function() {
                retrieveProps(error, topLevelObj, ['loanNumber']);
            }).to.throw('Failed to resolve argument!');
            done();
        });

    });

    describe('handleArrayErrors', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
            engine.clearErrors();
        });

        it('should return a list of errors for a list of line numbers', function(done) {
            var handleArrayErrors = rewiredEngine.__get__('handleArrayErrors');
            var array_errors = require('./testdata/array-errors.json');

            expect(_.isEqual(handleArrayErrors(hmdaJson.hmdaFile, [1, 3], ['recordID', 'filler']), array_errors)).to.be(true);
            done();
        });
    });

    describe('handleUniqueLoanNumberErrors', function() {
        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('./testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
            engine.clearErrors();
        });

        it('should return a list of errors for a list of line counts', function(done) {
            var handleUniqueLoanNumberErrors = rewiredEngine.__get__('handleUniqueLoanNumberErrors');
            var counts = require('./testdata/counts.json');
            var errors = require('./testdata/loan-number-errors.json');

            expect(_.isEqual(handleUniqueLoanNumberErrors(counts), errors)).to.be(true);
            done();
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
            var path = '/isValidTimestamp/'+engine.getRuleYear()+'/9/0123456789/201301171330';
            mockAPI('get', path, 200, JSON.stringify({ result: true }), true);

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
            var path = '/isValidTimestamp/'+engine.getRuleYear()+'/9/0123456789/cat';
            mockAPI('get', path, 200, JSON.stringify({ result: true }), true);

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
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

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

        // TODO: When macro API elements are connected, re-enable
        // it('should return an error when there is a connection problem', function(done) {
        //     engine.setAPIURL('/');
        //     engine.runMacro('2013')
        //     .catch(function(err) {
        //         expect(err).to.be('There was a problem connecting to the HMDA server. Please check your connection or try again later.');
        //         done();
        //     });
        // });
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
            mockAPI('get', path, 200, JSON.stringify({result: true}), true);

            rewiredEngine.runSpecial('2013')
            .then(function(result) {
                expect(_.isEqual(rewiredEngine.getErrors(), errors)).to.be.true();
                done();
            });
        });
    });
});
