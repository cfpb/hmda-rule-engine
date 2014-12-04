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
            }
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
            }
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
            }
            var result = engine.hasAtLeastOneLAR(hmdaFile);
            expect(result).to.be(true);
            done();
        });

        it('should return false when there is not at least one loan application register', function(done) {
            var hmdaFile = {
                loanApplicationRegisters: []
            }
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


});
