const path = require('path');
const fs = require('fs');

const applyCopy=(input) => {
    try {
        const destinationPath = path.join(__dirname, input);
        if (fs.existsSync(destinationPath)) {
            const serviceworkerFilename = "OidcServiceWorker.js";
            const serviceWorkerDestinationPath = path.join(destinationPath, serviceworkerFilename);
            if (fs.existsSync(serviceWorkerDestinationPath)) {
                fs.unlinkSync(serviceWorkerDestinationPath);
            }
            const serviceworkerFilePath = path.join(__dirname, "..", "dist/service_worker", serviceworkerFilename);
            if (fs.existsSync(serviceworkerFilePath)) {
                fs.copyFileSync(serviceworkerFilePath, serviceWorkerDestinationPath);
                console.log(`File copied successfully at ${serviceWorkerDestinationPath}`);
            }
            
            const trustedDomainsFilename = "OidcTrustedDomains.js";
            const trustedDomainsDestinationPath = path.join(destinationPath, `${trustedDomainsFilename}`);
            if(!fs.existsSync(trustedDomainsDestinationPath)){
                fs.copyFileSync(path.join(__dirname, "..", "dist", trustedDomainsFilename), trustedDomainsDestinationPath);
                console.log(`File copied successfully at ${trustedDomainsDestinationPath}`);
            }
        }
    } catch (ex) {
        console.error(ex);
    }
}

try {
    const args = process.argv;
    if (args.length >= 3) {
        const input = args[2];
        applyCopy(input);
    } else if(__dirname.includes("@axa-fr")) {
        applyCopy("../../../../public");
    } else {
        applyCopy("../public");
    }
} catch (ex) {
    console.error(ex);
}