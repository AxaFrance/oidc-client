import { OidcProvider } from '@axa-fr/react-oidc';
import { useRouter } from 'next/router';
import React from 'react';

const configuration = {
	client_id: 'interactive.public',
	redirect_uri: 'http://localhost:3001/#authentication/callback',
	silent_redirect_uri: 'http://localhost:3001/#authentication/silent-callback', // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore the session
	scope: 'openid profile email api offline_access',
	authority: 'https://demo.duendesoftware.com',
	preload_user_info: 'true',
};

const onEvent = (configurationName, eventName, data) => {
	// eslint-disable-next-line no-undef
	console.log(`oidc:${configurationName}:${eventName}`, data);
};

export default function Layout({ children }) {
	const router = useRouter();
	const withCustomHistory = () => {
		return {
			replaceState: (url) => {
				router
					.replace({
						pathname: url,
					})
					.then(() => {
						// eslint-disable-next-line no-undef
						window.dispatchEvent(new Event('popstate'));
					});
			},
		};
	};
	return (
		<>
			<OidcProvider
				configuration={configuration}
				onEvent={onEvent}
				withCustomHistory={withCustomHistory}
			>
				<main>{children}</main>
			</OidcProvider>
		</>
	);
}
