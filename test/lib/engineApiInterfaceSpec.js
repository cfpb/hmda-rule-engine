/*global describe:false*/
/*global it:false*/
/*global expect:false*/
/*global beforeEach:false*/
/*global _:false*/
/*global mockAPI:false*/
/*global before:false*/
/*global port:false*/

'use strict';

var EngineApiInterface = require('../../lib/engineApiInterface'),
    jsonParseResponse = require('../../lib/utils').jsonParseResponse,
    Engine = function() {},
    engine;

EngineApiInterface.call(Engine.prototype);

describe('EngineApiInterface', function() {

    before(function(done) {
        engine = new Engine();
        engine.currentYear = '';
        engine.apiURL = 'http://localhost:' + port;
        done();
    });

    describe('apiGET', function() {

        it('should return response that can be parsed as JSON', function(done) {
            mockAPI('get', '/foobar', 200, '{"foo":"bar"}');
            engine.apiGET('foobar')
            .then(function(response) {
                var result = jsonParseResponse(response);
                expect(result).to.have.property('foo');
                expect(result.foo).to.be('bar');
                done();
            });
        });

        it('should reject with 404', function(done) {
            mockAPI('get', '/404', 404, '');
            engine.apiGET('404')
            .catch(function(err) {
                expect(err.message).to.be('Server responded with status code 404 for url http://localhost:' + port + '/404/');
                done();
            });
        });
    });

});
