module.exports = (function (_) {
  "use strict";
  var configuration;

  function generate() {
    const namer = configuration.strategy,
      descriptorLength = _.has(namer, "colors") ? 1 : 2,
        create = _.partial(createDescriptors, descriptorLength),
          descriptors = create(namer),
            joinedDescriptors = descriptors.join("-");

            if (_.has(namer, "colors")) {
              return `${_.sample(namer.colors)}-${joinedDescriptors}-${_.sample(namer.nouns)}`;
            } else {
              console.log(joinedDescriptors);
              return `${joinedDescriptors}-${_.sample(namer.nouns)}`;
            }
  }

  function createDescriptors(length, namingStrat) {
    console.log(namingStrat);
    return _.map(_.range(length), function () {
      return _.sample(namingStrat.adjectives)
    });
  }

  return {
    configure: function (config) {
      configuration = config;
      if (_.has(configuration, "strategy")) {
        return generate;
      } else {
        throw new Error("You must supply a naming strategy");
      }
    }
  }
})(
require("lodash")
);
