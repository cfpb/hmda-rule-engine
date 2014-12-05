'use strict';

var hmdajson = require('./lib/hmdajson'),
    _ = require('underscore');

var Engine = function() {
    var engine = {};

    engine.fileToJson = function(file, spec, next) {
        return hmdajson.process(file, spec, next);
    };

    engine.hasRecordIdentifiersForEachRow = function(hmdaFile) {
        if (hmdaFile.transmittalSheet.recordID !== '1') {
            return false;
        } else {
            for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
                if (hmdaFile.loanApplicationRegisters[i].recordID !== '2') {
                    return false;
                }
            }
        }
        return true;
    };

    engine.hasAtLeastOneLAR = function(hmdaFile) {
        return hmdaFile.loanApplicationRegisters.length > 0;
    };

    engine.isValidAgencyCode = function(hmdaFile) {
        var validAgencies = [1, 2, 3, 5, 7, 9];
        if (! _.contains(validAgencies, hmdaFile.transmittalSheet.agencyCode)) {
            return false;
        } else {
            var tsAgencyCode = hmdaFile.transmittalSheet.agencyCode;
            for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
                if (hmdaFile.loanApplicationRegisters[i].agencyCode !== tsAgencyCode) {
                    return false;
                }
            }
        }
        return true;
    };

    engine.hasUniqueLoanNumbers = function(hmdaFile) {
        return _.unique(hmdaFile.loanApplicationRegisters, _.iteratee('loanNumber')).length === hmdaFile.loanApplicationRegisters.length;
    };

    return engine;
};

module.exports = new Engine();
