module.exports = function(robot) {
  'use strict';
  var pairingBox = require('../lib/pairingbox');
  robot.respond(/pair me/i, function(res) {
    var requestor = res.message.user.name;
    var msg = pairingBox.create(requestor);
    res.send(msg.announcement);
    if (msg.status === 'success') { robot.send({user: {name: requestor}}, msg.message);}
  });
};
