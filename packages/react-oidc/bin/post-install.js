// post-install.js

import cpy from 'cpy';
import path from 'path';

/**
 * Script to run after npm install
 *
 * Copy selected files to user's directory
 */

const initPath = process.env.INIT_CWD;
// console.log('currentdir:', process.cwd());
// console.log('userPath:', initPath);

function copyProgress(progress) {
  console.log('✓ [react-oidc:copy] ', progress.destinationPath);
}

const destinationDir = path.join(initPath, 'public');

await cpy(['./dist/OidcServiceWorker.js'], destinationDir, {
  overwrite: true,
}).on('progress', copyProgress);

try {
  await cpy(['./dist/OidcTrustedDomains.js'], destinationDir, {
    overwrite: false,
  }).on('progress', copyProgress);
} catch (e) {
  if (e.code === 'EEXIST') { //file exists
    console.log(
      `✗ [react-oidc:skip] OidcTrustedDomains.js not copied, already exists in ${destinationDir}`
    );
  } else throw e;
}
