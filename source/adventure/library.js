"use strict";
var upgrade_1 = require('./upgrade');
function default_1(backend) {
    function list(signal) {
        signal.adventureListDownloadStarted();
        return backend.search({
            mimeType: 'application/json',
            extension: 'ambience'
        })
            .then(function (ids) {
            signal.adventureListDownloadFinished(ids.length);
            var adventures = {};
            return Promise.all(ids.map(function (id) {
                signal.adventureDownloadStarted(id);
                return backend.download.contents(id).then(function (adventureToUpgrade) {
                    var adventure = upgrade_1.default(adventureToUpgrade);
                    signal.adventureDownloadFinished(id);
                    adventure.id = id;
                    adventures[id] = adventure;
                })
                    .catch(function () { return signal.adventureDownloadError(id); });
            }))
                .then(function () {
                return adventures;
            });
        });
    }
    function download(id, progress) {
        return backend.download.blob(id, progress)
            .then(function (blob) { return URL.createObjectURL(blob); });
    }
    function preview(id) {
        return backend.download.preview(id);
    }
    function authenticate(immediate) {
        return backend.authenticate(immediate);
    }
    return {
        list: list,
        download: download,
        preview: preview,
        authenticate: authenticate
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;
