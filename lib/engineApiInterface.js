/* global -Promise */
'use strict';

var superagent = require('superagent'),
    Promise = require('bluebird'),
    _ = require('lodash');

var EngineApiInterface = (function() {
    return function() {

        /**
         * A Promised GET request
         * @param  {string}  url The URL to use in a GET request
         * @return {Promise}     A {@link https://github.com/petkaantonov/bluebird|Promise} for a response body
         */
        this.apiGET = function(funcName, params) {

            var url = this.apiURL + '/' + funcName + '/' + this.currentYear;
            if (params !== undefined && _.isArray(params) && params.length) {
                url += '/' + params.join('/');
            }

            var deferred = Promise.defer();

            superagent
                .get(url)
                .end(function(err, res) {
                    if (res && res.statusCode >= 300) {
                        return deferred.reject(new Error('Server responded with status code ' + res.statusCode + ' for url ' + url));
                    }

                    if (err) {
                        return deferred.reject(err);
                    }
                    deferred.resolve(res.text);
                });

            return deferred.promise;
        };

        return this;
    };
})();

module.exports = EngineApiInterface;
