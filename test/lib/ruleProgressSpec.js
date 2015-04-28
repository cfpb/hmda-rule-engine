/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global before:false*/

'use strict';

var sinon = require('sinon'),
    EngineCustomConditions = require('../../lib/engineCustomConditions'),
    EngineBaseConditions = require('../../lib/engineBaseConditions'),
    RuleProgress = require('../../lib/ruleProgress'),
    Engine = function() {
        this._HMDA_JSON = {};
        this.getHmdaJson = function() {
            return this._HMDA_JSON;
        };
    },
    engine,
    spy;

RuleProgress.call(Engine.prototype);

describe('RuleProgress', function() {

    before(function(done) {
        engine = new Engine();
        done();
    });

    beforeEach(function(done) {
        engine.initProgress();
        spy = sinon.spy();
        done();
    });

    it('should calcuate a percent of 100', function(done) {
        engine.getProgress().count = 0;
        engine.getProgress().estimate = 1;

        engine.getProgress().events.on('progressStep', spy);

        engine.postTaskCompletedMessage();
        expect(spy.called).to.be.true();
        expect(sinon.assert.calledWith(spy, 100));
        done();
    });

    it('should calcuate a percent of 75', function(done) {
        engine.getProgress().count = 5;
        engine.getProgress().estimate = 8;

        engine.getProgress().events.on('progressStep', spy);

        engine.postTaskCompletedMessage();
        expect(spy.called).to.be.true();
        expect(sinon.assert.calledWith(spy, 75));
        done();
    });

    it('should calcuate a percent of 50', function(done) {
        engine.getProgress().count = 1;
        engine.getProgress().estimate = 4;

        engine.getProgress().events.on('progressStep', spy);

        engine.postTaskCompletedMessage();
        expect(spy.called).to.be.true();
        expect(sinon.assert.calledWith(spy, 50));
        done();
    });

    it('should not emit events when percent is over 100', function(done) {
        engine.getProgress().count = 2;
        engine.getProgress().estimate = 1;

        engine.getProgress().events.on('progressStep', spy);

        engine.postTaskCompletedMessage();
        expect(spy.called).to.be.false();
        done();
    });

    it('should calculate estimated tasks for transmittal sheet scope', function(done) {
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013', ['ts'], 'syntactical');
        expect(engine.getProgress().estimate).to.be(3);
        done();
    });

    it('should calculate estimated tasks for lar sheet scope', function(done) {
        engine.clearProgress();
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013', ['lar'], 'validity');
        expect(engine.getProgress().estimate).to.be(63);
        done();
    });

    it('should calculate estimated tasks for macro sheet scope', function(done) {
        engine.clearProgress();
        engine._HMDA_JSON = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
        engine.calcEstimatedTasks('2013', ['hmda'], 'macro');
        expect(engine.getProgress().estimate).to.be(33);
        done();
    });

});
