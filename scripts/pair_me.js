module.exports = function(robot) {
  var ec2Helper = require('../lib/ec2helper');
  var nameGenerator = require('../lib/namegenerator');
  robot.respond(/pair me/i, function(res) {
    msg = ec2Helper.createInstance().then(
      function(req) { res.send(req) } ,
      function(err) { res.send(err) }
    );
  });
};

