import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SplashView from './views/splash.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './dom.js';

window.addEventListener('DOMContentLoaded', () => {
    const library = Library(GoogleDrive('907013371139'));
    showPage('splash');
    const thumbnails = {};
    const tracks = {};
    const audio = new Audio();
    
    const splash = SplashView(document.getElementById('splash'));
    let adventureLimit = 1;
    let adventureCount = 0;
    const signalProgress = {
        adventureListDownloadStarted: () => splash.event('Downloading adventure list…'),
        adventureListDownloadFinished: count => {
            splash.event('Finished downloading adventure list');
            splash.event('Downloading adventures…');
            adventureLimit = count;
        },
        adventureDownloadStarted: id => id,
        adventureDownloadFinished: id => {
            splash.event('Finished downloading adventure ' + id);
            adventureCount += 1;
            splash.progress(adventureCount / adventureLimit);
        }
    };
    
    library.list(signalProgress).then(function(adventures) {
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
