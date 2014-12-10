/*global window:false*/
'use strict';

var hmdajson = require('./lib/hmdajson'),
    _ = require('underscore');

(function() {

    // Set root (global) scope
    var root = this;

    root._HMDA_JSON = null;

    // Constructor of our HMDAEngine
    var HMDAEngine = function(obj) {
        if (obj instanceof HMDAEngine) {
            return obj;
        }
        if (!(this instanceof HMDAEngine)) {
            return new HMDAEngine(obj);
        }
    };

    // Set the HMDAEngine as either the exported module for
    // CommonJS (node) or on the root scope (for browsers)
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = HMDAEngine;
        }
        exports.HMDAEngine = HMDAEngine;
    }
    root.HMDAEngine = HMDAEngine;

    /*
     * -----------------------------------------------------
     * Condition Functions
     * -----------------------------------------------------
     */

    HMDAEngine.is_true = function(property) {
        return !!property;
    };
    HMDAEngine.is_false = function(property) {
        return !property;
    };

    HMDAEngine.is_integer = function(property) {
        return !isNaN(+property) && +property === parseInt(property);
    };

    HMDAEngine.is_float = function(property) {
        return !isNaN(+property) && +property !== parseInt(property);
    };

    HMDAEngine.equal = function(property, value) {
        return property === value;
    };

    HMDAEngine.equal_property = function(first, second) {
        return first === second;
    };

    HMDAEngine.not_equal = function(property, value) {
        return property !== value;
    };

    HMDAEngine.not_equal_property = function(first, second) {
        return first !== second;
    };

    HMDAEngine.greater_than = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property > +value;
    };

    HMDAEngine.greater_than_property = function(first, second) {
        return !isNaN(+first) && !isNaN(+second) && +first > +second;
    };

    HMDAEngine.less_than = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property < +value;
    };

    HMDAEngine.less_than_property = function(first, second) {
        return !isNaN(+first) && !isNaN(+second) && +first < +second;
    };

    HMDAEngine.greater_than_or_equal = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property >= +value;
    };

    HMDAEngine.greater_than_or_equal_property = function(first, second) {
        return !isNaN(+first) && !isNaN(+second) && +first >= +second;
    };

    HMDAEngine.less_than_or_equal = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property <= +value;
    };

    HMDAEngine.less_than_or_equal_property = function(first, second) {
        return !isNaN(+first) && !isNaN(+second) && +first <= +second;
    };

    HMDAEngine.hasRecordIdentifiersForEachRow = function(hmdaFile) {
        if (hmdaFile.transmittalSheet.recordID !== '1') {
            return false;
        } else {
            for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
                if (hmdaFile.loanApplicationRegisters[i].recordID !== '2') {
                    return false;
                }
            }
        }
        return true;
    };

    HMDAEngine.hasAtLeastOneLAR = function(hmdaFile) {
        return hmdaFile.loanApplicationRegisters.length > 0;
    };

    HMDAEngine.isValidAgencyCode = function(hmdaFile) {
        var validAgencies = [1, 2, 3, 5, 7, 9];
        if (! _.contains(validAgencies, hmdaFile.transmittalSheet.agencyCode)) {
            return false;
        } else {
            var tsAgencyCode = hmdaFile.transmittalSheet.agencyCode;
            for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
                if (hmdaFile.loanApplicationRegisters[i].agencyCode !== tsAgencyCode) {
                    return false;
                }
            }
        }
        return true;
    };

    HMDAEngine.hasUniqueLoanNumbers = function(hmdaFile) {
        return _.unique(hmdaFile.loanApplicationRegisters, _.iteratee('loanNumber')).length === hmdaFile.loanApplicationRegisters.length;
    };


    /*
     * -----------------------------------------------------
     * Parsing
     * -----------------------------------------------------
     */

    HMDAEngine.fileToJson = function(file, spec, next) {
        hmdajson.process(file, spec, function(err, result) {
            if (! err && result) {
                root._HMDA_JSON = result;
            }
            next(err, root._HMDA_JSON);
        });
    };

    /*
     * -----------------------------------------------------
     * Rule Execution
     * -----------------------------------------------------
     */

    // TODO

}.call((function() {
  return (typeof module !== 'undefined' && module.exports &&
    typeof window === 'undefined') ? global : window;
}())));
