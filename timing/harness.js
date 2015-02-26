#!/usr/bin/env node

/* global -Promise */
'use strict';

var Promise = require('bluebird');
var engine = require('../engine');
var fs = require('fs');

var runSynValThen = function(year) {
    return engine.runSyntactical(year)
    .then(function() {
        return engine.runValidity(year);
    });
};

var runSynValAll = function(year) {
    return Promise.all([engine.runSyntactical(year), engine.runValidity(year)]);
};

var runQualMacroThen = function(year) {
    return engine.runQuality(year)
    .then(function() {
        return engine.runMacro(year);
    });
};

var runQualMacroAll = function(year) {
    return Promise.all([engine.runQuality(year), engine.runMacro(year)]);
};

var runAll = function(year) {
    return runSynValAll(year)
    .then(function() {
        return runQualMacroAll(year);
    })
    .then(function() {
        return engine.runSpecial(year);
    });
};

var runThen = function(year) {
    return runSynValThen(year)
    .then(function() {
        return runQualMacroThen(year);
    })
    .then(function() {
        return engine.runSpecial(year);
    });
};

var runHarness = function(fn, year, apiurl, uselocaldb, debug, asthen) {
    var promise = runAll;
    engine.setAPIURL(apiurl);
    if (uselocaldb !== undefined && uselocaldb === 'y') {
        engine.setUseLocalDB(true);
    }
    if (debug !== undefined) {
        engine.setDebug(debug);
    }
    if (asthen !== undefined && asthen === 'y') {
        promise = runThen;
    }

    console.time('total time');
    console.time('time to process hmda json');
    fs.readFile(fn, function(err, data) {
        if (err) {
            console.error('File does not exist');
            process.exit(1);
        }
        engine.fileToJson(data, year, function(fileErr) {
            if (fileErr) {
                console.log(fileErr);
            } else {
                console.log('lars in \'' + fn + '\' = ' + engine.getHmdaJson().hmdaFile.loanApplicationRegisters.length);
                console.timeEnd('time to process hmda json');
                console.time('time to run all rules');
                promise(year)
                .then(function() {
                    console.timeEnd('time to run all rules');
                    console.timeEnd('total time');
                    console.log(engine.getErrors());
                })
                .catch(function(err) {
                    console.log(err.message);
                });
            }
        });
    });
};

var run = function() {
    if (process.argv.length < 5) {
        console.error('');
        console.error('Usage: ./run FILENAME YEAR APIURL [USE LOCALDB] [ENGINE DEBUG LEVEL] [RUN AS THEN, NOT ALL]');
        console.error('');
        console.error('EX: ./run ./testdata/bank.dat 2013 http://localhost:9000 1 y');
        console.error('');
        process.exit(1);
    }

    var fn = process.argv[2];
    var year = process.argv[3];
    var apiurl = process.argv[4];
    var uselocaldb = process.argv[5];
    var debug = process.argv[6];
    var asthen = process.argv[7];
    runHarness(fn, year, apiurl, uselocaldb, debug, asthen);
};

module.exports = runHarness;
if (process.argv.length && process.argv[1] === __dirname +'/harness.js') {
    run();
}
