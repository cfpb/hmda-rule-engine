/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global before:false*/

'use strict';

var EngineCustomConditions = require('../../lib/engineCustomConditions'),
    EngineBaseConditions = require('../../lib/engineBaseConditions'),
    RuleProgress = require('../../lib/ruleProgress'),
    EventEmitter = require('events').EventEmitter,
    Engine = function() {
        this._HMDA_JSON = {};
    },
    engine;

RuleProgress.call(Engine.prototype);

describe('RuleProgress', function() {

    before(function(done) {
        Engine.prototype.getProgress = function() {
            return this.progress;
        };
        Engine.prototype.clearProgress = function() {
            this.progress.estimate = 0;
            this.progress.count = 0;
        };
        Engine.prototype.getHmdaJson = function() {
            return this._HMDA_JSON;
        };
        engine = new Engine();
        engine.progress = {
            events: {},
            throttle: 0,
            count: 0,
            estimate: 0
        };
        done();
    });

    it('should send out an event when calling postTaskCompletedMessage and count is correct', function(done) {
        engine.getProgress().count = 0;
        engine.getProgress().throttle = 1;
        engine.getProgress().events = new EventEmitter();

        engine.getProgress().events.on('progressStep', function(percent) {
            expect(percent).to.be(1);
            done();
        });

        engine.postTaskCompletedMessage();
    });

    it('should send out an event with a larger percent if postTaskCompletedMessage is passed a count parameter', function(done) {
        engine.getProgress().count = 5;
        engine.getProgress().throttle = 1;
        engine.getProgress().events = new EventEmitter();

        engine.getProgress().events.on('progressStep', function(percent) {
            expect(percent).to.be(10);
            done();
        });

        engine.postTaskCompletedMessage(5);
    });

    it('should not send out an event calling postTaskCompletedMessage with count not equal to throttle', function(done) {
        engine.getProgress().count = 0;
        engine.getProgress().throttle = 2;
        expect(engine.postTaskCompletedMessage()).to.be(false);
        done();
    });

    it('should calculate estimated tasks for transmittal sheet scope', function(done) {
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013',['ts'],'syntactical');
        expect(engine.getProgress().estimate).to.be(3);
        done();
    });

    it('should calculate estimated tasks for lar sheet scope', function(done) {
        engine.clearProgress();
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013',['lar'],'validity');
        expect(engine.getProgress().estimate).to.be(189);
        done();
    });

    it('should calculate estimated tasks for macro sheet scope', function(done) {
        engine.clearProgress();
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013',['hmda'],'macro');
        expect(engine.getProgress().estimate).to.be(167);
        done();
    });



});