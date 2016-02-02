var exports = module.exports = {};
var AWS = require('aws-sdk-promise');
var nameGenerator = require('./namegenerator');
var ec2 = new AWS.EC2( { region: 'us-west-2' } );

exports.createInstance = function () {

  instanceParams = {
    ImageId: process.env['PAIRING_BOX_AMI_ID'] || 'ami-e8ea8688',
    InstanceType: process.env['PAIRING_BOX_INSTANCE_SIZE'] || 'm3.large',
    MinCount: 1, MaxCount: 1
  };

  return ec2.runInstances(instanceParams).promise().then(

    function(req) {
      console.log("Created instance " + req);
      name = nameGenerator.configure({strategy: 'default'})();
      params = { Resources: [req.instanceId], Tag:[
        {Key: 'Name', Value: name},
        {Key: 'Purpose', Value: 'pairing'}
      ]};
      tagInstance.then(
        function(req) { return req },
        function(err) { return err }
      );
    },
    function(error) {

      return "There was a problem creating the instance..."

    }
  );
};

function tagInstance(params) {

  ec2.createTags(params).promise().then(

    function(req) {

      return "Instance was created successfully"

    },

    function(err) {

      return "There was a problem tagging the instance..."

    }
  )
};

