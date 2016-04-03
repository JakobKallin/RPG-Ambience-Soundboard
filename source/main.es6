import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './dom.js';

window.addEventListener('DOMContentLoaded', () => {
    const library = Library(GoogleDrive('907013371139'));
    showPage('loading');
    const thumbnails = {};
    
    library.list().then(function(adventures) {
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playSound: function(url) {
                new Audio('/boom.wav').play();
            },
            adventureSelected: id => {
                const adventure = adventures[id];
                adventure.scenes.forEach(scene => {
                    if (scene.image.file && !(scene.image.file.id in thumbnails)) {
                        thumbnails[scene.image.file.id] = library.download(scene.image.file.id)
                        .then(url => soundboard.thumbnailLoaded(scene.image.file.id, url));
                    }
                });
            }
        });
        showPage('soundboard'); 
    });
    
    function showPage(id) {
        dom.all('.page').forEach(p => {
            p.hidden = p.id !== id;
        });
    }
});
