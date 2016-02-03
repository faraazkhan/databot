"use strict";
var exports = module.exports = {};
var AWS = require('aws-sdk-promise');
var nameGenerator = require('./namegenerator');
var region = process.env.AWS_REGION || 'us-west-2';
var ec2 = new AWS.EC2( { region: region } );
var _ = require('lodash');

function tagInstance(params) {
  console.log("Promising to tag instance...");
  return ec2.createTags(params).promise();
}

function getPairingBoxImageId() {
  console.log("Getting paring box ami id...");
  var params = { Filters: [
    {
      Name: 'tag:Type',
      Values: ['pairingbox']
    }
  ],
  Owners: ['293837165564'] };

  //return ec2.describeImages(params).promise();
  return "ami-e8ea8688";
}

function selectSubnet() {
  console.log("Selecting Subnet...");
  var subnet = _.sample(['subnet-d34b99b6', 'subnet-fcdac8ba']);
  console.log("Selected " + subnet);
  return subnet;
}

function buildInstanceParams(data) {
  console.log("Building Instance params...");
  var params =   {
    ImageId: data,
    InstanceType: process.env.PAIRING_BOX_INSTANCE_SIZE || 'm3.large',
    MinCount: 1, MaxCount: 1,
    SubnetId: selectSubnet(),
    //UserData: 'STRING_VALUE',
    KeyName: 'wm-infrastructure',
    //SecurityGroups: ['sg-9a70aeff'],
    DryRun: true
  };
  console.log("Instance Params: " + JSON.stringify(params));
  return params;
}

function buildTags(data) {
  console.log("Building Tags..");
  var name = nameGenerator.configure({strategy: 'default'})();
  return { Resources: [req.instanceId], Tag:[
    {Key: 'Name', Value: name},
    {Key: 'Purpose', Value: 'pairing'}
  ]};
}

exports.createInstance = function () {
  console.log("Starting promises...");
  //return getPairingBoxImageId().then(
    //function(data) {
      //console.log(data);
      var instanceParams = buildInstanceParams(getPairingBoxImageId());
      var runInstancePromise = ec2.runInstances(instanceParams).promise();
      runInstancePromise.then(
        function(data) {
          console.log("Starting Instance Tagging...");
          tagInstance(buildTags(data)).then(
            function(req) { return req; },
            function(err) { return err; }
          );
        },
        function(err) { console.log(err); }
      )
    //},
    //function(err) {
      //return(err);
    //}
  //);
};


exports.controlInstance = function() {};

exports.listInstances = function() {};

exports.listPales = function() {};
