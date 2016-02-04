module.exports = function(robot) {
  'use strict';
  var pairingBox = require('../lib/pairingbox');
  robot.respond(/pair me/i, function(res) {
    var requestor = res.message.user.name;
    pairingBox.create(requestor).then(
      function(req) {
        res.send(req.announcement);
        //console.log("RESPONSE____" + JSON.stringify(req));
        if (req.status === 'success') { robot.send({user: {name: requestor}}, req.message);}
      },
      function(err) {
        res.send(err.announcement);
      }
    );
  });
};
