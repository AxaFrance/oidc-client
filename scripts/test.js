#!/usr/bin/env node
const inquirer = require('inquirer');
const program = require('commander');
const childProcess = require('child_process');
const chalk = require('chalk');
const log = require('npmlog');
const path = require('path');

log.heading = 'af-react-oidc';
const prefix = 'test';
log.addLevel('aborted', 3001, { fg: 'red', bold: true });

const spawn = command => {
  const out = childProcess.spawnSync(`${command}`, {
    shell: true,
    stdio: 'inherit',
  });

  if (out.status !== 0) {
    process.exit(out.status);
  }

  return out;
};

const main = program.version('3.0.0').option('--all', `Test everything ${chalk.gray('(all)')}`);

const createProject = ({ defaultValue, option, name, projectLocation, isJest }) => ({
  value: false,
  defaultValue: defaultValue || false,
  option: option || undefined,
  name: name || 'unnamed task',
  projectLocation,
  isJest,
});
const createOption = ({ defaultValue, option, name, extraParam }) => ({
  value: false,
  defaultValue: defaultValue || false,
  option: option || undefined,
  name: name || 'unnamed task',
  extraParam,
});

const tasks = {
  core: createProject({
    name: `Core & React ${chalk.gray('(core)')}`,
    defaultValue: true,
    option: '--core',
    projectLocation: path.join(__dirname, '..', 'packages'),
    isJest: true,
  }),
  image: createProject({
    name: `Examples ${chalk.gray('(demo redux)')}`,
    defaultValue: false,
    option: '--image',
    projectLocation: path.join(__dirname, '..', 'examples/redux'),
    isJest: true,
  }),
  watchmode: createOption({
    name: `Run in watch-mode ${chalk.gray('(watchmode)')}`,
    defaultValue: false,
    option: '--watch',
    extraParam: '--watch',
  }),
  coverage: createOption({
    name: `Output coverage reports ${chalk.gray('(coverage)')}`,
    defaultValue: false,
    option: '--coverage',
    extraParam: '--coverage',
  }),
  runInBand: createOption({
    name: `Run all tests serially in the current process ${chalk.gray('(runInBand)')}`,
    defaultValue: false,
    option: '--runInBand',
    extraParam: '--runInBand',
  }),
};

const getProjects = list => {
  const filtered = list.filter(key => key.projectLocation);
  if (filtered.length > 0) {
    return filtered;
  }

  // if list would have been empty, we run with default projects
  return Object.keys(tasks)
    .map(key => tasks[key])
    .filter(key => key.projectLocation && key.defaultValue);
};

const getExtraParams = list => list.filter(key => key.extraParam).map(key => key.extraParam);

Object.keys(tasks)
  .reduce((acc, key) => acc.option(tasks[key].option, tasks[key].name), main)
  .parse(process.argv);

Object.keys(tasks).forEach(key => {
  tasks[key].value =
    program[tasks[key].option.replace('--', '')] || (program.all && tasks[key].projectLocation);
});

let selection;

if (
  !Object.keys(tasks)
    .map(key => tasks[key].value)
    .filter(Boolean).length
) {
  selection = inquirer
    .prompt([
      {
        type: 'checkbox',
        message: 'Select which tests to run',
        name: 'todo',
        pageSize: 8,
        choices: Object.keys(tasks)
          .map(key => tasks[key])
          .filter(key => key.projectLocation)
          .map(key => ({
            name: key.name,
            checked: key.defaultValue,
          }))
          .concat(new inquirer.Separator())
          .concat(
            Object.keys(tasks)
              .map(key => tasks[key])
              .filter(key => key.extraParam)
              .map(key => ({
                name: key.name,
                checked: key.defaultValue,
              }))
          ),
      },
    ])
    .then(({ todo }) =>
      todo.map(name => tasks[Object.keys(tasks).find(i => tasks[i].name === name)])
    );
} else {
  selection = Promise.resolve(
    Object.keys(tasks)
      .map(key => tasks[key])
      .filter(item => item.value === true)
  );
}

selection
  .then(list => {
    if (list.length === 0) {
      log.warn(prefix, 'Nothing to test');
    } else {
      const projects = getProjects(list);
      const jestProjects = projects.filter(key => key.isJest).map(key => key.projectLocation);
      const nonJestProjects = projects.filter(key => !key.isJest);
      const extraParams = getExtraParams(list).join(' ');
      if (jestProjects.length > 0) {
        spawn(`jest --projects ${jestProjects.join(' ')} ${extraParams}`);
      }
      nonJestProjects.forEach(key =>
        spawn(`npm --prefix ${key.projectLocation} test -- ${extraParams}`)
      );
      process.stdout.write('\x07');
    }
  })
  .catch(e => {
    log.aborted(prefix, chalk.red(e.message));
    log.silly(prefix, e);
    process.exit(1);
  });
