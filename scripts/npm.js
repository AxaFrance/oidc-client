const fs = require("fs");

let template = `registry=https://registry.npmjs.org
`
template += "//https://registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}";

template = template.replace('${NPM_AUTH_TOKEN}', process.env.NPM_AUTH_TOKEN)

const npmrcPath = __dirname +'/../.npmrc';
fs.unlinkSync(npmrcPath);
fs.appendFileSync(npmrcPath, template);