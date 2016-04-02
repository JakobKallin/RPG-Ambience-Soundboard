export default function(backend) {
    function list() {
        return backend.search({
            mimeType: 'application/json',
            extension: 'ambience'
        })
        .then(function(ids) {
            const adventures = {};
            return Promise.all(ids.map(function(id) {
                return backend.download.contents(id).then(function(adventure) {
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
