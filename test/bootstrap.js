/*
 * This will bootstrap our test environment
 */

global.expect = require('must');
global.rewire = require('rewire');
global._ = require('underscore');
global.port = 0;

var child = require('child_process').fork(__dirname + '/server.js');

global.mockAPI = function(method, path, status, reply) {
    var ob = {
        method: method || '',
        path: path || '',
        status: status || 200,
        reply: reply || ''
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