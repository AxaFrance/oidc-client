import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.render(<App />, document.getElementById('root'));
/*
(async () => {
    const registration = await navigator.serviceWorker.register('/OidcServiceWorker.js');

    try {
        await navigator.serviceWorker.ready

        console.log('[SWOPR] proxy server ready');
    }
    catch(err) {
        console.error('error registering SWOPR:', err)
    }

    window.addEventListener('beforeunload', async () => {
        await registration.unregister();
    });
})();*/