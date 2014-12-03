'use strict';

var hmdajson = require('./lib/hmdajson');

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

    return engine;
};

module.exports = new Engine();
