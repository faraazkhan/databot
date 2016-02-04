module.exports = function(robot) {
  var pairingBox = require('../lib/pairingbox');
  var nameGenerator = require('../lib/namegenerator');
  robot.respond(/pair me/i, function(res) {
    msg = pairingBox.create();
    res.send(msg);
  });
};

