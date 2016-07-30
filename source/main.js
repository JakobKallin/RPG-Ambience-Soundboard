"use strict";
const library_1 = require('./adventure/library');
const google_drive_1 = require('./storage/google-drive');
const loading_library_1 = require('./views/loading-library');
const soundboard_1 = require('./views/soundboard');
const google_drive_2 = require('./views/google-drive');
const session_error_1 = require('./views/session-error');
const dom = require('./document');
const stage_1 = require('../libraries/ambience-stage/stage');
const dom_1 = require('../libraries/ambience-stage/dom');
const state_machine_1 = require('./state-machine');
const queue_1 = require('./queue');
const Persistence = require('./persistence');
const version = 0;
const defaultStore = {};
var Storage;
(function (Storage) {
    function read() {
        return Persistence.read(version, defaultStore);
    }
    Storage.read = read;
    function modify(transaction) {
        Persistence.modify(version, defaultStore, transaction);
    }
    Storage.modify = modify;
})(Storage || (Storage = {}));
dom.on(window, 'DOMContentLoaded', () => {
    let state = state_machine_1.State.Loading;
    stateEntered(state);
    const latest = {
        fade: {
            background: 0,
            foreground: 0
        }
    };
    const appId = '907013371139';
    const library = library_1.default(google_drive_1.default(appId));
    const views = {
        googleDrive: google_drive_2.default(dom.id('google-drive'), {
            login: () => {
                library.authenticate(false)
                    .then(() => {
                    enterState(state_machine_1.State.StartingSession);
                    return loadLibrary();
                })
                    .catch(error => {
                    enterState(state_machine_1.State.SessionError, error);
                });
            }
        }),
        loadingLibrary: loading_library_1.default(dom.id('loading-library')),
        error: session_error_1.default(dom.id('session-error'))
    };
    enterState(state_machine_1.State.AccountPossiblyConnected);
    function showPage(id, fade = 0) {
        const pages = dom.all('.page');
        const previous = R.last(pages);
        const next = pages.filter(p => p.id === id)[0];
        pages.forEach(p => {
            p.style.transitionProperty = '';
            p.style.transitionDuration = '';
            p.style.opacity = '';
            p.hidden = p !== previous && p !== next;
        });
        document.body.insertBefore(next, previous.nextElementChild);
        hideAfter(previous, fade);
        fadeIn(next, fade);
        function fadeIn(node, duration) {
            node.style.opacity = '0';
            node.style.transitionProperty = 'opacity';
            node.style.transitionDuration = duration + 's';
            setTimeout(() => node.style.opacity = '1', 0);
        }
        function hideAfter(node, duration) {
            setTimeout(() => {
                const pages = dom.all('.page');
                // Do not hide if this is the last page, as that means it has
                // been shown again during the timeout.
                if (node !== pages[pages.length - 1]) {
                    node.hidden = true;
                }
            }, duration * 1000);
        }
    }
    function loadLibrary() {
        let adventureLimit = 1;
        let adventureCount = 0;
        const signalProgress = {
            adventureListDownloadStarted: () => views.loadingLibrary.event('Downloading adventure list…'),
            adventureListDownloadFinished: (count) => {
                views.loadingLibrary.event('Finished downloading adventure list');
                views.loadingLibrary.event('Downloading adventures…');
                adventureLimit = count;
            },
            adventureDownloadStarted: (id) => id,
            adventureDownloadError: (id) => {
                views.loadingLibrary.error('Error downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            },
            adventureDownloadFinished: (id) => {
                views.loadingLibrary.event('Finished downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            }
        };
        enterState(state_machine_1.State.SessionStarted);
        return library.list(signalProgress)
            .then(adventures => {
            enterState(state_machine_1.State.LibraryLoaded);
            startSoundboard(adventures);
        })
            .catch(error => {
            console.error(error);
            enterState(state_machine_1.State.SessionError, error);
        });
    }
    let selectedAdventure = null;
    const queueFileDownload = queue_1.default(3);
    const queuePreviewDownload = queue_1.default(50);
    function startSoundboard(adventures) {
        const previews = {};
        const files = {};
        const loadFile = R.memoize((id) => {
            return new Promise((resolve, reject) => {
                // Immediate timeout because this is actually called before
                // `SoundboardView` returns, so we don't have the soundboard
                // callbacks available to us.
                setTimeout(() => {
                    soundboard.fileProgress(id, 0);
                    return queueFileDownload(() => {
                        return library.download(id, (ratio) => {
                            soundboard.fileProgress(id, ratio);
                        });
                    })
                        .then(resolve)
                        .catch(reject);
                }, 0);
            });
        });
        const background = stage_1.default(dom_1.default(dom.id('background')));
        const foreground = stage_1.default(dom_1.default(dom.id('foreground')));
        const soundboard = soundboard_1.default({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: playScene,
            stopAllScenes: stopAllScenes,
            adventureSelected: (id) => selectAdventure(id),
            changeVolume: volume => {
                background.volume(volume);
                foreground.volume(volume);
            }
        });
        selectAdventure(Storage.read().adventure ||
            R.sortBy(id => adventures[id].title, Object.keys(adventures))[0]);
        dom.on(document, 'keydown', (event) => {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        dom.on(document, 'keypress', (event) => {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        function selectAdventure(id) {
            const adventure = adventures[id];
            selectedAdventure = adventure;
            // Reverse order of scenes because queue is FIFO.
            R.reverse(adventure.scenes).forEach((scene) => {
                const firstImage = scene.media.filter(m => m.type === 'image')[0];
                if (firstImage && !(firstImage.file in previews)) {
                    previews[firstImage.file] = queuePreviewDownload(() => {
                        return library.preview(firstImage.file);
                    })
                        .then((url) => soundboard.previewLoaded(firstImage.file, url));
                }
                const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
                firstSound.tracks.forEach((t) => loadFile(t).then((url) => {
                    soundboard.fileLoaded(t, url);
                }));
            });
            soundboard.adventureSelected(id);
            Storage.modify(store => {
                store.adventure = id;
                return store;
            });
        }
        function playSceneWithHotkey(hotkey) {
            if (!selectedAdventure)
                return;
            const scenes = selectedAdventure.scenes.filter((s) => s.key === hotkey);
            scenes.forEach(playScene);
        }
        function stopAllScenes() {
            background.start([], latest.fade.background * 1000);
            foreground.start([], latest.fade.foreground * 1000);
        }
        function playScene(scene) {
            const firstImage = scene.media.filter(m => m.type === 'image')[0];
            const firstSound = scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
            Promise.all([
                firstImage ? loadFile(firstImage.file) : null,
                Promise.all(firstSound.tracks.map((t) => loadFile(t)))
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
                            backgroundSize: firstImage.size
                        }
                    });
                }
                if (soundFiles.length > 0) {
                    items.push({
                        type: 'sound',
                        tracks: soundFiles,
                        loop: firstSound.loop,
                        overlap: firstSound.overlap * 1000,
                        shuffle: firstSound.shuffle,
                        volume: firstSound.volume / 100
                    });
                }
                const layer = scene.layer === 'foreground' ? foreground : background;
                latest.fade[scene.layer] = scene.fade.out;
                layer.start(items, scene.fade.in * 1000);
            });
        }
    }
    function attemptImmediateLogin() {
        library.authenticate(true)
            .then(() => enterState(state_machine_1.State.AccountConnected))
            .catch(() => enterState(state_machine_1.State.AccountNotConnected));
    }
    function enterState(newState, arg) {
        if (R.contains(newState, state_machine_1.transitions(state))) {
            state = newState;
            stateEntered(newState, arg);
        }
        else {
            throw new Error('Invalid state transition: ' + state + ' to ' + newState);
        }
    }
    function stateEntered(state, arg) {
        switch (state) {
            case state_machine_1.State.Loading: break;
            case state_machine_1.State.AccountPossiblyConnected:
                attemptImmediateLogin();
                break;
            case state_machine_1.State.AccountConnected:
                enterState(state_machine_1.State.StartingSession);
                loadLibrary();
                break;
            case state_machine_1.State.AccountNotConnected:
                showPage('google-drive', 0.25);
                break;
            case state_machine_1.State.StartingSession:
                showPage('loading-library', 0.25);
                break;
            case state_machine_1.State.SessionStarted: break;
            case state_machine_1.State.LibraryLoaded:
                showPage('soundboard', 0.25);
                break;
            case state_machine_1.State.SessionError:
                views.error.error(arg);
                showPage('session-error', 0.25);
                break;
            default: throw new Error('Unhandled state: ' + state);
        }
    }
});
