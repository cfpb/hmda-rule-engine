/* global -Promise */
'use strict';

var _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    hmdaRuleSpec = require('hmda-rule-spec');

var RuleProgress = (function() {
    return function() {

        /**
         * calculates the estimate for the number of parsedRules that will need to be executed
         * @param  {year}  which year to use for the rule spec
         * @param  {scopeList}  an array containing the scoped specs to look up for this edit type
         * @param  {type}  the type of HMDA edits (syntactical, validity, etc.)
         */
        this.calcEstimatedTasks = function(year, scopeList, type) {
            var scopeLen = scopeList.length;
            for (var i = 0; i < scopeLen; i++) {
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
            var percent = Math.floor(++this.progress.count / this.progress.estimate * 100);
            if (percent <= 100) {
                this.progress.events.emit('progressStep', percent);
            }
            return;
        };

        this.initProgress = function() {
            this.progress =  {
                events: new EventEmitter(),
                count: 0,
                estimate: 0
            };
        };

        /**
         * clears out the counts and estimates for the progress object
         */
        this.clearProgress = function() {
            this.progress.count = 0;
            this.progress.estimate = 0;
        };

        /**
         * Get the progress object used for task completion events displayed on the progress bar
         * @return {object} Progress object containing an eventemitter for progress notification
         */
        this.getProgress = function() {
            return this.progress;
        };

        return this;
    };
})();

module.exports = RuleProgress;
