import Library from './adventure/library.js';
import GoogleDrive from './storage/google-drive.js';
import SplashView from './views/splash.js';
import SoundboardView from './views/soundboard.js';
import * as dom from './document.js';
import * as R from 'ramda.0.19.1.min';
import AmbienceStage from 'ambience-stage/stage.js'
import AmbienceStageDOM from 'ambience-stage/dom.js'

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
    
    let selectedAdventure = null;
    library.list(signalProgress).then(function(adventures) {
        const server = 'http://192.168.0.106:12345';
        const eventSource = new EventSource(server + '/');
        eventSource.addEventListener('message', event => {
            console.log('receiving ' + event.data);
            playSceneWithHotkey(event.data);
        });
        eventSource.addEventListener('stop', event => {
            console.log('receiving stop' + event.data);
            stopAllScenes();
        });
        
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
        
        const background = AmbienceStage(AmbienceStageDOM(dom.id('background')));
        const foreground = AmbienceStage(AmbienceStageDOM(dom.id('foreground')));
        const soundboard = SoundboardView({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: broadcastScene,
            stopAllScenes: broadcastStop,
            adventureSelected: id => {
                const adventure = adventures[id];
                selectedAdventure = adventure;
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
        
        dom.on(document, 'keydown', event => {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        
        dom.on(document, 'keypress', event => {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        
        function playSceneWithHotkey(hotkey) {
            if (!selectedAdventure) return;
            
            const scenes = selectedAdventure.scenes.filter(s => s.key === hotkey);
            scenes.forEach(playScene);
        }
        
        function broadcastScene(scene) {
            const request = new XMLHttpRequest();
            request.open('POST', server + '/' + scene.key);
            request.send();
        }
        
        function broadcastStop() {
            const request = new XMLHttpRequest();
            request.open('DELETE', server + '/');
            request.send();
        }
        
        function stopAllScenes() {
            background([], 0);
            foreground([], 0);
        }
        
        function playScene(scene) {
            Promise.all([
                scene.image.file ? loadFile(scene.image.file.id) : null,
                Promise.all(scene.sound.tracks.map(t => loadFile(t.id)))
            ])
            .then(files => {
                const imageFile = files[0];
                const soundFiles = files[1];
                const items = [];
                if (imageFile) {
                    items.push({
                        type: 'image',
                        url: imageFile,
                        style: {
                            backgroundSize: scene.image.size
                        }
                    });
                }
                if (soundFiles.length > 0) {
                    items.push({
                        type: 'sound',
                        tracks: soundFiles,
                        loop: scene.sound.loop,
                        overlap: scene.sound.overlap * 1000,
                        shuffle: scene.sound.shuffle,
                        volume: scene.sound.volume / 100
                    });
                }
                
                const layer = scene.layer === 'foreground' ? foreground : background;
                layer(items, scene.fade.duration * 1000);
            });
        }
        
        showPage('soundboard', 0.25);
    });
    
    function showPage(id, fade) {
        fade = fade || 0;
        dom.all('.page').forEach(p => {
            if (p.id === id) {
                // Make sure the target page is at the bottom, so that pages
                // fading out will actually be visible.
                document.body.insertBefore(p, document.body.firstChild);
                p.hidden = false;
            }
            else if (!p.hidden) {
                fadeOut(p, fade);
            }
        });
    }
    
    function fadeOut(node, duration) {
        node.style.transitionProperty = 'opacity';
        node.style.transitionDuration = duration + 's';
        node.style.opacity = '0';
        
        setTimeout(() => {
            node.style.transitionProperty = '';
            node.style.transitionDuration = '';
            node.style.opacity = '';
            node.hidden = true;
        }, duration * 1000);
    }
});
