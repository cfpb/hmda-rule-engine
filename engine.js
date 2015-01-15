/*jshint evil:true*/
/*global window:false*/
'use strict';

var hmdajson = require('./lib/hmdajson'),
    hmdaRuleSpec = require('hmda-rule-spec'),
    _ = require('underscore'),
    brijSpec = require('brij-spec');

var resolveArg = function(arg, contextList) {
    var tokens = arg.split('.');
    for (var i = 0; i < contextList.length; i++) {
        var mappedArg = contextList[i];

        for (var j = 0; j < tokens.length; j++) {
            mappedArg = mappedArg[tokens[j]];
            if (mappedArg === undefined) {
                break;
            }
        }

        if (mappedArg !== undefined) {
            return mappedArg;
        }
    }
    throw new Error('Failed to resolve argument!');
};

var retrieveProps = function(error, line, properties) {
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        error.properties[property] = resolveArg(property, [line]);
    }
};

var handleArrayErrors = function(hmdaFile, lines, properties) {
    var errors = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var error = {'properties': {}};
        error.lineNumber = line.toString();
        if (line === 1) {
            retrieveProps(error, hmdaFile.transmittalSheet, properties);
        } else {
            retrieveProps(error, hmdaFile.loanApplicationRegisters[line-2], properties);
        }
        errors.push(error);
    }
    return errors;
};

var handleUniqueLoanNumberErrors = function(counts) {
    var errors = [];
    var loanNumbers = _.keys(counts);
    for (var i = 0; i < loanNumbers.length; i++) {
        var loanNumber = loanNumbers[i];
        if (counts[loanNumber].length > 1) {
            var error = {'properties': {}};
            error.loanNumber = loanNumber;
            error.properties.lineNumbers = [];
            for (var j = 0; j < counts[loanNumber].length; j++) {
                error.properties.lineNumbers.push(counts[loanNumber][j].lineNumber);
            }
            errors.push(error);
        }
    }
    return errors;
};

(function() {

    // Set root (global) scope
    var root = this;

    root._HMDA_JSON = {};

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
     * Convenience
     * -----------------------------------------------------
     */
    HMDAEngine.getValidYears = function() {
        return hmdaRuleSpec.getValidYears();
    };

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
        var records = [];
        if (hmdaFile.transmittalSheet.recordID !== '1') {
            records.push(1);
        } else {
            for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
                if (hmdaFile.loanApplicationRegisters[i].recordID !== '2') {
                    records.push(hmdaFile.loanApplicationRegisters[i].lineNumber);
                }
            }
        }

        if (!records.length) {
            return true;
        }
        return handleArrayErrors(hmdaFile, records, ['recordID']);
    };

    HMDAEngine.hasAtLeastOneLAR = function(hmdaFile) {
        return hmdaFile.loanApplicationRegisters.length > 0;
    };

    HMDAEngine.isValidAgencyCode = function(hmdaFile) {
        var validAgencies = ['1', '2', '3', '5', '7', '9'];
        var records = [];

        if (! _.contains(validAgencies, hmdaFile.transmittalSheet.agencyCode)) {
            return handleArrayErrors(hmdaFile, [1], ['agencyCode']);
        }
        var tsAgencyCode = hmdaFile.transmittalSheet.agencyCode;
        for (var i=0; i < hmdaFile.loanApplicationRegisters.length; i++) {
            if (hmdaFile.loanApplicationRegisters[i].agencyCode !== tsAgencyCode) {
                records.push(hmdaFile.loanApplicationRegisters[i].lineNumber);
            }
        }
        if (!records.length) {
            return true;
        }
        return handleArrayErrors(hmdaFile, records, ['agencyCode']);
    };

    HMDAEngine.hasUniqueLoanNumbers = function(hmdaFile) {
        if (_.unique(hmdaFile.loanApplicationRegisters, _.iteratee('loanNumber')).length === hmdaFile.loanApplicationRegisters.length) {
            return true;
        }

        var counts = _.groupBy(hmdaFile.loanApplicationRegisters, function(lar) {
            return lar.loanNumber;
        });

        return handleUniqueLoanNumberErrors(counts);
    };

    HMDAEngine.isActionDateInActivityYear = function(actionDate, activityYear) {
        return HMDAEngine.yyyy_mm_dd(actionDate) && HMDAEngine.yyyy(activityYear) && activityYear === actionDate.slice(0,4);
    };

    /*
     * -----------------------------------------------------
     * Parsing
     * -----------------------------------------------------
     */

    HMDAEngine.fileToJson = function(file, year, next) {
        var spec = hmdaRuleSpec.getFileSpec(year);
        hmdajson.process(file, spec, function(err, result) {
            if (! err && result) {
                root._HMDA_JSON = result;
            }
            next(err, root._HMDA_JSON);
        });
    };

    HMDAEngine.parseRuleCustomCall = function(rule, result) {
        result.body += 'HMDAEngine.' + rule.function + '(';
        if (rule.args) {
            for (var i=0; i < rule.args.length; i++) {
                result.body += 'arguments[' + result.argIndex++ + ']';
                if (i !== rule.args.length-1) {
                    result.body += ', ';
                }
                result.args.push(rule.args[i]);
            }
        } else {
            result.body += 'arguments[' + result.argIndex++ + ']';
            result.args.push(rule.property);
        }
        result.body += ')';
    };

    HMDAEngine.parseRuleCondition = function(rule, result) {
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
    };

    HMDAEngine.parseRule = function(rule, result) {
        if (rule.hasOwnProperty('condition')) {
            if (rule.condition === 'call') {
                HMDAEngine.parseRuleCustomCall(rule, result);
            } else {
                HMDAEngine.parseRuleCondition(rule, result);
            }
        }

        if (rule.hasOwnProperty('if')) {
            result.body += '(';
            HMDAEngine.parseRule(rule.if, result);
            result.body += ' ? ';
            HMDAEngine.parseRule(rule.then, result);
            result.body += ' : true)';
        }

        if (rule.hasOwnProperty('and')) {
            result.body += '(';
            for (var i=0; i < rule.and.length; i++) {
                HMDAEngine.parseRule(rule.and[i], result);
                if (i !== rule.and.length-1) {
                    result.body += ' && ';
                }
            }
            result.body += ')';
        }

        if (rule.hasOwnProperty('or')) {
            result.body += '(';
            for (var j=0; j < rule.or.length; j++) {
                HMDAEngine.parseRule(rule.or[j], result);
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

    HMDAEngine.execRule = function(topLevelObj, rule) {
        var result = {
            argIndex: 0,
            args: [],
            body: '',
            properties: {}
        };

        HMDAEngine.parseRule(rule, result);
        result.body = 'return ' + result.body + ';';

        var args = _.map(result.args, function(arg) {
            if (typeof(arg) === 'string') {
                var contextList = [topLevelObj, root._HMDA_JSON.hmdaFile !== undefined ? root._HMDA_JSON.hmdaFile : {}];        // Context list to search
                return resolveArg(arg, contextList);
            } else {
                return arg;
            }
        });

        var funcResult = new Function(result.body).apply(null, args);

        if (funcResult === true) {
            return [];
        }

        if (topLevelObj.hmdaFile) {
            return funcResult;
        } else {
            var error = {'properties': {}};

            error.lineNumber = topLevelObj.lineNumber;

            for (var i = 0; i < args.length; i++) {
                error.properties[result.args[i]] = args[i];
            }

            return [error];
        }
    };

}.call((function() {
  return (typeof module !== 'undefined' && module.exports &&
    typeof window === 'undefined') ? global : window;
}())));
