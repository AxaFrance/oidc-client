﻿const DefaultInterval = 2000;

const Log = console;

export class CheckSessionIFrame {
    private _client_id: any;
    private _callback: any;
    private _url: any;
    private _interval: number;
    private _stopOnError: boolean;
    private _frame_origin: string;
    private _frame: HTMLIFrameElement;
    private _boundMessageEvent: any;
    private _timer: number;
    private _session_state: Boolean;
    constructor(callback, client_id, url, interval=DefaultInterval, stopOnError = true) {
        this._callback = callback;
        this._client_id = client_id;
        this._url = url;
        this._interval = interval || DefaultInterval;
        this._stopOnError = stopOnError;
        const idx = url.indexOf("/", url.indexOf("//") + 2);
        this._frame_origin = url.substr(0, idx);
        this._frame = window.document.createElement("iframe");
        this._frame.style.visibility = "hidden";
        this._frame.style.position = "absolute";
        this._frame.style.display = "none";
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
            }
            window.document.body.appendChild(this._frame);
            this._boundMessageEvent = this._message.bind(this);
            window.addEventListener("message", this._boundMessageEvent, false);
        });
    }
    _message(e) {
        if (e.origin === this._frame_origin &&
            e.source === this._frame.contentWindow
        ) {
            if (e.data === "error") {
                console.error("CheckSessionIFrame: error message from check session op iframe");
                if (this._stopOnError) {
                    this.stop();
                }
            }
            else if (e.data === "changed") {
                Log.debug(e)
                Log.debug("CheckSessionIFrame: changed message from check session op iframe");
                this.stop();
                this._callback();
            }
            else {
                Log.debug("CheckSessionIFrame: " + e.data + " message from check session op iframe");
            }
        }
    }
    start(session_state) {
        if (this._session_state !== session_state) {
            Log.debug("CheckSessionIFrame.start :" + session_state);
            this.stop();
            this._session_state = session_state;
            let send = () => {
                this._frame.contentWindow.postMessage(this._client_id + " " + this._session_state, this._frame_origin);
            };
            // trigger now
            send();
            // and setup timer
            this._timer = window.setInterval(send, this._interval);
        }
    }

    stop() {
        this._session_state = null;

        if (this._timer) {
            Log.debug("CheckSessionIFrame.stop");
            window.clearInterval(this._timer);
            this._timer = null;
        }
    }
}