/*
 * This will bootstrap our test environment
 */

global.expect = require('must');
global.rewire = require('rewire');
global._ = require('lodash');
global.port = 0;

var child = require('child_process').fork(__dirname + '/server.js');

global.mockAPI = function(method, path, status, reply, persisted) {
    var ob = {
        method: method || 'get',
        path: path || '/',
        status: status || 200,
        reply: reply || '{}',
        persisted: persisted || false
    }
    child.send(ob);
};

before(function(done) {
    mockAPI('port');
    child.on('message', function(m) {
        if (m.hasOwnProperty('port')) {
            port = m.port;
            done();
        };
    });
});

after(function() {
    child.kill();
});
