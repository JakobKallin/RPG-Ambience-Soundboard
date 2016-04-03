import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './dom.js';

window.addEventListener('DOMContentLoaded', () => {
    const library = Library(GoogleDrive('907013371139'));
    showPage('loading');
    const thumbnails = {};
    const tracks = {};
    const audio = new Audio();
    
    library.list().then(function(adventures) {
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: function playScene(scene) {
                if (scene.sound.tracks) {
                    const id = scene.sound.tracks[0].id;
                    if (tracks[id]) {
                        audio.src = tracks[id];
                        audio.play();
                    }
                    else {
                        library.download(id)
                        .then(url => tracks[id] = url)
                        .then(() => playScene(scene));
                    }
                }
            },
            adventureSelected: id => {
                const adventure = adventures[id];
                adventure.scenes.forEach(scene => {
                    if (scene.image.file && !(scene.image.file.id in thumbnails)) {
                        thumbnails[scene.image.file.id] = library.preview(scene.image.file.id)
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
