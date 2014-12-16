/*jshint evil:true, maxcomplexity: 15*/
/*global window:false*/
'use strict';

var hmdajson = require('./lib/hmdajson'),
    _ = require('underscore'),
    brijSpec = require('brij-spec/validate');

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

    HMDAEngine.email_address = function(property) {
        var regex = /^[\w.]*\w+@\w+[\w.]*\w+\.\w+\s*$/;

        return regex.test(property);
    };

    HMDAEngine.zipcode = function(property) {
        var regex = /^\d{5}(?:\s*|-\d{4})$/;

        return regex.test(property);
    };

    HMDAEngine.yyyy_mm_dd_hh_mm_ss = function(property) {
        var regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
        var tokens = property.match(regex);

        if (tokens !== null) {
            var year = +tokens[1];
            var month = (+tokens[2] >= 1 && +tokens[2] <= 12) ? +tokens[2] - 1 : null;
            var day = (+tokens[3] >= 1 && +tokens[3] <= 31) ? +tokens[3] : null;
            var hours = (+tokens[4] >= 0 && +tokens[4] < 24) ? +tokens[4] : null;
            var minutes = (+tokens[5] >= 0 && +tokens[5] < 60) ? +tokens[5] : null;
            var seconds = (+tokens[6] >= 0 && +tokens[6] < 60) ? +tokens[6] : null;

            var date = new Date(year, month, day, hours, minutes, seconds);
            return (date.getFullYear() === year && date.getMonth() === month && date.getHours() === hours && date.getMinutes() === minutes && date.getSeconds() === seconds);
        }

        return false;
    };

    HMDAEngine.yyyy_mm_dd_hh_mm = function(property) {
        return HMDAEngine.yyyy_mm_dd_hh_mm_ss(property + '00');
    };

    HMDAEngine.yyyy_mm_dd = function(property) {
        return HMDAEngine.yyyy_mm_dd_hh_mm_ss(property + '000000');
    };

    HMDAEngine.mm_dd_yyyy = function(property) {
        var dateStr = property.slice(4,8) + property.slice(0,2) + property.slice(2,4) + property.slice(8);
        return HMDAEngine.yyyy_mm_dd(dateStr);
    };

    HMDAEngine.yyyy = function(property) {
        return HMDAEngine.yyyy_mm_dd(property + '0101');
    };

    HMDAEngine.hh_mm = function(property) {
        return HMDAEngine.yyyy_mm_dd_hh_mm('20140101' + property);
    };

    HMDAEngine.hh_mm_ss = function(property) {
        return HMDAEngine.yyyy_mm_dd_hh_mm_ss('20140101' + property);
    };

    HMDAEngine.matches_regex = function(property, regexStr) {
        try {
            var regex = new RegExp(regexStr);
            return regex.test(property);
        } catch (error) {
            return false;
        }
    };

    HMDAEngine.is_true = function(property) {
        return !!property;
    };

    HMDAEngine.is_false = function(property) {
        return !property;
    };

    HMDAEngine.in = function(property, values) {
        return _.contains(values, property);
    };

    HMDAEngine.not_in = function(property, values) {
        return ! _.contains(values, property);
    };

    HMDAEngine.contains = function(property, value) {
        if (_.isArray(property)) {
            return _.contains(property, value);
        }
        if (_.isString(property)) {
            return property.indexOf(value) !== -1;
        }
    };

    HMDAEngine.does_not_contain = function(property, value) {
        return ! _.contains(property, value);
    };

    HMDAEngine.includes_all = function(property, values) {
        return _.every(values, function(value) {
            return _.contains(property, value);
        });
    };

    HMDAEngine.includes_none = function(property, values) {
        return _.every(values, function(value) {
            return ! _.contains(property, value);
        });
    };

    HMDAEngine.is_integer = function(property) {
        return !isNaN(+property) && +property === parseInt(property);
    };

    HMDAEngine.is_float = function(property) {
        return !isNaN(+property) && +property !== parseInt(property);
    };

    HMDAEngine.equal = HMDAEngine.equal_property = function(property, value) {
        return property === value;
    };

    HMDAEngine.not_equal = HMDAEngine.not_equal_property = function(property, value) {
        return property !== value;
    };

    HMDAEngine.greater_than = HMDAEngine.greater_than_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property > +value;
    };

    HMDAEngine.less_than = HMDAEngine.less_than_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property < +value;
    };

    HMDAEngine.greater_than_or_equal = HMDAEngine.greater_than_or_equal_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property >= +value;
    };

    HMDAEngine.less_than_or_equal = HMDAEngine.less_than_or_equal_property = function(property, value) {
        return !isNaN(+property) && !isNaN(+value) && +property <= +value;
    };

    HMDAEngine.between = function(property, start, end) {
        return !isNaN(+property) && !isNaN(+start) && !isNaN(+end) && +property > +start && +property < +end;
    };

    HMDAEngine.starts_with = function(property, value) {
        return property.lastIndexOf(value, 0) === 0;
    };

    HMDAEngine.ends_with = function(property, value) {
        var position = property.length - value.length;
        var lastIndex = property.indexOf(value, position);
        return lastIndex !== -1 && lastIndex === position;
    };

    HMDAEngine.is_empty = function(property) {
        return property.trim() === '';
    };

    HMDAEngine.not_empty = function(property) {
        return property.trim() !== '';
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

    HMDAEngine.parseRule = function(rule, result) {
        if (rule.hasOwnProperty('condition')) {
            result.body += 'HMDAEngine.' + rule.condition + '(arguments[' + result.argIndex++ + ']';
            result.args.push(rule.property);
            var fields = brijSpec.VALID_CONDITIONS[rule.condition].additionalFields;
            if (fields) {
                if (HMDAEngine.ends_with(rule.condition, '_property')) {
                    result.body += ', arguments[' + result.argIndex++ + ']';
                    result.args.push(rule[fields[0]]);
                } else {
                    for (var i=0; i < fields.length; i++) {
                        result.body += ', ' + JSON.stringify(rule[fields[i]]);
                    }
                }
            }
            result.body += ')';
        }

        if (rule.hasOwnProperty('if')) {
            result.body += 'if (';
            HMDAEngine.parseRule(rule.if, result);
            result.body += ') { return ';
            HMDAEngine.parseRule(rule.then, result);
            result.body += '; } return false;';
        }

        if (rule.hasOwnProperty('and')) {
            for (var j=0; j < rule.and.length; j++) {
                HMDAEngine.parseRule(rule.and[j], result);
                if (j !== rule.and.length-1) {
                    result.body += ' && ';
                }
            }
        }

        if (rule.hasOwnProperty('or')) {
            for (var k=0; k < rule.or.length; k++) {
                HMDAEngine.parseRule(rule.or[k], result);
                if (k !== rule.or.length-1) {
                    result.body += ' || ';
                }
            }
        }
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
