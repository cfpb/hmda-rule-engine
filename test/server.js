var shmock = require('shmock');

var mockAPI = shmock();

process.on('message', function(msg) {
    switch(msg.method) {
        case 'port':
            var port = mockAPI.address().port;
            var ob = {port: port};
            process.send(ob);
            break;
        case 'get':
            if (msg.persisted) {
                mockAPI.get(msg.path).persist().reply(msg.status, msg.reply);
            } else {
                mockAPI.get(msg.path).reply(msg.status, msg.reply);
            }
            break;
        case 'clean':
            mockAPI.clean();
            break;
    }
});