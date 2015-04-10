/* global -Promise */
'use strict';

var _ = require('lodash'),
    hmdaRuleSpec = require('hmda-rule-spec');

var RuleProgress = (function() {
    return function() {

        /**
         * calculates the estimate for the number of parsedRules that will need to be executed
         * @param  {year}  which year to use for the rule spec
         * @param  {scopeList}  an array containing the scoped specs to look up for this edit type
         * @param  {type}  the type of HMDA edits (syntactical, validity, etc.)
         */
        this.calcEstimatedTasks = function (year, scopeList, type) {
            var scopeLen = scopeList.length;
            for (var i=0; i < scopeLen; i++) {
                var scope = scopeList[i],
                    rules = hmdaRuleSpec.getEdits(year, scope, type),
                    rulesLen = rules.length;
                this.progress.estimate += rulesLen;
            }
            this.progress.count = 0;
        };


        /**
         * sends a notification message with the percentage of tasks completed/estimate
         */
        this.postTaskCompletedMessage = function() {
            this.progress.events.emit('progressStep',
                    Math.floor(++this.progress.count/this.progress.estimate*100));
            return;
        };

        return this;
    };
})();

module.exports = RuleProgress;