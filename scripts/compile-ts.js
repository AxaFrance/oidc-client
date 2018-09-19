/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

function getCommand(watch) {
  const tsc = path.join(__dirname, '..', 'node_modules', '.bin', 'tsc');

  const currentDirectory = process.cwd();
  const output = path.join(currentDirectory, 'dist');
  const tsconfig = path.join(currentDirectory, 'tsconfig.json');
  const args = [
    `-p ${tsconfig}`,
    `--outDir ${output}`,
    '-d true',
    `--declarationDir ${output}`,
    '--declarationMap true',
    '--listEmittedFiles true',
  ];

  if (watch) {
    args.push('-w');
  }
  const command = `${tsc} ${args.join(' ')}`;

  return command;
}

function handleExit(code, errorCallback) {
  if (code !== 0) {
    if (errorCallback && typeof errorCallback === 'function') {
      errorCallback();
    }

    shell.exit(code);
  }
}

function tscfy(options = {}) {
  const { watch = false, silent = true, errorCallback } = options;
  const tsConfigFile = 'tsconfig.json';
  if (!fs.existsSync(tsConfigFile)) {
    if (!silent) console.log(`No ${tsConfigFile}`);
    return;
  }

  const command = getCommand(watch);
  const { code } = shell.exec(command, { silent });

  handleExit(code, errorCallback);
}

module.exports = {
  tscfy,
};
