const timer = (function () {
    const workerPort = (function () {
        let worker;
        let blobURL;

        const workerCode = function () {
            const innerIdsByOuterIds = {};

            const methods = {
                setTimeout: function (port, id, timeout) {
                    innerIdsByOuterIds[id] = setTimeout(function () {
                        port.postMessage(id);
                        innerIdsByOuterIds[id] = null;
                    }, timeout);
                },

                setInterval: function (port, id, timeout) {
                    innerIdsByOuterIds[id] = setInterval(function () {
                        port.postMessage(id);
                    }, timeout);
                },

                clearTimeout: function (port, id) {
                    clearTimeout(innerIdsByOuterIds[id]);
                    innerIdsByOuterIds[id] = null;
                },

                clearInterval: function (port, id) {
                    clearInterval(innerIdsByOuterIds[id]);
                    innerIdsByOuterIds[id] = null;
                },
            };

            function onMessage(port, event) {
                const method = event.data[0];
                const id = event.data[1];
                const option = event.data[2];

                if (methods[method]) {
                    methods[method](port, id, option);
                }
            }

            // For Dedicated Worker
            this.onmessage = function (event) {
                onMessage(self, event);
            };

            // For Shared Worker
            this.onconnect = function (event) {
                const port = event.ports[0];

                port.onmessage = function (event) {
                    onMessage(port, event);
                };
            };
        }.toString();

        try {
            const blob = new Blob(['(', workerCode, ')()'], { type: 'application/javascript' });
            blobURL = URL.createObjectURL(blob);
        } catch (error) {
            return null;
        }
        const isInsideBrowser = (typeof process === 'undefined');
        try {
            if (SharedWorker) {
                worker = new SharedWorker(blobURL);
               return worker.port;
            }
        } catch (error) {
            if (isInsideBrowser) {
                console.warn('SharedWorker not available');
            }
        }
        try {
            if (Worker) {
                worker = new Worker(blobURL);
                return worker;
            }
        } catch (error) {
            if (isInsideBrowser) {
                console.warn('Worker not available');
            }
        }

        return null;
    }());

    if (!workerPort) {
        // In NextJS with SSR (Server Side Rendering) during rending in Node JS, the window object is undefined,
        // the global object is used instead as it is the closest approximation of a browsers window object.
        const bindContext = (typeof window === 'undefined') ? global : window;

        return {
            setTimeout: setTimeout.bind(bindContext),
            clearTimeout: clearTimeout.bind(bindContext),
            setInterval: setInterval.bind(bindContext),
            clearInterval: clearInterval.bind(bindContext),
        };
    }

    const getId = (function () {
        let currentId = 0;

        return function () {
            currentId++;
            return currentId;
        };
    }());

    const timeoutCallbacksById = {};
    const intervalCallbacksById = {};

    workerPort.onmessage = function (event) {
        const id = event.data;

        const timeoutCallback = timeoutCallbacksById[id];
        if (timeoutCallback) {
            timeoutCallback();
            timeoutCallbacksById[id] = null;
            return;
        }

        const intervalCallback = intervalCallbacksById[id];
        if (intervalCallback) {
            intervalCallback();
        }
    };

    function setTimeoutWorker(callback, timeout) {
        const id = getId();
        workerPort.postMessage(['setTimeout', id, timeout]);
        timeoutCallbacksById[id] = callback;
        return id;
    }

    function clearTimeoutWorker(id) {
        workerPort.postMessage(['clearTimeout', id]);
        timeoutCallbacksById[id] = null;
    }

    function setIntervalWorker(callback, timeout) {
        const id = getId();
        workerPort.postMessage(['setInterval', id, timeout]);
        intervalCallbacksById[id] = callback;
        return id;
    }

    function clearIntervalWorker(id) {
        workerPort.postMessage(['clearInterval', id]);
        intervalCallbacksById[id] = null;
    }

    return {
        setTimeout: setTimeoutWorker,
        clearTimeout: clearTimeoutWorker,
        setInterval: setIntervalWorker,
        clearInterval: clearIntervalWorker,
    };
}());

export default timer;
