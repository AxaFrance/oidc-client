/* eslint-disable no-console */
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const log = require('npmlog');
const { babelify } = require('./compile-js');
const { tscfy } = require('./compile-ts');

function getPackageJson() {
  const modulePath = path.resolve('./');

  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(path.join(modulePath, 'package.json'));
}

function removeDist() {
  shell.rm('-rf', 'dist');
}

function removeTsFromDist() {
  // add .ts filtering to babel args and remove after babel - 7 is adopted
  // --copy-files option doesn't work with --ignore
  // https://github.com/babel/babel/issues/5404

  if (!shell.test('-d', 'dist')) {
    return;
  }
  console.log(shell.find('dist'));
  const tsFiles = shell.find('dist').filter(tsFile => tsFile.match(/\.ts$/));

  if (tsFiles.length) {
    shell.rm(tsFiles);
  }
}

function copyLicence() {
  const licence = path.join(__dirname, '..', 'LICENSE');
  shell.cp(licence, './');
}

function logError(type, packageJson) {
  log.error(
    `FAILED to compile ${type}: ${chalk.bold(`${packageJson.name}@${packageJson.version}`)}`
  );
}

removeDist();
const packageJson = getPackageJson();

const tsFiles = shell.find('src').filter(tsFile => tsFile.match(/\.ts$/));

if (tsFiles.length !== 0) {
  tscfy({ errorCallback: () => logError('ts', packageJson) });
} else {
  babelify({ errorCallback: () => logError('js', packageJson) });
}
copyLicence();

console.log(chalk.gray(`Built: ${chalk.bold(`${packageJson.name}@${packageJson.version}`)}`));
