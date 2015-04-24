/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global before:false*/

'use strict';

var EngineCustomConditions = require('../../lib/engineCustomConditions'),
    EngineBaseConditions = require('../../lib/engineBaseConditions'),
    RuleParseAndExec = require('../../lib/ruleParseAndExec'),
    Engine = function() {},
    engine;

RuleParseAndExec.call(Engine.prototype);
EngineBaseConditions.call(Engine.prototype);
EngineCustomConditions.call(Engine.prototype);

describe('RuleParseAndExec', function() {

    before(function(done) {
        Engine.prototype.setHmdaJson = function(json) {
            this._HMDA_JSON = json;
        };
        Engine.prototype.getHmdaJson = function() {
            return this._HMDA_JSON;
        };
        Engine.prototype.getDebug = function() {
            return false;
        };
        Engine.prototype.postTaskCompletedMessage = function() { };
        Engine.prototype.setRuleYear = function(year) {
            this.currentYear = year;
        };
        engine = new Engine();
        done();
    });

    describe('parseRule', function() {
        var result;

        beforeEach(function() {
            result = {
                argIndex: 0,
                args: [],
                funcs: [],
                spreads: [],
                body: '',
                properties: {}
            };
        });

        it('should parse a rule with a simple property test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'is_true'
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value string test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal',
                'value': '1'
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal(arguments[0], "1")');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value number test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal',
                'value': 1
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal(arguments[0], 1)');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value array test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'in',
                'values': ['1', '2', '3']
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.in(arguments[0], ["1","2","3"])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-property test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'equal_property',
                'value': 'bar'
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.equal_property(arguments[0], arguments[1])');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a property-value-value test into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'between',
                'start': '1',
                'end': '9'
            };

            engine.parseRule(rule, result);
            expect(result.funcs[0]).to.be('this.between(arguments[0], "1", "9")');
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with an if-then test into a function string', function(done) {
            var rule = {
                'if': {
                    'property': 'foo',
                    'condition': 'is_true'
                },
                'then': {
                    'property': 'bar',
                    'condition': 'is_false'
                }
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' ? ' + result.spreads[1] + ' : true)');
            done();
        });

        it('should parse a rule with an and grouping into a function string', function(done) {
            var rule = {
                'and': [
                    {
                        'property': 'foo',
                        'condition': 'is_true'
                    },
                    {
                        'property': 'bar',
                        'condition': 'is_false'
                    }
                ]
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' && ' + result.spreads[1] + ')');
            done();
        });

        it('should parse a rule with an or grouping into a function string', function(done) {
            var rule = {
                'or': [
                    {
                        'property': 'foo',
                        'condition': 'is_true'
                    },
                    {
                        'property': 'bar',
                        'condition': 'is_false'
                    }
                ]
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(2);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.spreads.length).to.be(2);
            expect(result.body).to.be('(' + result.spreads[0] + ' || ' + result.spreads[1] + ')');
            done();
        });

        it('should parse a rule with a complex and/or grouping into a function string', function(done) {
            var rule = {
                'and': [
                    {
                        'or': [
                            {
                                'property': 'foo',
                                'condition': 'is_true'
                            },
                            {
                                'property': 'bar',
                                'condition': 'is_false'
                            }
                        ]
                    },
                    {
                        'or': [
                            {
                                'property': 'animal',
                                'condition': 'equal',
                                'value': 'cow'
                            },
                            {
                                'property': 'fruit',
                                'condition': 'equal',
                                'value': 'banana'
                            }
                        ]
                    }
                ]
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(4);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.funcs[2]).to.be('this.equal(arguments[2], "cow")');
            expect(result.funcs[3]).to.be('this.equal(arguments[3], "banana")');
            expect(result.spreads.length).to.be(4);
            expect(result.body).to.be('((' + result.spreads[0] + ' || ' + result.spreads[1] + ') && (' + result.spreads[2] + ' || ' + result.spreads[3] + '))');
            done();
        });

        it('should parse a complex rule with an if-then and an and grouping into a string', function(done) {
            var rule = {
                'if': {
                    'and': [
                        {
                            'property': 'foo',
                            'condition': 'is_true'
                        },
                        {
                            'property': 'bar',
                            'condition': 'is_false'
                        }
                    ]
                },
                'then': {
                    'property': 'baz',
                    'condition': 'equal',
                    'value': '3'
                }
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(3);
            expect(result.funcs[0]).to.be('this.is_true(arguments[0])');
            expect(result.funcs[1]).to.be('this.is_false(arguments[1])');
            expect(result.funcs[2]).to.be('this.equal(arguments[2], "3")');
            expect(result.spreads.length).to.be(3);
            expect(result.body).to.be('((' + result.spreads[0] + ' && ' + result.spreads[1] + ') ? ' + result.spreads[2] + ' : true)');
            done();
        });

        it('should parse a rule with a custom function call into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'call',
                'function': 'isFooValid'
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(1);
            expect(result.funcs[0]).to.be('this.isFooValid(arguments[0])');
            expect(result.spreads.length).to.be(1);
            expect(result.body).to.be(result.spreads[0]);
            done();
        });

        it('should parse a rule with a custom function call and list of args into a function string', function(done) {
            var rule = {
                'property': 'foo',
                'condition': 'call',
                'function': 'isFooValid',
                'args': ['foo', 'bar', 'baz']
            };

            engine.parseRule(rule, result);
            expect(result.funcs.length).to.be(1);
            expect(result.funcs[0]).to.be('this.isFooValid(arguments[0], arguments[1], arguments[2])');
            expect(result.spreads.length).to.be(1);
            expect(result.body).to.be(result.spreads[0]);
            done();
        });
    });

    describe('execRule', function() {
        var hmdaJson = {};
        var topLevelObj = {};
        var rule;

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            topLevelObj = hmdaJson.hmdaFile.transmittalSheet;
            engine.setHmdaJson(hmdaJson);
        });

        it('should be cancellable', function(done) {
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'hasRecordIdentifiersForEachRow'
            };

            expect(engine.execRule(hmdaJson, rule).isCancellable()).to.be.true();
            done();
        });

        it('should return true for a passing function rule', function(done) {
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'hasRecordIdentifiersForEachRow'
            };

            engine.execRule(hmdaJson, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return list of errors for a non-passing function rule', function(done) {
            hmdaJson.hmdaFile.loanApplicationRegisters[0].recordID = '3';
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'hasRecordIdentifiersForEachRow'
            };

            engine.execRule(hmdaJson, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].properties.recordID).to.be('3');
                done();
            });
        });

        it('should return true for a passing email_address format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.respondentEmail = 'krabapple@gmail.com';
            rule = {
                'property': 'respondentEmail',
                'condition': 'email_address'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing email_address format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.respondentEmail = 'krabapple.@gmail.com';
            rule = {
                'property': 'respondentEmail',
                'condition': 'email_address'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.respondentEmail).to.be('krabapple.@gmail.com');
                done();
            });
        });

        it('should return true for a passing zipcode format condition rule', function(done) {
            rule = {
                'property': 'parentZip',
                'condition': 'zipcode'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing zipcode format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.parentZip = '555-1234';
            rule = {
                'property': 'parentZip',
                'condition': 'zipcode'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.parentZip).to.be('555-1234');
                done();
            });
        });

        it('should return true for a passing yyyy_mm_dd_hh_mm_ss format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp += '37';
            rule = {
                'property': 'timestamp',
                'condition': 'yyyy_mm_dd_hh_mm_ss'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing yyyy_mm_dd_hh_mm_ss format condition rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = hmdaJson.hmdaFile.transmittalSheet.timestamp  + '98';
            rule = {
                'property': 'timestamp',
                'condition': 'yyyy_mm_dd_hh_mm_ss'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('20130117133098');
                done();
            });

        });

        it('should return true for a passing matches_regex rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'matches_regex',
                'value': '[0-9]{12}'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing matches_regex rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'matches_regex',
                'value': '[0-9]{15}'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing is_integer rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_integer'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_integer rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013.01171330';
            rule = {
                'property': 'timestamp',
                'condition': 'is_integer'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('2013.01171330');
                done();
            });
        });

        it('should return true for a passing is_float rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013.01171330';
            rule = {
                'property': 'timestamp',
                'condition': 'is_float'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_float rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'is_float'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing equal rule', function(done) {
            topLevelObj = hmdaJson.hmdaFile.loanApplicationRegisters[0];
            rule = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '2'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing equal rule', function(done) {
            topLevelObj = hmdaJson.hmdaFile.loanApplicationRegisters[0];
            rule = {
                'property': 'recordID',
                'condition': 'equal',
                'value': '1'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('2');
                expect(result[0].properties.recordID).to.be('2');
                done();
            });
        });

        it('should return true for a passing equal_property rule', function(done) {
            hmdaJson.hmdaFile.transmittalSheet.timestamp = '2013';
            rule = {
                'property': 'timestamp',
                'condition': 'equal_property',
                'value': 'activityYear'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing equal_property rule', function(done) {
            rule = {
                'property': 'timestamp',
                'condition': 'equal_property',
                'value': 'activityYear'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing between rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'between',
                'start': '2012',
                'end': '2014'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing between rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'between',
                'start': '2012',
                'end': '2013'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing is_empty rule', function(done) {
            rule = {
                'property': 'filler',
                'condition': 'is_empty'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing is_empty rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'is_empty'
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing in rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'in',
                'values': ['2012', '2013']
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing in rule', function(done) {
            rule = {
                'property': 'activityYear',
                'condition': 'in',
                'values': ['2012', '2014']
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                done();
            });
        });

        it('should return true for a passing if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'equal',
                    'value': '201301171330'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
            });

            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2014'
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'equal',
                    'value': '201301171330'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return true for a complex passing if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'if': {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    'then': {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm'
                    }
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing complex if-then rule', function(done) {
            rule = {
                'if': {
                    'property': 'activityYear',
                    'condition': 'equal',
                    'value': '2013'
                },
                'then': {
                    'if': {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    'then': {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm_ss'
                    }
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing and rule', function(done) {
            rule = {
                'and': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2013'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return true for a passing complex and rule', function(done) {
            rule = {
                'if': {
                    'and': [
                        {
                            'property': 'activityYear',
                            'condition': 'equal',
                            'value': '2013'
                        },
                        {
                            'property': 'timestamp',
                            'condition': 'equal',
                            'value': '201301171330'
                        }
                    ]
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'yyyy_mm_dd_hh_mm'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing and rule', function(done) {
            rule = {
                'and': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2013'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'equal',
                        'value': '201301171330'
                    },
                    {
                        'property': 'taxID',
                        'condition': 'is_empty'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                expect(result[0].properties.taxID).to.be('99-9999999');
                done();
            });
        });

        it('should return a list of errors for a non-passing and rule', function(done) {
            rule = {
                'if': {
                    'and': [
                        {
                            'property': 'activityYear',
                            'condition': 'equal',
                            'value': '2013'
                        },
                        {
                            'property': 'timestamp',
                            'condition': 'equal',
                            'value': '201301171330'
                        }
                    ]
                },
                'then': {
                    'property': 'timestamp',
                    'condition': 'yyyy_mm_dd_hh_mm_ss'
                }
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing or rule', function(done) {
            rule = {
                'or': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2015'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });

        it('should return a list of errors for a non-passing or rule', function(done) {
            rule = {
                'or': [
                    {
                        'property': 'activityYear',
                        'condition': 'equal',
                        'value': '2015'
                    },
                    {
                        'property': 'timestamp',
                        'condition': 'yyyy_mm_dd_hh_mm_ss'
                    }
                ]
            };

            engine.execRule(topLevelObj, rule)
            .then(function(result) {
                expect(result.length).to.be(1);
                expect(result[0].lineNumber).to.be('1');
                expect(result[0].properties.activityYear).to.be('2013');
                expect(result[0].properties.timestamp).to.be('201301171330');
                done();
            });
        });

        it('should return true for a passing S270 rule', function(done) {
            rule = {
                'property': 'hmdaFile',
                'condition': 'call',
                'function': 'isActionDateInActivityYear'
            };

            engine.execRule(hmdaJson.hmdaFile, rule)
            .then(function(result) {
                expect(result.length).to.be(0);
                done();
            });
        });
    });

    describe('getEditRunPromise', function() {

        var hmdaJson = {};
        var topLevelObj = {};

        beforeEach(function() {
            hmdaJson = JSON.parse(JSON.stringify(require('../testdata/complete.json')));
            engine.setHmdaJson(hmdaJson);
        });

        it('should be cancellable', function(done) {
            var prom = engine.getEditRunPromise('2013', 'syntactical')
            .catch(function() {
                expect(prom.isCancellable()).to.be.true();
                done();
            });
        });

    });

});
