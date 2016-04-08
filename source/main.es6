import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SplashView from './views/splash.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './dom.js';
import * as R from 'ramda.0.19.1.min';

window.addEventListener('DOMContentLoaded', () => {
    showPage('splash');
    const splash = SplashView(document.getElementById('splash'));
    const library = Library(GoogleDrive('907013371139'));
    const audio = new Audio();
    
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
        const previews = {};
        const files = {};
        const loadFile = R.memoize(id => {
            return new Promise((resolve, reject) => {
                // Immediate timeout because this is actually called before
                // `SoundboardView` returns, so we don't have the soundboard
                // callbacks available to us.
                setTimeout(() => {
                    soundboard.fileProgress(id, 0);
                    return library.download(id, ratio => soundboard.fileProgress(id, ratio))
                    .then(resolve)
                    .catch(reject);
                }, 0);
            });
        });
        
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: function playScene(scene) {
                if (scene.sound.tracks) {
                    const id = scene.sound.tracks[0].id;
                    loadFile(id).then(url => {
                        audio.src = url;
                        audio.play();
                    });
                }
            },
            adventureSelected: id => {
                const adventure = adventures[id];
                adventure.scenes.forEach(scene => {
                    if (scene.image.file && !(scene.image.file.id in previews)) {
                        previews[scene.image.file.id] = library.preview(scene.image.file.id)
                        .then(url => soundboard.previewLoaded(scene.image.file.id, url));
                    }
                    
                    scene.sound.tracks.forEach(t => loadFile(t.id).then(url => {
                        soundboard.fileLoaded(t.id, url);
                    }));
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
