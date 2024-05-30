export interface ILOidcLocation {
	open(url: string): void;
	reload(): void;
	getCurrentHref(): string;
	getPath(): string;
	getOrigin(): string;
}

export class OidcLocation implements ILOidcLocation {
	open(url: string) {
		window.location.href = url;
	}

	reload() {
		window.location.reload();
	}

	getCurrentHref() {
		return window.location.href;
	}

	getPath() {
		const location = window.location;
		return location.pathname + (location.search || '') + (location.hash || '');
	}

	getOrigin(): string {
		return window.origin;
	}
}
