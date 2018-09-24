const fs = require("fs");

let template = `registry=https://registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}
always-auth=true`;

template = template.replace('${NPM_AUTH_TOKEN}', process.env.NPM_AUTH_TOKEN)

fs.unlinkSync('./npmrc');
fs.appendFileSync('./npmrc', template);