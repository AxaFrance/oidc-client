const DefaultInterval = 2000;

const Log = console;

export class CheckSessionIFrame {
    private readonly _client_id: any;
    private readonly _callback: any;
    private _url: any;
    private readonly _interval: number;
    private readonly _stopOnError: boolean;
    private readonly _frame_origin: string;
    private readonly _frame: HTMLIFrameElement;
    private _boundMessageEvent: any;
    private _timer: number;
    constructor(callback, client_id, url, interval = DefaultInterval, stopOnError = true) {
        this._callback = callback;
        this._client_id = client_id;
        this._url = url;
        this._interval = interval || DefaultInterval;
        this._stopOnError = stopOnError;
        const idx = url.indexOf('/', url.indexOf('//') + 2);
        this._frame_origin = url.substr(0, idx);
        this._frame = window.document.createElement('iframe');
        this._frame.style.visibility = 'hidden';
        this._frame.style.position = 'absolute';
        this._frame.style.display = 'none';
        // @ts-ignore
        this._frame.width = 0;
        // @ts-ignore
        this._frame.height = 0;

        this._frame.src = url;
    }

    load() {
        return new Promise<void>((resolve) => {
            this._frame.onload = () => {
                resolve();
            };
            window.document.body.appendChild(this._frame);
            this._boundMessageEvent = this._message.bind(this);
            window.addEventListener('message', this._boundMessageEvent, false);
        });
    }

    _message(e) {
        if (e.origin === this._frame_origin &&
            e.source === this._frame.contentWindow
        ) {
            if (e.data === 'error') {
                Log.error('CheckSessionIFrame: error message from check session op iframe');
                if (this._stopOnError) {
                    this.stop();
                }
            } else if (e.data === 'changed') {
                Log.debug(e);
                Log.debug('CheckSessionIFrame: changed message from check session op iframe');
                this.stop();
                this._callback();
            } else {
                Log.debug('CheckSessionIFrame: ' + e.data + ' message from check session op iframe');
            }
        }
    }

    start(session_state) {
            Log.debug('CheckSessionIFrame.start :' + session_state);
            this.stop();
            const send = () => {
                this._frame.contentWindow.postMessage(this._client_id + ' ' + session_state, this._frame_origin);
            };
            send();
            this._timer = window.setInterval(send, this._interval);
    }

    stop() {
        if (this._timer) {
            Log.debug('CheckSessionIFrame.stop');
            window.clearInterval(this._timer);
            this._timer = null;
        }
    }
}
