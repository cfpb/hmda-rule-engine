'use strict';

var TYPES = require('./filerecordtypes');

var FileSpecValidator = function() {
    return {
        validate: function(file_spec) {
            for ( var idx=0; idx<TYPES.length; idx++) {
                var type = TYPES[idx];
                if (! file_spec.hasOwnProperty(type)) {
                    return 'Missing required definition for ' + type + ' in file specification';
                }
                for (var field in file_spec[type]) {
                    if (! file_spec[type][field].hasOwnProperty('start')) {
                        return 'Field "' + field + '" in ' + type + ' missing required "start" property';
                    }
                    if (! file_spec[type][field].hasOwnProperty('end')) {
                        return 'Field "' + field + '" in ' + type + ' missing required "end" property';
                    }
                    if (! file_spec[type][field].hasOwnProperty('dataType')) {
                        return 'Field "' + field + '" in ' + type + ' missing required "dataType" property';
                    }
                }
            }
            return null;
        },
    };

};

module.exports = new FileSpecValidator();
