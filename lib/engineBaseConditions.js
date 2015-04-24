'use strict';

var _ = require('lodash'),
    moment = require('moment');

var EngineBaseConditions = (function() {
    return function() {
        this.email_address = function(property) {
            var regex = /^[\w.]*\w+@\w+[\w.]*\w+\.\w+\s*$/;

            return regex.test(property);
        };

        this.zipcode = function(property) {
            var regex = /^\d{5}(?:\s*|-\d{4})$/;

            return regex.test(property);
        };

        this.yyyy_mm_dd_hh_mm_ss = function(property) {
            return moment(property, 'YYYYMMDDHHmmss', true).isValid();
        };

        this.yyyy_mm_dd_hh_mm = function(property) {
            return moment(property, 'YYYYMMDDHHmm', true).isValid();
        };

        this.yyyy_mm_dd = function(property) {
            return moment(property, 'YYYYMMDD', true).isValid();
        };

        this.mm_dd_yyyy = function(property) {
            return moment(property, 'MMDDYYYY', true).isValid();
        };

        this.yyyy = function(property) {
            return moment(property, 'YYYY', true).isValid();
        };

        this.hh_mm = function(property) {
            return moment(property, 'HHmm', true).isValid();
        };

        this.hh_mm_ss = function(property) {
            return moment(property, 'HHmmss', true).isValid();
        };

        this.matches_regex = function(property, regexStr) {
            try {
                var regex = new RegExp(regexStr);
                return regex.test(property);
            } catch (error) {
                return false;
            }
        };

        this.is_true = function(property) {
            return !!property;
        };

        this.is_false = function(property) {
            return !property;
        };

        this.in = function(property, values) {
            return _.contains(values, property);
        };

        this.not_in = function(property, values) {
            return !_.contains(values, property);
        };

        this.contains = function(property, value) {
            if (_.isArray(property)) {
                return _.contains(property, value);
            }
            if (_.isString(property)) {
                return property.indexOf(value) !== -1;
            }
        };

        this.does_not_contain = function(property, value) {
            return !_.contains(property, value);
        };

        this.includes_all = function(property, values) {
            return _.every(values, function(value) {
                return _.contains(property, value);
            });
        };

        this.includes_none = function(property, values) {
            return _.every(values, function(value) {
                return !_.contains(property, value);
            });
        };

        this.is_integer = function(property) {
            return !isNaN(+property) && +property === parseInt(property);
        };

        this.is_float = function(property) {
            return !isNaN(+property) && +property !== parseInt(property);
        };

        this.equal = this.equal_property = function(property, value) {
            return property === value;
        };

        this.not_equal = this.not_equal_property = function(property, value) {
            return property !== value;
        };

        this.greater_than = this.greater_than_property = function(property, value) {
            return !isNaN(+property) && !isNaN(+value) && +property > +value;
        };

        this.less_than = this.less_than_property = function(property, value) {
            return !isNaN(+property) && !isNaN(+value) && +property < +value;
        };

        this.greater_than_or_equal = this.greater_than_or_equal_property = function(property, value) {
            return !isNaN(+property) && !isNaN(+value) && +property >= +value;
        };

        this.less_than_or_equal = this.less_than_or_equal_property = function(property, value) {
            return !isNaN(+property) && !isNaN(+value) && +property <= +value;
        };

        this.between = function(property, start, end) {
            return !isNaN(+property) && !isNaN(+start) && !isNaN(+end) && +property > +start && +property < +end;
        };

        this.starts_with = function(property, value) {
            return property.lastIndexOf(value, 0) === 0;
        };

        this.ends_with = function(property, value) {
            var position = property.length - value.length;
            var lastIndex = property.indexOf(value, position);
            return lastIndex !== -1 && lastIndex === position;
        };

        this.is_empty = function(property) {
            return property.trim() === '';
        };

        this.not_empty = function(property) {
            return property.trim() !== '';
        };

        return this;
    };
})();

module.exports = EngineBaseConditions;
