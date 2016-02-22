'use strict';
var exports = module.exports = {},
    awsPromised = require('aws-promised'),
    region = process.env.AWS_REGION || 'us-west-1',
    _ = require('lodash'),
    fs = require('fs'),
    general = require('./names/general'),
    metal = require('./names/metal'),
    Promise = require('bluebird'),
    nameGenerator = require('./namegenerator'),
    moment = require('moment'),
    Table = require('cli-table2');
var ec2 = awsPromised.ec2({region: region});

function userData(hostname) {
  var temp, data;
  temp = _.template(fs.readFileSync(__dirname + '/templates/user_data'));
  data = temp({hostname: hostname});
  return new Buffer(data).toString('base64');
}

function selectSubnet() {
  var subnet = _.sample(['subnet-d34b99b6', 'subnet-fcdac8ba']);
  return subnet;
}

function runInstance(imageAttrs, state) {
  var strategy, imageId, params;
  strategy = state.profile === 'metal' ? metal : general;
  state.hostname = nameGenerator.configure({strategy: strategy})();
  imageId = imageAttrs.Images[0].ImageId,
    params = {
      ImageId: imageId,
      InstanceType: process.env.PAIRING_BOX_INSTANCE_SIZE || 'm3.large',
      MinCount: 1, MaxCount: 1,
      SubnetId: selectSubnet(),
      UserData: userData(state.hostname),
      KeyName: process.env.KEY_PAIR_NAME || 'wm-infrastructure',
      SecurityGroupIds: process.env.SECURITY_GROUP_ID || ['sg-9a70aeff'],
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


function tagInstance(runInstanceAttrs, state) {
  state.instanceId = runInstanceAttrs.Instances[0].InstanceId;
  state.ipAddress = runInstanceAttrs.Instances[0].PrivateIpAddress;
  var tags = buildTags(state.instanceId, state.hostname, state.requestor);
  return ec2.createTagsPromised(tags);
}

function sendResponse(attrs, state) {
  var response = {};
  state.attrs = attrs;
  _({ announcement: state.announceTemplate, message: state.messageTemplate }).forEach(function(file, type){
    var filePath = __dirname + '/templates/' + file;
    if (fs.existsSync(filePath)) {
      var template = _.template(fs.readFileSync(filePath));
      response[type] = template({temp: state});
    };
  });
  response.status = 'success';
  return response;
}

function reportError(error, state) {
  var response = {};
    response.status = 'error';
    console.log(error);
    response.announcement = "There was a problem with your request...";
    return response;
  }

  function getInstanceIds(instanceName) {
    var params = {
          Filters: [
            {
              Name: 'tag:Purpose',
              Values: ['pairing']
            },
            {
              Name: 'tag:Name',
              Values: [instanceName]
            }
          ]
        };
    return ec2.describeInstancesPromised(params);
  }

  function startInstance(attrs, state) {
    return runStartInstance(attrs)
    .catch(console.error);
  }

  function stopInstance(attrs, state) {
    return runStopInstance(attrs)
    .catch(console.error);
  }

  function nukeInstance(attrs, state) {
    return runNukeInstance(attrs)
    .catch(console.error);
  }

  function runStartInstance(ec2Response) {
    return ec2.startInstancesPromised(instanceParams(ec2Response.Reservations));
  }

  function runStopInstance(ec2Response) {
    var params = {};
    return ec2.stopInstancesPromised(instanceParams(ec2Response.Reservations))
           .then(ec2.waitForPromised('instanceStopped', params));
  }

  function runNukeInstance(ec2Response) {
    return ec2.terminateInstancesPromised(instanceParams(ec2Response.Reservations));
  }

  function instanceParams(reservations) {
    return { InstanceIds: [reservations[0].Instances[0].InstanceId] };
  }

  function listInstances() {
    var params = { Filters: [
        {
          Name: 'tag:Purpose',
          Values: ['pairing']
        }
      ]
    };

    return ec2.describeInstancesPromised(params);
  }

  function isStale(reservation) {
    return instanceAge(reservation) < -2; // more than 2 days since launch
  }

  function launchTimeForReservation(reservation) {
    return moment(reservation.Instances[0].LaunchTime);
  }

  function filterInstancesList(instancesList, state) {
    var reservations = instancesList.Reservations;
    instancesList.Reservations = reservations.filter(isStale);
    return(instancesList);
  }

  function daysSince(startTime) {
    var duration = moment.duration(startTime.diff(moment(Date.now())));
    return duration.asDays();
  }

  function parseInstancesList(instancesList, state) {
    instancesList.Reservations = listTableFor(instancesList.Reservations, state);
    return(instancesList);
  }

  function sort(instancesList) {
    var sortedByState = _.sortBy(instancesList, 'Instances[0].State.name');
    var list = _.sortBy(sortedByState, function(instance) { tagValue(instance.Instances[0].Tags, 'Requestor') });
    return list;
  }

  function listTableFor(instancesList, state) {
    instancesList.Reservations = sort(instancesList);
    state.table = new Table({ head: state.tableHeaders,
                              style: { compact: true, border: [], head: [] } });
    var rows = rowsForTable(instancesList, state);
    rows.forEach(function(row){ state.table.push(row) });
    return instancesList.Reservations;
  }

  function rowsForTable(instancesList, state) {
    var generatedRows = _.map(instancesList, generateTableRowData);
    return _.map(generatedRows, state.row);
  }

  function listRow(row) {
    return [row.idx, row.name, row.owner, row.state, row.started]
  }

  function stalesRow(row) {
    return [row.idx, row.owner, row.name, row.state, row.age, row.idle]
  }

  function generateTableRowData(reservation, index) {
    var instance = reservation.Instances[0];
    return {
      idx: index + 1,
      name: tagValue(instance.Tags, 'Name'),
      owner: tagValue(instance.Tags, 'Requestor'),
      state: instance.State.Name,
      started: instance.LaunchTime.toString().substring(0,15),
      age: instanceAge(reservation),
      idle:idleSince(reservation)
    }
  }

  function instanceAge(reservation) {
    return daysSince(launchTimeForReservation(reservation));
  }

  function idleSince(reservation) {
    return daysSince(lastStarted(reservation));
  }

  function lastStarted(reservation) {
    //TODO: Return the time stamp of when the instance was last started
  }

  function tagValue(tags, key) {
    return _.find(tags, _.matchesProperty('Key', key)).Value
  }

  function createHangout(state) {
    var deferredPromise = Promise.defer();
    state.hangout = "https://plus.google.com/hangouts/_/wellmatchhealth.com/"+ state.instanceName
    deferredPromise.resolve();
    return deferredPromise.promise;
  }

  exports.create = function(state) {
    state.announceTemplate = 'announce_run_instance';
    state.messageTemplate = 'message_create_instance';
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
    .then(_.partialRight(runInstance, state))
    .then(_.partialRight(tagInstance, state))
    .then(_.partialRight(sendResponse, state))
    .catch(reportError);
  };

  exports.control = function(state) {
    var state = state || {};
    state.announceTemplate = 'announce_success';
    var controls = {
      'start': startInstance,
      'stop': stopInstance,
      'nuke': nukeInstance
    };
    return getInstanceIds(state.instanceName)
    .then(_.partialRight(controls[state.action], state))
    .then(_.partialRight(sendResponse, state))
    .catch(reportError);
  };

  exports.list = function(state) {
    var state = state || {};
    state.announceTemplate = 'instances_table';
    state.tableHeaders = ['','box', 'dev', 'state', 'started'];
    state.tableType = 'all';
    state.row = listRow;
    return listInstances()
    .then(_.partialRight(parseInstancesList, state))
    .then(_.partialRight(sendResponse, state))
    .catch(reportError);
  };

  exports.stales = function(state) {
    var state = state || {};
    state.announceTemplate = 'instances_table';
    state.tableHeaders = ['','owner', 'name', 'state', 'age', 'idle'];
    state.tableType = 'stales';
    state.row = stalesRow;
    return listInstances()
    .then(_.partialRight(filterInstancesList, state))
    .then(_.partialRight(parseInstancesList, state))
    .then(_.partialRight(sendResponse, state))
    .catch(reportError);
  };

  exports.hangout = function(state) {
    var state = state || {};
    state.announceTemplate = 'announce_hangout';
    return createHangout(state)
    .then(_.partialRight(sendResponse, state))
    .catch(reportError);
  };
