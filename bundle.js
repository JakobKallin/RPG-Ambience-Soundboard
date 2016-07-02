(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
function dom(container) {
    let number = 0;
    return {
        start: {
            scene: function (update) {
                const scene = document.createElement('div');
                scene.className = 'scene';
                container.appendChild(scene);
                number += 1;
                const sceneNumber = number;
                let fading = false;
                return {
                    fade: {
                        start: () => {
                            fading = true;
                            requestAnimationFrame(updateIfFading);
                        },
                        step: opacity => {
                            scene.style.opacity = String(Math.min(opacity, 0.999));
                        },
                        stop: () => {
                            fading = false;
                        }
                    },
                    stop: () => {
                        container.removeChild(scene);
                    }
                };
                function updateIfFading() {
                    if (fading) {
                        update();
                        requestAnimationFrame(updateIfFading);
                    }
                }
            },
            image: function (image) {
                var element = document.createElement('div');
                element.style.backgroundImage = 'url(' + image.url + ')';
                element.className = 'image';
                const scene = container.lastElementChild;
                scene.appendChild(element);
                if (image.style) {
                    Object.keys(image.style).forEach(function (cssKey) {
                        var cssValue = image.style[cssKey];
                        element.style[cssKey] = cssValue;
                    });
                }
                return {
                    stop: function () { }
                };
            },
            sound: () => function () { },
            track: function (url, update) {
                var element = document.createElement('audio');
                element.src = url;
                if (container.querySelectorAll('audio').length === 0) {
                    element.volume = 0;
                }
                element.play();
                element.className = 'track';
                const scene = container.lastElementChild;
                scene.appendChild(element);
                element.addEventListener('timeupdate', update);
                element.addEventListener('ended', update);
                return {
                    stop: function () {
                        element.pause();
                        scene.removeChild(element);
                    },
                    fade: function (volume) {
                        element.volume = volume;
                    },
                    duration: () => element.duration * 1000
                };
            }
        },
        time: () => new Date()
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dom;
;

},{}],2:[function(require,module,exports){
"use strict";
const sound_1 = require('./sound');
function startScene(items, fadeInDuration, outside) {
    fadeInDuration = fadeInDuration || 0;
    var startTime = outside.time();
    var hasEnded = false;
    var handles = [];
    var sceneHandle;
    var updateFade = function updateFadeIn() {
        var ratio = fadeRatio(startTime, outside.time(), fadeInDuration);
        sceneHandle.fade.step(ratio);
        handles.forEach(function (handle) {
            if (handle.fade)
                handle.fade(ratio);
        });
        if (ratio === 1) {
            sceneHandle.fade.stop();
            updateFade = nothing;
        }
    };
    function start(items, fadeInDuration, outside) {
        sceneHandle = outside.start.scene ? outside.start.scene(update) : {};
        sceneHandle = sceneHandle || {};
        sceneHandle.stop = sceneHandle.stop || nothing;
        sceneHandle.fade = sceneHandle.fade || {};
        sceneHandle.fade.start = sceneHandle.fade.start || nothing;
        sceneHandle.fade.step = sceneHandle.fade.step || nothing;
        sceneHandle.fade.stop = sceneHandle.fade.stop || nothing;
        sceneHandle.fade.start();
        handles = items.map(function (item) {
            if (item.type === 'sound') {
                return sound_1.default(item, outside, update, () => {
                    if (onlySound(items))
                        end();
                });
            }
            else {
                return outside.start[item.type](item, update);
            }
        });
        return stop;
    }
    function onlySound(items) {
        return items.every(i => i.type === 'sound');
    }
    function update() {
        handles.forEach(function (handle) {
            if (handle.update) {
                handle.update();
            }
        });
        updateFade();
    }
    const stop = once(fadeOutDuration => {
        const stopTime = outside.time();
        updateFade = function updateFadeOut() {
            var ratio = 1 - fadeRatio(stopTime, outside.time(), fadeOutDuration);
            sceneHandle.fade.step(ratio);
            handles.forEach(function (handle) {
                if (handle.fade)
                    handle.fade(ratio);
            });
            if (ratio === 0) {
                end();
            }
        };
        sceneHandle.fade.start();
        if (fadeOutDuration === 0) {
            end();
        }
        return end;
    });
    function end() {
        if (!hasEnded) {
            hasEnded = true;
            updateFade = nothing;
            handles.forEach(function (handle) {
                handle.stop();
            });
            sceneHandle.fade.stop();
            sceneHandle.stop();
        }
    }
    function fadeRatio(startTime, currentTime, duration) {
        var elapsed = currentTime - startTime;
        if (duration === 0) {
            return 1;
        }
        else {
            var ratio = elapsed / duration;
            var boundedRatio = Math.min(Math.max(ratio, 0), 1);
            return boundedRatio;
        }
    }
    function nothing() { }
    function constant(value) {
        return function () {
            return value;
        };
    }
    function once(callback) {
        let called = false;
        let result = null;
        return function () {
            if (!called) {
                called = true;
                result = callback.apply(undefined, arguments);
            }
            return result;
        };
    }
    return start(items, fadeInDuration, outside);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startScene;
;

},{"./sound":3}],3:[function(require,module,exports){
"use strict";
function startSound(sound, outside, updateScene, abortSceneIfSoundOnly) {
    var loop = 'loop' in sound ? sound.loop : true;
    var shuffle = 'shuffle' in sound ? sound.shuffle : true;
    var overlap = sound.overlap || 0;
    var shuffleArray = outside.shuffle || shuffleArrayRandomly;
    var tracks = sound.tracks.slice();
    if (sound.tracks.length === 0) {
        throw new Error('Cannot start sound without tracks.');
    }
    if (shuffle) {
        tracks = shuffleArray(tracks);
    }
    const stopOutsideSound = outside.start.sound ? outside.start.sound() : nothing;
    const outsideTracks = [];
    var updateLatest = startTrack(0);
    const fadeSound = ratio => {
        outsideTracks.forEach(t => t.fade(ratio));
    };
    const stopSound = once(() => {
        outsideTracks.forEach(t => t.stop());
        stopOutsideSound();
        abortSceneIfSoundOnly();
    });
    return {
        fade: fadeSound,
        stop: stopSound,
        update: () => updateLatest()
    };
    function startTrack(index) {
        var startTime = outside.time();
        const outsideTrack = outside.start.track(tracks[index], updateScene);
        outsideTrack.stop = once(outsideTrack.stop);
        outsideTracks.push(outsideTrack);
        var updateNext = nothing;
        return function update() {
            var currentTime = outside.time();
            var elapsed = currentTime - startTime;
            const duration = outsideTrack.duration();
            if (isNaN(duration)) {
                return;
            }
            if (elapsed >= duration) {
                outsideTrack.stop();
                outsideTracks.splice(outsideTracks.indexOf(outsideTrack, 1));
            }
            if (elapsed >= duration - overlap && updateNext === nothing) {
                if ((index + 1) in tracks) {
                    updateNext = startTrack(index + 1);
                }
                else if (loop) {
                    if (shuffle) {
                        tracks = shuffleArray(tracks);
                    }
                    updateNext = startTrack(0);
                }
            }
            if (elapsed >= duration) {
                if (updateNext === nothing) {
                    stopSound();
                }
                else {
                    updateLatest = updateNext;
                }
            }
        };
    }
    function nothing() { }
    function once(callback) {
        let called = false;
        return () => {
            if (!called) {
                called = true;
                callback.apply(undefined, arguments);
            }
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startSound;
;
function shuffleArrayRandomly(array) {
    const source = array.slice();
    const result = [];
    while (source.length > 0) {
        const index = randomInteger(source.length - 1);
        result.push(source[index]);
        source.splice(index, 1);
    }
    return result;
}
function randomInteger(max) {
    return Math.floor(Math.random() * (max + 1));
}

},{}],4:[function(require,module,exports){
"use strict";
const scene_1 = require('./scene');
function stage(outside) {
    var abort = nothing;
    var stop = function (fade) {
        return nothing;
    };
    return function (items, fadeInDuration) {
        abort();
        abort = stop(fadeInDuration);
        stop = scene_1.default(items, fadeInDuration, outside);
    };
    function nothing() { }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stage;

},{"./scene":2}],5:[function(require,module,exports){
"use strict";
function default_1(backend) {
    function list(signal) {
        signal.adventureListDownloadStarted();
        return backend.search({
            mimeType: 'application/json',
            extension: 'ambience'
        })
            .then(function (ids) {
            signal.adventureListDownloadFinished(ids.length);
            const adventures = {};
            return Promise.all(ids.map(function (id) {
                signal.adventureDownloadStarted(id);
                return backend.download.contents(id).then(function (adventureToUpgrade) {
                    const adventure = adventureToUpgrade;
                    signal.adventureDownloadFinished(id);
                    adventure.id = id;
                    adventures[id] = adventure;
                });
            }))
                .then(function () {
                return adventures;
            });
        });
    }
    function download(id, progress) {
        return backend.download.blob(id, progress)
            .then(blob => URL.createObjectURL(blob));
    }
    function preview(id) {
        return backend.download.preview(id);
    }
    function authenticate(immediate) {
        return backend.authenticate(immediate);
    }
    return {
        list: list,
        download: download,
        preview: preview,
        authenticate: authenticate
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;

},{}],6:[function(require,module,exports){
"use strict";
function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
exports.clear = clear;
function remove(node) {
    return node.parentNode.removeChild(node);
}
exports.remove = remove;
function all(selector, node) {
    node = node || document;
    return [].slice.call(node.querySelectorAll(selector));
}
exports.all = all;
function first(selector, node) {
    node = node || document;
    return node.querySelector(selector);
}
exports.first = first;
function id(id) {
    return document.getElementById(id);
}
exports.id = id;
function on(node, event, listener) {
    node.addEventListener(event, listener);
}
exports.on = on;
function capture(node, event, listener) {
    node.addEventListener(event, listener, true);
}
exports.capture = capture;
function toggleClass(node, table) {
    Object.keys(table).forEach(className => {
        const value = table[className];
        value ? node.classList.add(className) : node.classList.remove(className);
    });
}
exports.toggleClass = toggleClass;
function replicate(table, container, options, mapping, state) {
    if (!state) {
        state = {
            template: container.removeChild(container.firstElementChild),
            nodes: {},
            first: true
        };
    }
    R.mapObjIndexed((node, key) => {
        if (!(key in table)) {
            node.remove();
        }
    }, state.nodes);
    const keys = Object.keys(table);
    const order = options.sort || R.identity;
    const filter = options.filter || (() => true);
    const nodes = R.sortBy(key => order(table[key]), keys).map(key => {
        const object = table[key];
        const instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        instance.hidden = !filter(object);
        map(mapping, object, instance, state.first);
        state.nodes[key] = instance;
        return instance;
    });
    nodes.forEach((node, index) => {
        if (node.parent !== container) {
            container.insertBefore(node, container.children[index]);
        }
    });
    state.first = false;
    return (table) => {
        return replicate(table, container, options, mapping, state);
    };
}
exports.replicate = replicate;
function map(selectors, object, ancestor, first) {
    R.mapObjIndexed((values, selector) => {
        if (typeof values !== 'object') {
            values = { text: values };
        }
        const matching = all(selector, ancestor).concat(ancestor.matches(selector) ? [ancestor] : []);
        matching.forEach(node => {
            R.mapObjIndexed((createValue, key) => {
                if (key === 'text') {
                    const value = createValue(object);
                    if (node.textContent !== value) {
                        node.textContent = value;
                    }
                }
                else if (key === 'class') {
                    R.mapObjIndexed((active, className) => {
                        node.classList.toggle(className, active(object));
                    }, createValue);
                }
                else if (key === 'style') {
                    R.mapObjIndexed((createCssValue, cssKey) => {
                        const cssValue = createCssValue(object);
                        if (node.style[cssKey] !== cssValue) {
                            node.style[cssKey] = cssValue;
                        }
                    }, createValue);
                }
                else if (key === 'on') {
                    if (first) {
                        R.mapObjIndexed((callback, eventName) => {
                            node.addEventListener(eventName, () => callback(object, node));
                        }, createValue);
                    }
                }
                else if (key === 'node') {
                    if (first)
                        createValue(node, object);
                }
                else {
                    const value = createValue(object);
                    if (node[key] !== value) {
                        node[key] = value;
                    }
                }
            }, values);
        });
    }, selectors);
}
function matches(element, selector) {
    if (element.matches) {
        return element.matches(selector);
    }
    else {
        return element.msMatchesSelector(selector);
    }
}
exports.matches = matches;
function closest(element, selector) {
    if (element.closest) {
        return element.closest(selector);
    }
    else {
        return msClosest(element, selector);
    }
}
exports.closest = closest;
function msClosest(element, selector) {
    if (!element) {
        return element;
    }
    else if (matches(element, selector)) {
        return element;
    }
    else {
        return msClosest(element.parentNode, selector);
    }
}
function origin(link) {
    if (link.origin) {
        return link.origin;
    }
    else {
        return link.protocol + '//' + link.hostname;
    }
}
exports.origin = origin;
function selectText(element) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}
exports.selectText = selectText;
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject());
        document.head.appendChild(script);
    });
}
exports.loadScript = loadScript;
function enterFullscreen(element) {
    element = element || document;
    [
        'webkitRequestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullscreen',
        'mozRequestFullScreen',
        'requestFullscreen'
    ].forEach(f => {
        if (f in element)
            element[f]();
    });
}
exports.enterFullscreen = enterFullscreen;
function key(code) {
    const keys = {
        8: 'Backspace',
        9: 'Tab',
        13: 'Enter',
        27: 'Escape',
        32: 'Space',
        46: 'Delete',
        112: 'F1',
        113: 'F2',
        114: 'F3',
        115: 'F4',
        116: 'F5',
        117: 'F6',
        118: 'F7',
        119: 'F8',
        120: 'F9',
        121: 'F10',
        122: 'F11',
        123: 'F12'
    };
    return code in keys ? keys[code] : String.fromCharCode(code);
}
exports.key = key;

},{}],7:[function(require,module,exports){
"use strict";
const library_1 = require('./adventure/library');
const google_drive_1 = require('./storage/google-drive');
const loading_library_1 = require('./views/loading-library');
const soundboard_1 = require('./views/soundboard');
const google_drive_2 = require('./views/google-drive');
const dom = require('./document');
const stage_1 = require('../libraries/ambience-stage/stage');
const dom_1 = require('../libraries/ambience-stage/dom');
const state_machine_1 = require('./state-machine');
dom.on(window, 'DOMContentLoaded', () => {
    let state = state_machine_1.State.Loading;
    stateEntered(state);
    const appId = '907013371139';
    const library = library_1.default(google_drive_1.default(appId));
    const views = {
        googleDrive: google_drive_2.default(dom.id('google-drive'), {
            login: () => {
                enterState(state_machine_1.State.StartingSession);
                library.authenticate(false)
                    .then(loadLibrary)
                    .catch(() => enterState(state_machine_1.State.SessionError));
            }
        }),
        loadingLibrary: loading_library_1.default(dom.id('loading-library'))
    };
    enterState(state_machine_1.State.AccountPossiblyConnected);
    function showPage(id, fade = 0) {
        const pages = dom.all('.page');
        dom.all('.page').forEach((p) => {
            if (p.id === id) {
                document.body.insertBefore(p, R.last(pages));
                p.hidden = false;
            }
            else if (!p.hidden) {
                fadeOut(p, fade);
            }
        });
        function fadeOut(node, duration) {
            node.style.transitionProperty = 'opacity';
            node.style.transitionDuration = duration + 's';
            node.style.opacity = '0';
            setTimeout(() => {
                node.style.transitionProperty = '';
                node.style.transitionDuration = '';
                node.style.opacity = '';
                node.hidden = true;
                document.body.insertBefore(node, pages[0]);
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
            .catch(e => enterState(state_machine_1.State.SessionError));
    }
    let selectedAdventure = null;
    function startSoundboard(adventures) {
        const previews = {};
        const files = {};
        const loadFile = R.memoize((id) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    soundboard.fileProgress(id, 0);
                    return library.download(id, (ratio) => soundboard.fileProgress(id, ratio))
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
            adventureSelected: (id) => {
                const adventure = adventures[id];
                selectedAdventure = adventure;
                adventure.scenes.forEach((scene) => {
                    if (scene.image.file && !(scene.image.file.id in previews)) {
                        previews[scene.image.file.id] = library.preview(scene.image.file.id)
                            .then((url) => soundboard.previewLoaded(scene.image.file.id, url));
                    }
                    scene.sound.tracks.forEach((t) => loadFile(t.id).then((url) => {
                        soundboard.fileLoaded(t.id, url);
                    }));
                });
            }
        });
        dom.on(document, 'keydown', (event) => {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        dom.on(document, 'keypress', (event) => {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        function playSceneWithHotkey(hotkey) {
            if (!selectedAdventure)
                return;
            const scenes = selectedAdventure.scenes.filter((s) => s.key === hotkey);
            scenes.forEach(playScene);
        }
        function stopAllScenes() {
            background([], 0);
            foreground([], 0);
        }
        function playScene(scene) {
            Promise.all([
                scene.image.file ? loadFile(scene.image.file.id) : null,
                Promise.all(scene.sound.tracks.map((t) => loadFile(t.id)))
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
    }
    function attemptImmediateLogin() {
        library.authenticate(true)
            .then(() => enterState(state_machine_1.State.AccountConnected))
            .catch(() => enterState(state_machine_1.State.AccountNotConnected));
    }
    function enterState(newState) {
        if (R.contains(newState, state_machine_1.transitions(state))) {
            state = newState;
            stateEntered(newState);
        }
        else {
            throw new Error('Invalid state transition: ' + state + ' to ' + newState);
        }
    }
    function stateEntered(state) {
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
            default: throw new Error('Unhandled state: ' + state);
        }
    }
});

},{"../libraries/ambience-stage/dom":1,"../libraries/ambience-stage/stage":4,"./adventure/library":5,"./document":6,"./state-machine":8,"./storage/google-drive":9,"./views/google-drive":10,"./views/loading-library":11,"./views/soundboard":12}],8:[function(require,module,exports){
"use strict";
(function (State) {
    State[State["Loading"] = 0] = "Loading";
    State[State["AccountPossiblyConnected"] = 1] = "AccountPossiblyConnected";
    State[State["AccountConnected"] = 2] = "AccountConnected";
    State[State["AccountNotConnected"] = 3] = "AccountNotConnected";
    State[State["StartingSession"] = 4] = "StartingSession";
    State[State["SessionStarted"] = 5] = "SessionStarted";
    State[State["LibraryLoaded"] = 6] = "LibraryLoaded";
    State[State["SessionError"] = 7] = "SessionError";
})(exports.State || (exports.State = {}));
var State = exports.State;
;
function transitions(s) {
    if (s === State.Loading)
        return [State.AccountPossiblyConnected];
    if (s === State.AccountPossiblyConnected)
        return [State.AccountConnected, State.AccountNotConnected];
    if (s === State.AccountConnected)
        return [State.StartingSession];
    if (s === State.AccountNotConnected)
        return [State.StartingSession];
    if (s === State.StartingSession)
        return [State.SessionStarted, State.SessionError];
    if (s === State.SessionStarted)
        return [State.LibraryLoaded, State.SessionError];
    if (s === State.LibraryLoaded)
        return [State.SessionError];
    if (s === State.SessionError)
        return [State.StartingSession];
    return [];
}
exports.transitions = transitions;

},{}],9:[function(require,module,exports){
"use strict";
function default_1(appId) {
    const ids = {
        app: appId
    };
    ids.client = ids.app + '.apps.googleusercontent.com';
    const urls = {
        files: 'https://www.googleapis.com/drive/v2/files',
        client: 'https://apis.google.com/js/client.js',
        scope: 'https://www.googleapis.com/auth/drive'
    };
    function downloadMetadata(id) {
        const url = urls.files + '/' + id;
        return request('GET', url);
    }
    function downloadContents(id) {
        const url = urls.files + '/' + id + '?alt=media';
        return request('GET', url);
    }
    function downloadBlob(id, progress) {
        const url = urls.files + '/' + id + '?alt=media';
        return request('GET', url, { responseType: 'blob', progress: progress });
    }
    function downloadPreview(id) {
        return downloadMetadata(id).then((metadata) => metadata.thumbnailLink);
    }
    function search(options) {
        const mimeType = options.mimeType;
        const extension = options.extension;
        const query = "trashed=false and mimeType='" + mimeType + "'";
        const url = urls.files + '?q=' + encodeURIComponent(query);
        return searchPage(url, extension);
    }
    function searchPage(url, extension) {
        return request('GET', url)
            .then(function (listing) {
            const items = listing.items.filter(function (item) {
                return item.fileExtension === extension;
            })
                .map(function (item) {
                return item.id;
            });
            if ('nextLink' in listing) {
                return searchPage(listing.nextLink, extension);
            }
            else {
                return items;
            }
        });
    }
    function request(method, url, options) {
        options = options || {};
        return loadAccessToken(true)
            .then(function (token) {
            return http(method, url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                responseType: options.responseType || '',
                progress: options.progress
            });
        });
    }
    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            const element = document.createElement('script');
            element.addEventListener('load', function () { resolve(); });
            element.addEventListener('error', function () { reject(); });
            element.async = true;
            element.src = url;
            document.head.appendChild(element);
        });
    }
    function loadGoogleApi() {
        return new Promise(function (resolve, reject) {
            loadScript(urls.client)
                .then(function () {
                gapi.load('client', { callback: function () {
                        resolve();
                    } });
            });
        });
    }
    let accessToken = null;
    function loadAccessToken(immediate) {
        return new Promise(function (resolve, reject) {
            if (accessToken) {
                resolve(accessToken);
            }
            else {
                loadGoogleApi()
                    .then(() => {
                    gapi.auth.authorize({
                        client_id: ids.client,
                        scope: urls.scope,
                        immediate: immediate
                    }, (result) => {
                        if (result && !result.error) {
                            accessToken = result.access_token;
                            resolve(accessToken);
                        }
                        else {
                            reject();
                        }
                    });
                });
            }
        });
    }
    function http(method, url, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.responseType = options.responseType || '';
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.responseType = options.responseType;
            Object.keys(options.headers).forEach(function (key) {
                const value = options.headers[key];
                xhr.setRequestHeader(key, value);
            });
            xhr.addEventListener('load', function () {
                let response = options.responseType
                    ? xhr.response
                    : responseFromRequest(xhr);
                resolve(response);
            });
            xhr.addEventListener('error', function (e) { reject(e); });
            xhr.addEventListener('abort', function (e) { reject(e); });
            if (options.progress) {
                xhr.addEventListener('progress', e => {
                    if (e.lengthComputable) {
                        options.progress(e.loaded / e.total);
                    }
                });
            }
            xhr.send();
        });
    }
    function responseFromRequest(xhr) {
        let mimeTypeString = xhr.getResponseHeader('Content-Type');
        let mimeType = mimeTypeString.split(';')[0];
        if (mimeType === 'application/json') {
            return JSON.parse(xhr.responseText);
        }
        else {
            return xhr.responseText;
        }
    }
    return {
        authenticate: (immediate) => loadAccessToken(immediate),
        download: {
            metadata: downloadMetadata,
            contents: downloadContents,
            blob: downloadBlob,
            preview: downloadPreview
        },
        search: search
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;

},{}],10:[function(require,module,exports){
"use strict";
const dom = require('../document');
function default_1(page, signal) {
    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        signal.login();
    });
    return {};
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":6}],11:[function(require,module,exports){
"use strict";
const dom = require('../document');
function default_1(page) {
    dom.first('progress', page).value = 0;
    const events = dom.first('.events', page);
    const template = events.firstElementChild;
    template.remove();
    return {
        progress: ratio => {
            dom.first('progress', page).value = ratio;
        },
        event: text => {
            const instance = template.cloneNode(true);
            instance.textContent = text;
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":6}],12:[function(require,module,exports){
"use strict";
const dom = require('../document');
function default_1(options) {
    const dropdown = options.dropdown;
    const adventures = options.adventures;
    const scenes = R.fromPairs(R.unnest(R.values(adventures).map(adventure => {
        return adventure.scenes.map((scene, i) => [adventure.id + '/' + i, scene]);
    })));
    const previews = {};
    const files = {};
    const progressCallbacks = [];
    dom.replicate(adventures, dropdown, { sort: a => a.title }, {
        'option': {
            text: adventure => adventure.title,
            value: adventure => adventure.id
        }
    });
    const render = dom.replicate(scenes, dom.first('.scene-list'), {
        filter: scene => selectedAdventure().scenes.includes(scene)
    }, {
        '.scene': { node: (node, scene) => {
                progressCallbacks.push(files => {
                    const loading = scene.sound.tracks.some(t => typeof files[t.id] === 'number');
                    node.classList.toggle('loading', loading);
                });
            } },
        '.scene-title': scene => scene.name || String.fromCharCode(160),
        '.scene-hotkey': scene => scene.key || '',
        '.scene-button': { on: { click: options.playScene } },
        '.scene-preview-image': {
            hidden: scene => !scene.image.file,
            on: { load: (scene, image) => image.classList.add('loaded') },
            src: scene => hasImagePreview(scene)
                ? previews[scene.image.file.id]
                : ''
        },
        'progress': { node: (node, scene) => {
                progressCallbacks.push(files => {
                    node.value = combinedProgress(scene.sound.tracks, files);
                });
            } }
    });
    function hasImagePreview(scene) {
        return scene.image.file && typeof previews[scene.image.file.id] === 'string';
    }
    function renderProgress() {
        progressCallbacks.forEach(callback => callback(files));
    }
    function combinedProgress(tracks, files) {
        return tracks.length === 0
            ? 1
            : R.sum(tracks.map(t => singleProgress(files[t.id]))) / tracks.length;
    }
    function singleProgress(progress) {
        if (typeof progress === 'string') {
            return 1;
        }
        else if (typeof progress === 'number') {
            return progress;
        }
        else {
            return 0;
        }
    }
    dropdown.addEventListener('change', showCurrentAdventure);
    showCurrentAdventure();
    function showCurrentAdventure() {
        showAdventure(selectedAdventure());
    }
    function selectedAdventure() {
        const id = dropdown.value;
        return adventures[id];
    }
    function showAdventure(adventure) {
        render(scenes);
        options.adventureSelected(adventure.id);
    }
    dom.on(dom.id('stage-button'), 'click', () => {
        dom.enterFullscreen(dom.id('stage'));
    });
    dom.on(dom.id('remote-button'), 'click', () => {
        dom.enterFullscreen(document.documentElement);
    });
    return {
        previewLoaded: (id, url) => {
            previews[id] = url;
            render(scenes);
        },
        fileProgress: (id, ratio) => {
            files[id] = ratio;
            renderProgress();
        },
        fileLoaded: (id, url) => {
            files[id] = url;
            renderProgress();
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;

},{"../document":6}]},{},[7]);
