'use strict';

var HMDAJson = require('../../lib/hmdajson');
var FILE_SPEC = require('../testdata/2013_file_spec.json');

describe('lib/hmdajson', function() {

    describe('getJsonObject', function() {
        it('should return an object with expected properties', function(done) {
            HMDAJson.resetJsonOb();
            var result = HMDAJson.getJsonObject();
            expect(result).to.have.property('hmdaFile');
            expect(result.hmdaFile).to.have.property('transmittalSheet');
            expect(typeof result.hmdaFile.transmittalSheet).to.be('object');
            expect(Object.keys(result.hmdaFile.transmittalSheet).length).to.be(0);
            expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
            expect(result.hmdaFile.loanApplicationRegisters instanceof Array).to.be.true();
            expect(result.hmdaFile.loanApplicationRegisters.length).to.be(0);
            done();
        });
    });

    describe('addToJsonOb', function() {
        var tmpTSRecord = {'foo': 'bar'};
        var tmpLARRecord = {'bar': 'foo'};

        beforeEach(function() {
            HMDAJson.resetJsonOb();
        });

        it('should add record to transmittalSheet when type is transmittalSheet', function(done) {
            HMDAJson.addToJsonOb('transmittalSheet', tmpTSRecord);
            var result = HMDAJson.getJsonObject();
            expect(result.hmdaFile.transmittalSheet).to.be(tmpTSRecord);
            expect(result.hmdaFile.loanApplicationRegisters.length).to.be(0);
            done();
        });

        it('should add record to loanApplicationRegisters when type is loanApplicationRegister', function(done) {
            var tmpRecord = {'bar':'foo'};
            HMDAJson.addToJsonOb('loanApplicationRegister', tmpLARRecord);
            var result = HMDAJson.getJsonObject();
            expect(result.hmdaFile.loanApplicationRegisters.length).to.be(1);
            expect(result.hmdaFile.loanApplicationRegisters[0]).to.be(tmpLARRecord);
            done();
        });

        it('should do nothing when type is unknown', function(done) {
            var originalObj = HMDAJson.getJsonObject();
            HMDAJson.addToJsonOb('lar', tmpTSRecord);
            var result = HMDAJson.getJsonObject();
            expect(result).to.be(originalObj);
            done();
        });
    });

    describe('parseLine', function() {
        it('should return empty record if no fields in line spec', function(done) {
            var line = '';
            var line_spec = {};
            var result = HMDAJson.parseLine(line_spec, line).record;
            expect(typeof result).to.be('object');
            expect(Object.keys(result).length).to.be(0);
            done();
        });

        it('should return an error with the field if line is not long enough for field end', function(done) {
            var line = '1234567890';
            var line_spec = {
                'foo': {
                    'start': 10,
                    'end': 11
                }
            };
            var result = HMDAJson.parseLine(line_spec, line);
            expect(result.error).to.be('Line is not long enough to contain \'foo\'');
            done();
        });

        it('should parse record if line is long enough, and spec is well defined', function(done) {
            var line = '1234567890';
            var line_spec = {
                'one': {
                    'start':1,
                    'end': 1
                },
                'middle': {
                    'start': 2,
                    'end': 9
                },
                'end': {
                    'start': 10,
                    'end': 10
                }
            };
            var result = HMDAJson.parseLine(line_spec, line).record;
            expect(result).to.have.property('one');
            expect(result.one).to.be.equal('1');
            expect(result).to.have.property('middle');
            expect(result.middle).to.be.equal('23456789');
            expect(result).to.have.property('end');
            expect(result.end).to.be.equal('0');
            done();
        });

        it('should return an error with the field if field is not properly formatted', function(done) {
            var line = '123ABC7890';
            var line_spec = {
                'foo': {
                    'start': 1,
                    'end': 10,
                    'dataType': 'N'
                }
            };
            var result = HMDAJson.parseLine(line_spec, line);
            expect(result.error).to.be('\'foo\' must be a number');
            done();
        });
    });

    describe('process', function() {
        it('should return error when file stream is null', function(done) {
            HMDAJson.process(null, ' ', function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Missing file to process');
                done();
            });
        });

        it('should return error when file spec is null', function(done) {
            HMDAJson.process(' ', null, function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Missing file specification');
                done();
            });
        });

        it('should return error when file spec is invalid', function(done) {
            HMDAJson.process(' ', {}, function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Missing required definition for transmittalSheet in file specification');
                done();
            });
        });

        it('should return error when hmda file has issue with transmittalSheet', function(done) {
            HMDAJson.process('test/testdata/incomplete-ts.dat', FILE_SPEC, function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Error parsing transmittalSheet at line: 1 - Line is not long enough to contain \'contactFax\'');
                done();
            });
        });

        it('should return error when hmda file has issue with loanApplicationRegister', function(done) {
            HMDAJson.process('test/testdata/incomplete-lar.dat', FILE_SPEC, function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Error parsing loanApplicationRegister at line: 3 - Line is not long enough to contain \'filler\'');
                done();
            });
        });

        it('should return error when hmda file has invalid format for a field', function(done) {
            HMDAJson.process('test/testdata/bad-formatting.dat', FILE_SPEC, function(err, result) {
                expect(result).to.be.null();
                expect(err).to.be('Error parsing transmittalSheet at line: 1 - \'timestamp\' must be a number');
                done();
            });
        });

        it('should return json object when using empty space padding, due to trim option of false', function(done) {
            HMDAJson.process('test/testdata/padding.dat', FILE_SPEC, function(err, result) {
                expect(err).to.be.null();
                expect(result).to.have.property('hmdaFile');
                expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                expect(result.hmdaFile.loanApplicationRegisters.length).to.be(9);
                done();
            });
        })

        it('should return json object when hmda file is valid and provided by name', function(done) {
            HMDAJson.process('test/testdata/complete.dat', FILE_SPEC, function(err, result) {
                expect(err).to.be.null();
                expect(result).to.have.property('hmdaFile');
                expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                expect(result.hmdaFile.loanApplicationRegisters.length).to.be(3);
                done();
            });
        });

        it('should return json object when hmda file is valid and provided by stream', function(done) {
            var fs = require('fs');
            var stream = fs.createReadStream('test/testdata/complete.dat');
            HMDAJson.process(stream, FILE_SPEC, function(err, result) {
                expect(err).to.be.null();
                expect(result).to.have.property('hmdaFile');
                expect(result.hmdaFile).to.have.property('loanApplicationRegisters');
                expect(result.hmdaFile.loanApplicationRegisters.length).to.be(3);
                done();
            });
        });

    });

});
