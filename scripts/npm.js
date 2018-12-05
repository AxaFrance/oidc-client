const path = require('path');
var fs = require('fs');

try{
const args = process.argv;
console.log(args);

const NPM_TOKEN = args[2];



 
const template = `registry=https://registry.npmjs.org
//registry.npmjs.org/:_authToken=${NPM_TOKEN}`;

const filePath = path.join(__dirname, '../.npmrc');
console.log(filePath);
fs.writeFileSync(filePath  , template, 'utf8');

} catch(ex) {
    console.error(ex);
}