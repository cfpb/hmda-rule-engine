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
    Engine = function() {},
    engine;

RuleProgress.call(Engine.prototype);

describe('RuleProgress', function() {

    before(function(done) {
        Engine.prototype.setHmdaJson = function(json) {
            this._HMDA_JSON = json;
        };
        engine = new Engine();
        done();
    });

});