const path = require('path');
var fs = require('fs');

try {
   const args = process.argv;
    let template = '';

    if(args.length >= 3){
        const NPM_TOKEN = args[2];
        template = `registry=http://denexus.de-gmbh.com/nexus/content/repositories/NpmDeRelease/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}`;
    } else {
        template = 'registry=http://denexus.de-gmbh.com/nexus/content/repositories/NpmDeRelease/';
    }
   const filePath = path.join(__dirname, '../.npmrc');
   fs.writeFileSync(filePath  , template, 'utf8');

} catch(ex) {
    console.error(ex);
}