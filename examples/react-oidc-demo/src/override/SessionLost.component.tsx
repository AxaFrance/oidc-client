import { useOidc } from '@axa-fr/react-oidc';
import { ComponentType } from 'react';

import { style } from './style.js';
import { useNavigate } from 'react-router-dom';

export const SessionLost: ComponentType<any> = ({ configurationName }) => {
	const { login } = useOidc(configurationName);
	const navigate = useNavigate();
	const navigateProfile = () => {
		navigate('/profile');
	};

	return (
		<div className='oidc-session-lost' style={style}>
			<div className='oidc-session-lost__container'>
				<h1 className='oidc-session-lost__title'>Session timed out for {configurationName}</h1>
				<p className='oidc-session-lost__content'>
					Your session has expired. Please re-authenticate.
				</p>
				<button type='button' className='btn btn-primary' onClick={() => login(null)}>
					Login
				</button>
				<button type='button' className='btn btn-primary' onClick={navigateProfile}>
					Navigate to Profile
				</button>
			</div>
		</div>
	);
};

export default SessionLost;
