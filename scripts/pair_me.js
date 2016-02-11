module.exports = function(robot) {
  var pairingBox = require('../lib/pairingbox'),
  _ = require('lodash'),
  respondSuccess,
  reportError;

  respondSuccess = function(req, res) {
    res.send(req.announcement);
    if (req.status === 'success' && req.message ) { res.reply(req.message); }
  };

  reportError = function(err, res) {
    res.send(err.announcement);
  };

  robot.respond(/pair me(?:\susing\s(.+))?$/i, function(res) {
    var requestor = res.message.user,
        profile = res.match[1] || 'general';
    pairingBox.create({ requestor: requestor.name, profile: profile }).then(
      _.partialRight(respondSuccess, res))
      .catch(_.partialRight(reportError, res));
  });

  robot.respond(/pair (start|stop|nuke) ([\w-]+)$/i, function(res) {
    var requestor = res.message.user,
        action = res.match[1],
        instance = res.match[2];
    pairingBox.control({action: action, instanceName: instance}).then(
      _.partialRight(respondSuccess, res))
      .catch(_.partialRight(reportError, res));
  });


  robot.respond(/pair list$/i, function(res) {
    pairingBox.list().then(
      _.partialRight(respondSuccess, res))
      .catch(_.partialRight(reportError, res));
  });

  robot.respond(/pair stales$/i, function(res) {
    pairingBox.stales().then(
      _.partialRight(respondSuccess, res))
      .catch(_.partialRight(reportError, res));
  });

  robot.respond(/pair hangout ([\w-]+)$/i, function(res) {
    pairingBox.hangout({ instanceName: res.match[1] }).then(
      _.partialRight(respondSuccess, res))
      .catch(_.partialRight(reportError, res));
  });
};
