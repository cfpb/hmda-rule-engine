/* global -Promise */
/* global indexedDB:false */
'use strict';

var utils = require('./utils'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    levelup = require('level-browserify');

var EngineLocalDB = (function() {
    return function() {

        this.shouldUseLocalDB = function() {
            return this._USE_LOCAL_DB;
        };

        this.loadCensusData = function() {
            var paths = [
                'localdb/census/stateCountyTractMSA',
                'localdb/census/stateCountyTract',
                'localdb/census/stateCountyMSA',
                'localdb/census/stateCounty',
                'localdb/census/msaCodes'
            ];
            return Promise.each(paths, function(path) {
                return getLocalDataFromAPI.apply(this, [path]);
            }.bind(this));
        };

        var getLocalDataFromAPI = function(endpoint) {
            return this.apiGET(endpoint)
            .then(function(response) {
                return this.loadDB(utils.jsonParseResponse(response));
            }.bind(this));
        };

        this.resetDB = function() {
            return this.destroyDB()
            .then(function() {
                this._LOCAL_DB = levelup('hmda', {valueEncoding: 'json'});
                return this._LOCAL_DB;
            }.bind(this));
        };

        this.destroyDB = function() {
            var deferred = Promise.defer();

            var realDestroy = function() {
                /* istanbul ignore else */
                if (typeof levelup.destroy === 'function') {
                    levelup.destroy('hmda', function(err) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        this._LOCAL_DB = null;
                        deferred.resolve();
                    }.bind(this));
                } else {
                    var request = indexedDB.deleteDatabase('IDBWrapper-hmda');
                    request.onsuccess = function() {
                        this._LOCAL_DB = null;
                        deferred.resolve();
                    }.bind(this);
                    request.onerror = function(err) {
                        deferred.reject(err);
                    };
                }
            };
            if (this._LOCAL_DB && !this._LOCAL_DB.isClosed()) {
                this._LOCAL_DB.close(function(err) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    realDestroy.apply(this);
                }.bind(this));
            } else {
                realDestroy.apply(this);
            }
            return deferred.promise;
        };

        this.loadDB = function(data) {
            var deferred = Promise.defer();
            this._LOCAL_DB.batch(data, function(err) {
                if (err) {
                    return deferred.reject(err);
                }
                deferred.resolve();
            });
            return deferred.promise;
        };

        this.getCensusKey = function(censusparams) {
            var key = '/census',
                len = censusparams.length,
                tractIsNA = false,
                param,
                paramKey,
                paramValue;

            for (var i = 0; i < len; i++) {
                param = censusparams[i];
                paramKey = _.keys(param)[0];
                paramValue = param[paramKey];
                if (paramValue !== 'NA') {
                    key += '/' + paramKey + '/' + paramValue;
                }
                if (paramKey === 'tract') {
                    tractIsNA = paramValue === 'NA';
                }
            }
            return [key, tractIsNA];
        };

        this.localCensusComboValidation = function(censusparams, resultAsOb) {
            if (resultAsOb === undefined) {
                resultAsOb = false;
            }
            var deferred = Promise.defer(),
                key = this.getCensusKey(censusparams);

            this._LOCAL_DB.get(key[0], function(err, value) {
                if (err && err.notFound) {
                    value = {result: false};
                    if (resultAsOb) {
                        return deferred.resolve(value);
                    }
                    return deferred.resolve(false);
                }
                if (key[1] && value.small_county !== '1') {
                    if (resultAsOb) {
                        value.result = false;
                        return deferred.resolve(value);
                    }
                    return deferred.resolve(false);
                }
                if (resultAsOb) {
                    value.result = true;
                    return deferred.resolve(value);
                }
                deferred.resolve(true);
            });

            return deferred.promise;
        };

        this.localMSALookup = function(msaCode) {
            var deferred = Promise.defer(),
                key = '/census/msa_code/' + msaCode;

            this._LOCAL_DB.get(key, function(err, value) {
                if ((err && err.notFound) || msaCode === 'NA') {
                    return deferred.resolve();
                }
                deferred.resolve(value.msa_name);
            });
            return deferred.promise;
        };

        return this;
    };
})();

module.exports = EngineLocalDB;
