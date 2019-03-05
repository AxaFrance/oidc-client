const path = require('path');

module.exports = function override(config, env) {
  config.resolve.alias['react'] = require.resolve("react");
  return config;
};