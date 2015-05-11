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
                for (var i = 0; i < rule.args.length; i++) {
                    func += 'arguments[' + result.argIndex++ + ']';
                    if (i !== rule.args.length - 1) {
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
                    for (var i = 0; i < fields.length; i++) {
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
            var len;
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
                var ruleAnd = rule.and;
                len = rule.and.length;

                result.body += '(';
                for (var i = 0; i < len; i++) {
                    this.parseRule(ruleAnd[i], result);
                    if (i !== len - 1) {
                        result.body += ' && ';
                    }
                }
                result.body += ')';
            }

            if (rule.hasOwnProperty('or')) {
                var ruleOr = rule.or;
                len = ruleOr.length;

                result.body += '(';
                for (var j = 0; j < len; j++) {
                    this.parseRule(ruleOr[j], result);
                    if (j !== len - 1) {
                        result.body += ' || ';
                    }
                }
                result.body += ')';
            }

            var resultArgs = result.args;
            len = resultArgs.length;
            for (var x = 0; x < len; x++) {
                result.properties[resultArgs[x]] = true;
            }
        };

        /*
         * -----------------------------------------------------
         * Rule Execution
         * -----------------------------------------------------
         */

        this.execParsedRule = function(topLevelObj, functionBody, result, ruleid) {
            var args = result.args.map(function(arg) {
                if (typeof arg === 'string') {

                    // Context list to search
                    var contextList = [topLevelObj, !topLevelObj.hmdaFile ? this._HMDA_JSON : {}];
                    return utils.resolveArg(arg, contextList);
                } else {
                    return arg;
                }
            }, this);

            /* istanbul ignore if */
            if (ruleid) {
                console.time('    ' + ruleid);
            }
            return new Function(functionBody).apply(this, args)
            .cancellable()
            .then(function(funcResult) {
                /* istanbul ignore if */
                if (ruleid) {
                    console.timeEnd('    ' + ruleid);
                }
                if (funcResult === true) {
                    return [];
                } else if (topLevelObj.hmdaFile) {
                    return funcResult;
                } else {
                    var error = {'properties': {}, 'lineNumber': topLevelObj.lineNumber};
                    if (topLevelObj.hasOwnProperty('loanNumber')) {
                        error.loanNumber = topLevelObj.loanNumber;
                    }
                    if (topLevelObj.hasOwnProperty('universalLoanID')) {
                        error.universalLoanID = topLevelObj.universalLoanID;
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

            var hmdaJson = this.getHmdaJson(),
                hmdaFile = hmdaJson.hmdaFile,
                topLevelObj;

            switch (scope) {
                case 'ts':
                    topLevelObj = [hmdaFile.transmittalSheet];
                    break;
                case 'lar':
                    topLevelObj = hmdaFile.loanApplicationRegisters;
                    break;
                case 'hmda':
                    topLevelObj = [hmdaJson];
                    break;
            }

            return Promise.each(rules, function(currentRule) {
                /* istanbul ignore if */
                if (this.getDebug() > 0) {
                    console.time('    ' + currentRule.id + ' - ' + scope);
                }
                var parsedRule = utils.getParsedRule.apply(this, [currentRule.rule]);

                return Promise.map(topLevelObj, function(currentTopLevelObj) {
                    var args = {
                        'topLevelObj': currentTopLevelObj,
                        'rule': currentRule,
                        'scope': scope,
                        'editType': editType,
                        'functionBody': parsedRule[0],
                        'result': parsedRule[1]
                    };
                    return this.getExecRulePromise(args);
                }.bind(this), { concurrency: this._CONCURRENT_LARS })
                .cancellable()
                .then(function() {
                    this.postTaskCompletedMessage();
                    /* istanbul ignore if */
                    if (this.getDebug() > 0) {
                        console.timeEnd('    ' + currentRule.id + ' - ' + scope);
                    }
                }.bind(this));
            }.bind(this))
            .cancellable();
        };

        this.runEditsLar = function(year, editType, lar) {
            var rules = hmdaRuleSpec.getEdits(year, 'lar', editType);
            if (!rules) {
                return;
            }

            return Promise.each(rules, function(currentRule) {
                var parsedRule = utils.getParsedRule.apply(this, [currentRule.rule]);

                var args = {
                    'topLevelObj': lar,
                    'rule': currentRule,
                    'scope': 'lar',
                    'editType': editType,
                    'functionBody': parsedRule[0],
                    'result': parsedRule[1]
                };
                return this.getExecRulePromise(args);
            }.bind(this));
        };

        this.getEditRunPromise = function(year, type) {
            this.setRuleYear(year);
            var scopes = ['ts', 'lar', 'hmda'];
            return Promise.each(scopes, function(scope) {
                return this.runEdits(year, scope, type);
            }.bind(this))
            .cancellable();
        };

        this.getEditRunPromiseLar = function(year, type, lar) {
            this.setRuleYear(year);
            return this.runEditsLar(year, type, lar);
        };

        return this;
    };
})();

module.exports = RuleParseAndExec;
