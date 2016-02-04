'use strict';
var exports = module.exports = {};
var awsPromised = require('aws-promised');
var region = process.env.AWS_REGION || 'us-west-1';
var ec2 = awsPromised.ec2({region: region});
var _ = require('lodash');
var fs = require('fs');
var general = require('./names/general');
var metal = require('./names/metal');
var nameGenerator = require('./namegenerator');
var globalParams = {};

function userData(hostname) {
  var temp = _.template(fs.readFileSync(__dirname + '/templates/user_data'));
  var data = temp({hostname: hostname});
  var encodedUserData = new Buffer(data).toString('base64')
  return encodedUserData;
}

function selectSubnet() {
  var subnet = _.sample(['subnet-d34b99b6', 'subnet-fcdac8ba']);
  return subnet;
}

function runInstance(imageAttrs) {
  var imageId = imageAttrs.Images[0].ImageId;
  globalParams.hostname = nameGenerator.configure({strategy: general})();
  var params = {
    ImageId: imageId,
    InstanceType: process.env.PAIRING_BOX_INSTANCE_SIZE || 'm3.large',
    MinCount: 1, MaxCount: 1,
    SubnetId: selectSubnet(),
    UserData: userData(globalParams.hostname),
    KeyName: 'wm-infrastructure',
    SecurityGroupIds: ['sg-9a70aeff'],
    DryRun: false
  };
  return ec2.runInstancesPromised(params);
}


function buildTags(instanceId, hostname, requestor) {
  return { Resources: [instanceId], Tags:[
    {Key: 'Name', Value: hostname},
    {Key: 'Purpose', Value: 'pairing'},
    {Key: 'Requestor', Value: requestor}
  ]};
}


function tagInstance(runInstanceAttrs) {
  globalParams.instanceId = runInstanceAttrs.Instances[0].InstanceId;
  globalParams.ipAddress = runInstanceAttrs.Instances[0].PrivateIpAddress;
  var tags = buildTags(globalParams.instanceId, globalParams.hostname, globalParams.requestor);
  return ec2.createTagsPromised(tags);
}

function sendResponse() {
  var response = {};
  var announcement = _.template(fs.readFileSync(__dirname + '/templates/announce_run_instance'));
  var message = _.template(fs.readFileSync(__dirname + '/templates/instance_create_message'));
  response.announcement = announcement({hostname: globalParams.hostname, profile: 'general'});
  response.message = message({hostname: globalParams.hostname, ip: globalParams.ipAddress, requestor: globalParams.requestor})
  response.status = 'success';
  return response;
}

function reportError() {
  var response = {};
  response.status = 'error';
  return "There was a problem creating your instance..."
}

exports.create = function(requestParams) {
  globalParams = {};
  globalParams.requestor = "Faraaz";
  var params = { Filters: [
    {
      Name: 'tag:Type',
      Values: ['pairingbox']
    }
  ],
  Owners: ['293837165564']
  };

  return ec2
  .describeImagesPromised(params)
  .then(runInstance)
  .then(tagInstance)
  .then(sendResponse)
  .catch(console.error);
};
