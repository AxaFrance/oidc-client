import path from 'path';
import fs from 'fs';

/**
 * Script to run after npm install
 *
 * Copy selected files to user's directory
 */
const script_prefix= 'react-oidc';

const copyFile = async (src, dest, overwrite) => {
  if (!overwrite) {
    if (fileExists(dest)) {
      console.log(`[${script_prefix}:skip] file exists not overwriting ${dest}`);
      return;
    }
  }
  await fs.promises.copyFile(src, dest);
  console.log(`[${script_prefix}:copy] ${dest}`);
};

const fileExists = (path) => {
  return !!fs.existsSync(path);
};

const initPath = process.env.INIT_CWD;

const srcDir = '../oidc-client-service-worker/dist/';
const destinationDir = path.join(initPath, 'public');

const files = [
  {
    fileName: 'OidcServiceWorker.js',
    overwrite: true,
  },
  {
    fileName: 'OidcTrustedDomains.js',
    overwrite: false,
  },
];

for await (const f of files) {
  await copyFile(
    path.join(srcDir, f.fileName),
    path.join(destinationDir, f.fileName),
    f.overwrite
  );
}
