const Twit = require('twit'); // eslint-disable-line

/* should be ran with "node twitter consumer_key consumer_secret access_token access_token_secret"
   in this order
*/
const argv = process.argv;

const T = new Twit({
  consumer_key: argv[2],
  consumer_secret: argv[3],
  access_token: argv[4],
  access_token_secret: argv[5],
  timeout_ms: 60 * 1000,
  strictSSL: true,
});

const json = require('../packages/context/package.json');

const message = `Hey a new version (${
  json.version
}) of the @axa-fr/@axa-fr/react-oidc is available on @github and @npm! 
check out the new changelog https://github.com/AxaGuilDEv/@axa-fr/react-oidc/blob/master/CHANGELOG.md
https://axaguildev.github.io`;

T.post('statuses/update', { status: message }, err => {
  if (!err) {
    console.log('Greate job'); // eslint-disable-line
  } else {
    console.error(err);
  }
});
