/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

function getCommand(watch) {
  const babel = path.join(__dirname, '..', 'node_modules', '.bin', 'babel');
  const config = path.join(__dirname, '..', 'babel.config.js');

  const args = [
    './src --out-dir ./dist',
    '--ignore __mocks__,**/*.spec.js,tests,.__tests__,**/*.test.js,**/stories,**/*.story.js,**/**.stories.js,**/__snapshots__,**/*.tsx,**/*.ts',
    '--source-maps',
    `--config-file ${config}`,
    '--copy-files',
  ];

  if (watch) {
    args.push('-w');
  }

  return `${babel} ${args.join(' ')}`;
}

function handleExit(code, errorCallback) {
  if (code !== 0) {
    if (errorCallback && typeof errorCallback === 'function') {
      errorCallback();
    }

    shell.exit(code);
  }
}

function babelify(options = {}) {
  const { watch = false, silent = false, errorCallback } = options;

  if (!fs.existsSync('src')) {
    if (!silent) console.log('No src dir');
    return;
  }

  const command = getCommand(watch);
  const { code } = shell.exec(command, { silent });

  handleExit(code, errorCallback);
}

module.exports = {
  babelify,
};
