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
    
    return {
        list: list
    };
};
