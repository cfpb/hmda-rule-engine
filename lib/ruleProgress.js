/* global -Promise */
'use strict';

var _ = require('underscore'),
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
            switch (type) {
                default:
                    _.each(scopeList, function(scope) {
                        var rules = hmdaRuleSpec.getEdits(year, scope, type);
                        if (scope==='lar' || type==='special') {
                            this.progress.estimate += this.getHmdaJson().hmdaFile.loanApplicationRegisters.length * 
                                rules.length;
                        } else if (type==='macro') {
                            // apply 99% confidence interval based off normal distribution curve calculated from 5 sample banks
                            var upperbound = 1.69;
                            this.progress.estimate += Math.floor(this.getHmdaJson().hmdaFile.loanApplicationRegisters.length * 
                                rules.length * upperbound);
                        }
                        else {
                            this.progress.estimate += rules.length;
                        }
                    }.bind(this));
            }
            this.progress.throttle = Math.floor(this.progress.estimate/100);
            this.progress.count = 0;
        };


        /**
         * sends a notification message with the percentage of tasks completed/estimate
         * @param  {count}  optional parameter indicating a large jump in tasks completed
         */
        this.postTaskCompletedMessage = function(count) {
            if (count === undefined) {
                this.progress.count ++;
            } else {
                this.progress.count += count;
            }
            if (this.progress.count % this.progress.throttle === 0) {
                this.progress.events.emit('progressStep', 
                    Math.floor(this.progress.count/this.progress.throttle));
                return;
            } 
            return false;
        };

        return this;
    };
})();

module.exports = RuleProgress;