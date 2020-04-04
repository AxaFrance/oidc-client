const path = require('path');

module.exports = function override(config, env) {
  config.resolve.alias['react'] = require.resolve('react');
  config.resolve.alias['react-router'] = require.resolve('react-router');
  config.resolve.alias['react-router-dom'] = require.resolve('react-router-dom');
  config.resolve.alias['react-redux'] = require.resolve('react-redux');
  return config;
};
