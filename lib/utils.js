'use strict';
/* global -Promise */

var _ = require('lodash'),
    Promise = require('bluebird');

var jsonParseResponse = function(response) {
    return JSON.parse(response);
};

var resultBodyAsError = function(response) {
    var result = jsonParseResponse(response);
    if (result.result) {
        return true;
    } else {
        delete result.result;
        return [{'properties': result}];
    }
};

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
    var err = new Error('Failed to resolve argument!');
    err.property = arg;
    throw err;
};

var retrieveProps = function(error, line, properties) {
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        error.properties[property] = resolveArg(property, [line]);
    }
};

var getParsedRule = function(rule) {
    var functionBody,
        result = {
            argIndex: 0,
            args: [],
            funcs: [],
            spreads: [],
            body: '',
            properties: {}
        };

    this.parseRule(rule, result);
    if (result.funcs.length > 1) {
        functionBody = 'return Promise.join(';
        functionBody += result.funcs.join(',');
        functionBody += ', function(';
        functionBody += result.spreads.join(',');
        functionBody += ') { return ' + result.body + ' });';
    } else {
        functionBody = 'return Promise.resolve(' + result.funcs[0] + ');';
    }

    return [functionBody, result];
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
            var lar = hmdaFile.loanApplicationRegisters[line - 2];
            retrieveProps(error, lar, properties);
            if (lar.hasOwnProperty('loanNumber')) {
                error.loanNumber = lar.loanNumber;
            }
            if (lar.hasOwnProperty('universalLoanID')) {
                error.universalLoanID = lar.universalLoanID;
            }
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
            var error = {'properties': { 'loanNumber': loanNumber }};
            var lineNumbers = [];
            for (var j = 0; j < counts[loanNumber].length; j++) {
                lineNumbers.push(counts[loanNumber][j].lineNumber);
            }
            error.lineNumber = lineNumbers.join(', ');
            errors.push(error);
        }
    }
    return errors;
};

var resolveError = function(err) {
    if (err.message && err.message === 'Failed to resolve argument!') {
        return Promise.reject(new Error('Rule-spec error: Invalid property\nProperty: ' + err.property + ' not found!')).cancellable();
    } else if (err.message && err.message === 'connect ECONNREFUSED') {
        return Promise.reject(new Error('There was a problem connecting to the HMDA server. Please check your connection or try again later.')).cancellable();
    } else {
        return Promise.reject(err).cancellable();
    }
};

var addToErrors = function(newErrors, rule, editType, scope) {
    if (this.errors[editType][rule.id] === undefined) {
        this.errors[editType][rule.id] = {
            'description': rule.description,
            'explanation': rule.explanation,
            'scope': scope,
            'errors': []
        };
    }

    for (var i = 0; i < newErrors.length; i++) {
        this.errors[editType][rule.id].errors.push(newErrors[i]);
    }
};

var promiseResultName = function(promises) {
    return 'promise' + promises.length + 'result';
};

module.exports = {
    jsonParseResponse: jsonParseResponse,
    resultBodyAsError: resultBodyAsError,
    resolveArg: resolveArg,
    retrieveProps: retrieveProps,
    getParsedRule: getParsedRule,
    handleArrayErrors: handleArrayErrors,
    handleUniqueLoanNumberErrors: handleUniqueLoanNumberErrors,
    resolveError: resolveError,
    addToErrors: addToErrors,
    promiseResultName: promiseResultName
};
