'use strict';

var hmdajson = require('./lib/hmdajson');

var Engine = function() {
    var engine = {};

    engine.fileToJson = function(file, spec, next) {
        return hmdajson.process(file, spec, next);
    };

    return engine;
};

module.exports = new Engine();