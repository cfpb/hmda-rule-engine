/* global -Promise */
/* global indexedDB:false */
'use strict';

var utils = require('./utils'),
    _ = require('underscore'),
    Promise = require('bluebird'),
    levelup = require('level-browserify');

var EngineLocalDB = (function() {
    return function() {

        this.shouldUseLocalDB = function() {
            return this._USE_LOCAL_DB;
        };

        this.loadCensusData = function() {
            return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyTractMSA'])
            .then(function() {
                return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyTract']);
            }.bind(this))
            .then(function() {
                return getLocalDataFromAPI.apply(this, ['localdb/census/stateCountyMSA']);
            }.bind(this))
            .then(function() {
                return getLocalDataFromAPI.apply(this, ['localdb/census/stateCounty']);
            }.bind(this))
            .then(function() {
                return getLocalDataFromAPI.apply(this, ['localdb/census/msaCodes']);
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
            if (this._LOCAL_DB) {
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

        this.localCensusComboValidation = function(censusparams, resultAsOb) {
            if (resultAsOb === undefined) {
                resultAsOb = false;
            }
            var deferred = Promise.defer();

            var key = '/census';
            var tract, paramsKey;

            for (var i = 0; i < censusparams.length; i++) {
                paramsKey = _.keys(censusparams[i])[0];
                if (censusparams[i] !== undefined && censusparams[i][paramsKey] !== 'NA') {
                    key += '/' + paramsKey + '/' + censusparams[i][paramsKey];
                }
                if (paramsKey === 'tract') {
                    tract = censusparams[i][paramsKey];
                }
            }
            this._LOCAL_DB.get(key, function(err, value) {
                if (err && err.notFound) {
                    value = {result: false};
                    if (resultAsOb) {
                        return deferred.resolve(value);
                    }
                    return deferred.resolve(false);
                }
                value.result = false;
                if (tract === 'NA' && value.small_county !== '1') {
                    if (resultAsOb) {
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
            var deferred = Promise.defer();

            var key = '/census/msa_code/' + msaCode;
            this._LOCAL_DB.get(key, function(err, value) {
                if ( (err && err.notFound) || msaCode === 'NA' ) {
                    return deferred.resolve(false);
                }
                deferred.resolve(value.msa_name);
            });
            return deferred.promise;
        };

        return this;
    };
})();


module.exports = EngineLocalDB;