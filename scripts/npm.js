const fs = require("fs");

const template = `
always-auth=true
registry=https://registry.npmjs.org
//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}
`

const npmrcPath = __dirname +'/../.npmrc';
fs.unlinkSync(npmrcPath);
fs.appendFileSync(npmrcPath, template);