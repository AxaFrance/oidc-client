const path = require('path');

const args = process.argv;
console.log(args);

const NPM_TOKEN = args[2];


var fs = require('fs');
 
const template = `registry=https://registry.npmjs.org
//registry.npmjs.org/:_authToken=${NPM_TOKEN}`;


fs.writeFileSync( path.join(__dirname, '../.npmrc')  , template, 'utf8');