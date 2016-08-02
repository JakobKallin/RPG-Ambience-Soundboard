"use strict";
var library_1 = require('./adventure/library');
var google_drive_1 = require('./storage/google-drive');
var loading_library_1 = require('./views/loading-library');
var soundboard_1 = require('./views/soundboard');
var google_drive_2 = require('./views/google-drive');
var session_error_1 = require('./views/session-error');
var welcome_1 = require('./views/welcome');
var dom = require('./document');
var stage_1 = require('../libraries/ambience-stage/stage');
var dom_1 = require('../libraries/ambience-stage/dom');
var state_machine_1 = require('./state-machine');
var queue_1 = require('./queue');
var Persistence = require('./persistence');
var version = 0;
var defaultStore = {};
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
function start() {
    var state = state_machine_1.State.Loading;
    stateEntered(state);
    var latest = {
        fade: {
            background: 0,
            foreground: 0
        }
    };
    var appId = '907013371139';
    var library = library_1.default(google_drive_1.default(appId));
    var views = {
        welcome: welcome_1.default(dom.id('welcome'), {
            dismissed: function () {
                Storage.modify(function (store) {
                    store.welcomed = true;
                    return store;
                });
                enterState(state_machine_1.State.AccountPossiblyConnected);
            }
        }),
        googleDrive: google_drive_2.default(dom.id('google-drive'), {
            login: function () {
                library.authenticate(false)
                    .then(function () {
                    enterState(state_machine_1.State.StartingSession);
                    return loadLibrary();
                })
                    .catch(function (error) {
                    enterState(state_machine_1.State.SessionError, error);
                });
            }
        }),
        loadingLibrary: loading_library_1.default(dom.id('loading-library')),
        error: session_error_1.default(dom.id('session-error'), {
            retry: function () {
                enterState(state_machine_1.State.StartingSession);
                loadLibrary();
            }
        })
    };
    if (Storage.read().welcomed) {
        enterState(state_machine_1.State.AccountPossiblyConnected);
    }
    else {
        enterState(state_machine_1.State.NotWelcomed);
    }
    function showPage(id, fade) {
        if (fade === void 0) { fade = 0; }
        var pages = dom.all('.page');
        var previous = R.last(pages);
        var next = pages.filter(function (p) { return p.id === id; })[0];
        pages.forEach(function (p) {
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
            setTimeout(function () { return node.style.opacity = '1'; }, 0);
        }
        function hideAfter(node, duration) {
            setTimeout(function () {
                var pages = dom.all('.page');
                // Do not hide if this is the last page, as that means it has
                // been shown again during the timeout.
                if (node !== pages[pages.length - 1]) {
                    node.hidden = true;
                }
            }, duration * 1000);
        }
    }
    function loadLibrary() {
        var adventureLimit = 1;
        var adventureCount = 0;
        var signalProgress = {
            adventureListDownloadStarted: function () { return views.loadingLibrary.event('Downloading adventure list…'); },
            adventureListDownloadFinished: function (count) {
                views.loadingLibrary.event('Finished downloading adventure list');
                views.loadingLibrary.event('Downloading adventures…');
                adventureLimit = count;
            },
            adventureDownloadStarted: function (id) { return id; },
            adventureDownloadError: function (id) {
                views.loadingLibrary.error('Error downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            },
            adventureDownloadFinished: function (id) {
                views.loadingLibrary.event('Finished downloading adventure ' + id);
                adventureCount += 1;
                views.loadingLibrary.progress(adventureCount / adventureLimit);
            }
        };
        enterState(state_machine_1.State.SessionStarted);
        return library.list(signalProgress)
            .then(function (adventures) {
            enterState(state_machine_1.State.LibraryLoaded);
            startSoundboard(adventures);
        })
            .catch(function (error) {
            console.error(error);
            enterState(state_machine_1.State.SessionError, error);
        });
    }
    var selectedAdventure = null;
    var queueFileDownload = queue_1.default(3);
    var queuePreviewDownload = queue_1.default(50);
    function startSoundboard(adventures) {
        var previews = {};
        var files = {};
        var loadFile = R.memoize(function (id) {
            return new Promise(function (resolve, reject) {
                // Immediate timeout because this is actually called before
                // `SoundboardView` returns, so we don't have the soundboard
                // callbacks available to us.
                setTimeout(function () {
                    soundboard.fileProgress(id, 0);
                    return queueFileDownload(function () {
                        return library.download(id, function (ratio) {
                            soundboard.fileProgress(id, ratio);
                        });
                    })
                        .then(resolve)
                        .catch(reject);
                }, 0);
            });
        });
        var background = stage_1.default(dom_1.default(dom.id('background')));
        var foreground = stage_1.default(dom_1.default(dom.id('foreground')));
        var soundboard = soundboard_1.default({
            adventures: adventures,
            dropdown: document.getElementById('adventure'),
            playScene: playScene,
            stopAllScenes: stopAllScenes,
            adventureSelected: function (id) { return selectAdventure(id); },
            changeVolume: function (volume) {
                background.volume(volume);
                foreground.volume(volume);
            }
        });
        selectAdventure(Storage.read().adventure ||
            R.sortBy(function (id) { return adventures[id].title; }, Object.keys(adventures))[0]);
        dom.on(document, 'keydown', function (event) {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        dom.on(document, 'keypress', function (event) {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        function selectAdventure(id) {
            var adventure = adventures[id];
            selectedAdventure = adventure;
            // Reverse order of scenes because queue is FIFO.
            R.reverse(adventure.scenes).forEach(function (scene) {
                var firstImage = scene.media.filter(function (m) { return m.type === 'image'; })[0];
                if (firstImage && !(firstImage.file in previews)) {
                    previews[firstImage.file] = queuePreviewDownload(function () {
                        return library.preview(firstImage.file);
                    })
                        .then(function (url) { return soundboard.previewLoaded(firstImage.file, url); });
                }
                var firstSound = scene.media.filter(function (m) { return m.type === 'sound'; })[0] || { tracks: [] };
                firstSound.tracks.forEach(function (t) { return loadFile(t).then(function (url) {
                    soundboard.fileLoaded(t, url);
                }); });
            });
            soundboard.adventureSelected(id);
            Storage.modify(function (store) {
                store.adventure = id;
                return store;
            });
        }
        function playSceneWithHotkey(hotkey) {
            if (!selectedAdventure)
                return;
            var scenes = selectedAdventure.scenes.filter(function (s) { return s.key === hotkey; });
            scenes.forEach(playScene);
        }
        function stopAllScenes() {
            background.start([], latest.fade.background * 1000);
            foreground.start([], latest.fade.foreground * 1000);
        }
        function playScene(scene) {
            var firstImage = scene.media.filter(function (m) { return m.type === 'image'; })[0];
            var firstSound = scene.media.filter(function (m) { return m.type === 'sound'; })[0] || { tracks: [] };
            Promise.all([
                firstImage ? loadFile(firstImage.file) : null,
                Promise.all(firstSound.tracks.map(function (t) { return loadFile(t); }))
            ])
                .then(function (files) {
                var imageFile = files[0];
                var soundFiles = files[1];
                var items = [];
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
                var layer = scene.layer === 'foreground' ? foreground : background;
                latest.fade[scene.layer] = scene.fade.out;
                layer.start(items, scene.fade.in * 1000);
            });
        }
    }
    function attemptImmediateLogin() {
        library.authenticate(true)
            .then(function () { return enterState(state_machine_1.State.AccountConnected); })
            .catch(function () { return enterState(state_machine_1.State.AccountNotConnected); });
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
            case state_machine_1.State.NotWelcomed:
                showPage('welcome', 0.25);
                break;
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
}
dom.on(window, 'DOMContentLoaded', function () {
    try {
        start();
    }
    catch (error) {
        // This code intentionally uses only direct DOM manipulation with old
        // APIs, as we want maximum browser support for this section.
        var loadingPage = document.getElementById('loading-app');
        loadingPage.parentNode.removeChild(loadingPage);
        document.getElementById('loading-error-text').textContent = error.stack;
        document.getElementById('loading-error-browser-id').textContent = navigator.userAgent;
    }
});
