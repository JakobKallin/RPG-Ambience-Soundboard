import upgradeAdventure from './upgrade';

export default function(backend) {
    function list(signal) {
        signal.adventureListDownloadStarted();
        return backend.search({
            mimeType: 'application/json',
            extension: 'ambience'
        })
        .then(function(ids) {
            signal.adventureListDownloadFinished(ids.length);
            const adventures = {};
            return Promise.all(ids.map(function(id) {
                signal.adventureDownloadStarted(id);
                return backend.download.contents(id).then(function(adventureToUpgrade) {
                    const adventure = upgradeAdventure(adventureToUpgrade);
                    signal.adventureDownloadFinished(id);
                    adventure.id = id;
                    adventures[id] = adventure;
                })
                .catch(() => signal.adventureDownloadError(id));
            }))
            .then(function() {
                return adventures;
            });
        });
    }

    function download(id, progress) {
        return backend.download.blob(id, progress)
        .then(blob => URL.createObjectURL(blob));
    }

    function preview(id) {
        return backend.download.preview(id);
    }

    function authenticate(immediate:boolean) {
        return backend.authenticate(immediate);
    }

    return {
        list: list,
        download: download,
        preview: preview,
        authenticate: authenticate
    };
};
