const timer = (function () {
    var workerPort = (function () {
        var worker;
        var blobURL;

        var workerCode = function () {
            var innerIdsByOuterIds = {};

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
                }
            };

            function onMessage(port, event) {
                var method = event.data[0];
                var id = event.data[1];
                var option = event.data[2];

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
                var port = event.ports[0];

                port.onmessage = function (event) {
                    onMessage(port, event);
                };
            };
        }.toString();

        try {
            var blob = new Blob(['(', workerCode, ')()'], {type: 'application/javascript'});
            blobURL = URL.createObjectURL(blob);
        } catch (error) {
            return null;
        }

        if (SharedWorker) {
            worker = new SharedWorker(blobURL);
            return worker.port;
        } else if (Worker) {
            worker = new Worker(blobURL);
            return worker;
        }

        return null;
    }());

    if (!workerPort) {
        return {
            setTimeout: setTimeout.bind(window),
            clearTimeout: clearTimeout.bind(window),
            setInterval: setInterval.bind(window),
            clearInterval: clearInterval.bind(window)
        };
    }

    var getId = (function () {
        var currentId = 0;

        return function () {
            currentId++;
            return currentId;
        };
    }());

    var timeoutCallbacksById = {};
    var intervalCallbacksById = {};

    workerPort.onmessage = function (event) {
        var id = event.data;

        var timeoutCallback = timeoutCallbacksById[id];
        if (timeoutCallback) {
            timeoutCallback();
            timeoutCallbacksById[id] = null;
            return;
        }

        var intervalCallback = intervalCallbacksById[id];
        if (intervalCallback) {
            intervalCallback();
        }
    };

    function setTimeoutWorker(callback, timeout) {
        var id = getId();
        workerPort.postMessage(['setTimeout', id, timeout]);
        timeoutCallbacksById[id] = callback;
        return id;
    }

    function clearTimeoutWorker(id) {
        workerPort.postMessage(['clearTimeout', id]);
        timeoutCallbacksById[id] = null;
    }

    function setIntervalWorker(callback, timeout) {
        var id = getId();
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
        clearInterval: clearIntervalWorker
    };
}());

export default timer;
