const fs = require('fs-extra');
const VERSION = require('../packages/react/package.json').version;

try {
  const execSync = require('child_process').execSync;
  child = execSync(
    `npm run changelog && git add . && git commit -m "docs(changelog) update to new ${VERSION}" && git push`
  );
  console.log('error', child.error);
  console.log('stdout ', child.stdout);
  console.log('stderr ', child.stderr);

  console.log('success!');
} catch (err) {
  console.error(err);
}
