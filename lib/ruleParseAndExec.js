/*jshint evil:true*/
/* global -Promise */
'use strict';

var utils = require('./utils'),
    _ = require('lodash'),
    brijSpec = require('brij-spec'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    Promise = require('bluebird');


var RuleParseAndExec = (function() {
    return function() {

        /*
         * -----------------------------------------------------
         * Parsing
         * -----------------------------------------------------
         */

        this.parseRuleCustomCall = function(rule, result) {
            var func = '';
            func += 'this.' + rule.function + '(';
            if (rule.args) {
                for (var i=0; i < rule.args.length; i++) {
                    func += 'arguments[' + result.argIndex++ + ']';
                    if (i !== rule.args.length-1) {
                        func += ', ';
                    }
                    result.args.push(rule.args[i]);
                }
            } else {
                func += 'arguments[' + result.argIndex++ + ']';
                result.args.push(rule.property);
            }
            func += ')';
            var resultName = utils.promiseResultName(result.funcs);
            result.body += resultName;
            result.spreads.push(resultName);
            result.funcs.push(func);
        };

        this.parseRuleCondition = function(rule, result) {
            var func = '';
            func += 'this.' + rule.condition + '(arguments[' + result.argIndex++ + ']';
            result.args.push(rule.property);
            var fields = brijSpec.VALID_CONDITIONS[rule.condition].additionalFields;
            if (fields) {
                if (this.ends_with(rule.condition, '_property')) {
                    func += ', arguments[' + result.argIndex++ + ']';
                    result.args.push(rule[fields[0]]);
                } else {
                    for (var i=0; i < fields.length; i++) {
                        func += ', ' + JSON.stringify(rule[fields[i]]);
                    }
                }
            }
            func += ')';
            var resultName = utils.promiseResultName(result.funcs);
            result.body += resultName;
            result.spreads.push(resultName);
            result.funcs.push(func);
        };

        this.parseRule = function(rule, result) {
            if (rule.hasOwnProperty('condition')) {
                if (rule.condition === 'call') {
                    this.parseRuleCustomCall(rule, result);
                } else {
                    this.parseRuleCondition(rule, result);
                }
            }

            if (rule.hasOwnProperty('if')) {
                result.body += '(';
                this.parseRule(rule.if, result);
                result.body += ' ? ';
                this.parseRule(rule.then, result);
                result.body += ' : true)';
            }

            if (rule.hasOwnProperty('and')) {
                result.body += '(';
                for (var i=0; i < rule.and.length; i++) {
                    this.parseRule(rule.and[i], result);
                    if (i !== rule.and.length-1) {
                        result.body += ' && ';
                    }
                }
                result.body += ')';
            }

            if (rule.hasOwnProperty('or')) {
                result.body += '(';
                for (var j=0; j < rule.or.length; j++) {
                    this.parseRule(rule.or[j], result);
                    if (j !== rule.or.length-1) {
                        result.body += ' || ';
                    }
                }
                result.body += ')';
            }

            for (var x = 0; x < result.args.length; x++) {
                result.properties[result.args[x]] = true;
            }
        };

        /*
         * -----------------------------------------------------
         * Rule Execution
         * -----------------------------------------------------
         */

        this.execParsedRule = function(topLevelObj, functionBody, result, ruleid) {
            var args = _.map(result.args, function(arg) {
                if (typeof(arg) === 'string') {
                    var contextList = [topLevelObj, !topLevelObj.hmdaFile ? this._HMDA_JSON : {}];        // Context list to search
                    return utils.resolveArg(arg, contextList);
                } else {
                    return arg;
                }
            }.bind(this));

            /* istanbul ignore if */
            if (ruleid) {
                console.time('    ' + ruleid);
            }
            return new Function(functionBody).apply(this, args)
            .then(function(funcResult) {
                /* istanbul ignore if */
                if (ruleid) {
                    console.timeEnd('    ' + ruleid);
                }
                this.postTaskCompletedMessage();
                if (funcResult === true) {
                    return [];
                } else if (topLevelObj.hmdaFile) {
                    return funcResult;
                } else {
                    var error = {'properties': {}, 'lineNumber': topLevelObj.lineNumber};
                    if (topLevelObj.hasOwnProperty('loanNumber')) {
                        error.loanNumber = topLevelObj.loanNumber;
                    }
                    for (var i = 0; i < args.length; i++) {
                        error.properties[result.args[i]] = args[i];
                    }
                    return [error];
                }
            }.bind(this));
        };

        this.execRule = function(topLevelObj, rule, ruleid) {
            var parserResult = utils.getParsedRule.apply(this, [rule]);
            var functionBody = parserResult[0];
            var result = parserResult[1];

            return this.execParsedRule(topLevelObj, functionBody, result, ruleid);
        };

        this.getExecRulePromise = function(args) {
            /* istanbul ignore if */
            if (this.getDebug() > 2) {
                console.time('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
            }
            return this.execParsedRule(args.topLevelObj, args.functionBody, args.result)
            .then(function(result) {
                if (_.isArray(result) && result.length !== 0) {
                    utils.addToErrors.apply(this, [result, args.rule, args.editType, args.scope]);
                }
                /* istanbul ignore if */
                if (this.getDebug() > 2) {
                    console.timeEnd('    ' + args.rule.id + ' - ' + args.scope + (args.topLevelObj.hasOwnProperty('loanNumber') ? ' - ' + args.topLevelObj.loanNumber : ''));
                }
            }.bind(this));
        };

        this.runEdits = function(year, scope, editType) {
            var rules = hmdaRuleSpec.getEdits(year, scope, editType);
            if (!rules) {
                return;
            }

            var topLevelObj;
            switch (scope) {
                case 'ts':
                    topLevelObj = this._HMDA_JSON.hmdaFile.transmittalSheet;
                    break;
                case 'lar':
                    topLevelObj = this._HMDA_JSON.hmdaFile.loanApplicationRegisters;
                    break;
                case 'hmda':
                    topLevelObj = this._HMDA_JSON;
                    break;
            }

            return Promise.map(rules, function(currentRule) {
                /* istanbul ignore if */
                if (this.getDebug() > 0) {
                    console.time('    ' + currentRule.id + ' - ' + scope);
                }
                var args = {
                    'topLevelObj': topLevelObj,
                    'rule': currentRule,
                    'scope': scope,
                    'editType': editType
                };
                var parsedRule = utils.getParsedRule.apply(this, [currentRule.rule]);
                args.functionBody = parsedRule[0];
                args.result = parsedRule[1];

                if (_.isArray(topLevelObj)) {
                    return Promise.map(topLevelObj, function(currentTopLevelObj) {
                        args.topLevelObj = currentTopLevelObj;
                        return this.getExecRulePromise(args);
                    }.bind(this), { concurrency: this._CONCURRENT_LARS })
                    .then(function() {
                        /* istanbul ignore if */
                        if (this.getDebug() > 0) {
                            console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                        }
                    }.bind(this));
                } else {
                    return this.getExecRulePromise(args)
                    .then(function() {
                        /* istanbul ignore if */
                        if (this.getDebug() > 0) {
                            console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                        }
                    }.bind(this));
                }
            }.bind(this), { concurrency: this._CONCURRENT_RULES });
        };

        this.getEditRunPromise = function(year, type) {
            this.setRuleYear(year);
            var scopes = ['ts', 'lar', 'hmda'];
            return Promise.map(scopes, function(scope) {
                return this.runEdits(year, scope, type);
            }.bind(this), { concurrency: this._CONCURRENT_RULES });
        };


        return this;
    };
})();

module.exports = RuleParseAndExec;