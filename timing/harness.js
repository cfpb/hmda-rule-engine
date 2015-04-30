#!/usr/bin/env node --max-old-space-size=3072

/* global -Promise */
'use strict';

var Promise = require('bluebird'),
    engine = require('../engine'),
    memwatch = require('memwatch-next'),
    fs = require('fs');

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

var runIRS = function() {
    if (engine.getDebug()) {
        console.time('time to run IRS report');
    }
    return engine.getTotalsByMSA(engine.getHmdaJson().hmdaFile)
    .then(function() {
        if (engine.getDebug()) {
            console.timeEnd('time to run IRS report');
        }
    });
};

var runAll = function(year) {
    return runSynValAll(year)
    .then(function() {
        return runQualMacroAll(year);
    })
    .then(function() {
        return engine.runSpecial(year);
    })
    .then(function() {
        return runIRS();
    });
};

var runThen = function(year) {
    return runSynValThen(year)
    .then(function() {
        return runQualMacroThen(year);
    })
    .then(function() {
        return engine.runSpecial(year);
    })
    .then(function() {
        return runIRS();
    });
};

/**
 * Construct a new instance of TimingHarness for running performance timing tests
 * @constructs TimingHarness
 */
var TimingHarness = function() {};

/**
 * Run the timing test harness
 * @param  {object}   options Options object that contains filename, year, apiurl, use localdb flag, debug level, and run as then flag
 * @example {@lang javascript}
 * var harness = require('./harness');
 * var options = {
 *      'filename': '/path/to/file.dat',
 *      'year': '2013',
 *      'apiurl': 'http://localhost:8080',
 *      'uselocaldb': 'y',  // (Optional: valid values: ['y', 'n'])
 *      'debug': 1,         // (Optional: valid values: [1, 2, 3])
 *      'asthen': 'n'       // (Optional: valid values: ['y', 'n'])
 * }
 * harness.run(options);
 */
TimingHarness.prototype.run = function(options) {
    var promise = runAll;
    engine.setAPIURL(options.apiurl);
    if (options.uselocaldb !== undefined && options.uselocaldb === 'y') {
        engine.setUseLocalDB(true);
    }
    if (options.debug !== undefined) {
        engine.setDebug(options.debug);
    }
    if (options.asthen !== undefined && options.asthen === 'y') {
        promise = runThen;
    }

    console.time('total time');
    console.time('time to process hmda json');
    var fileStream = fs.createReadStream(options.filename);
    fileStream.on('error', function(err) {
        console.error('File does not exist');
        process.exit(1);
    });
    var heapDiff = new memwatch.HeapDiff();
    engine.fileToJson(fileStream, options.year, function(fileErr) {
        if (fileErr) {
            console.log(fileErr);
        } else {
            console.log('lars in \'' + options.filename + '\' = ' + engine.getHmdaJson().hmdaFile.loanApplicationRegisters.length);
            console.timeEnd('time to process hmda json');
            console.time('time to run all rules');
            promise(options.year)
            .then(function() {
                console.timeEnd('time to run all rules');
                console.timeEnd('total time');

                var diff = heapDiff.end();
                console.log('before size: ' + diff.before.size);
                console.log('before nodes: ' + diff.before.nodes);
                console.log('after size: ' + diff.after.size);
                console.log('after nodes: ' + diff.after.nodes);
                //console.log(JSON.stringify(engine.getErrors(), null, 2));
                //console.log(engine.getErrors());
            })
            .catch(function(err) {
                console.log(err.message);
            });
        }
    });
};

module.exports = new TimingHarness();
if (process.argv.length && process.argv[1] === __dirname +'/harness.js') {
    if (process.argv.length < 5) {
        console.error('');
        console.error('Usage: ./run FILENAME YEAR APIURL [USE LOCALDB] [ENGINE DEBUG LEVEL] [RUN AS THEN, NOT ALL]');
        console.error('');
        console.error('EX: ./run ./testdata/bank.dat 2013 http://localhost:9000 y 1 y');
        console.error('');
        process.exit(1);
    }

    var options = {
        'filename': process.argv[2],
        'year': process.argv[3],
        'apiurl': process.argv[4],
        'uselocaldb': process.argv[5],
        'debug': process.argv[6],
        'asthen': process.argv[7]
    };
    module.exports.run(options);
}
