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
                return backend.download.contents(id).then(function(adventure) {
                    signal.adventureDownloadFinished(id);
                    adventure.id = id;
                    adventures[id] = adventure;
                });
            }))
            .then(function() {
                return adventures;
            });
        });
    }
    
    function download(id) {
        return backend.download.blob(id)
        .then(blob => URL.createObjectURL(blob));
    }
    
    function preview(id) {
        return backend.download.preview(id);
    }
    
    return {
        list: list,
        download: download,
        preview: preview
    };
};
