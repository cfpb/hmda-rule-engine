'use strict';

var TYPES = require('./filerecordtypes').types;

/**
 * Validator for file specifications
 * @constructs FileSpecValidator
 */
var FileSpecValidator = function() {
};

/**
 * Validate a file specification object
 * @param  {object} file_spec   {@link https://github.com/cfpb/hmda-rule-spec|The file specification object}
 * @return {string}             An error string describing what failed during validation
 */
FileSpecValidator.prototype.validate = function(file_spec) {
    for (var idx = 0; idx < TYPES.length; idx++) {
        var type = TYPES[idx];
        if (!file_spec.hasOwnProperty(type)) {
            return 'Missing required definition for ' + type + ' in file specification';
        }
        for (var field in file_spec[type]) {
            if (!file_spec[type][field].hasOwnProperty('start')) {
                return 'Field "' + field + '" in ' + type + ' missing required "start" property';
            }
            if (!file_spec[type][field].hasOwnProperty('end')) {
                return 'Field "' + field + '" in ' + type + ' missing required "end" property';
            }
            if (!file_spec[type][field].hasOwnProperty('dataType')) {
                return 'Field "' + field + '" in ' + type + ' missing required "dataType" property';
            }
        }
    }
    return null;
};

module.exports = new FileSpecValidator();
