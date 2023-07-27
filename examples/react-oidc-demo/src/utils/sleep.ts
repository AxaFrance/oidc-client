import timer from './timer';

export const sleepAsync = (milliseconds) => {
	return new Promise((resolve) => timer.setTimeout(resolve, milliseconds));
};
