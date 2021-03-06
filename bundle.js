(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
function dom(container) {
    return {
        time: function () { return new Date().getTime(); },
        scene: function (update) {
            var scene = document.createElement('div');
            scene.className = 'scene';
            container.appendChild(scene);
            var fading = {
                in: true,
                out: false
            };
            requestAnimationFrame(function frame() {
                if (fading.in) {
                    update();
                    requestAnimationFrame(frame);
                }
            });
            function step(opacity) {
                scene.style.opacity = String(Math.min(opacity, 0.999));
            }
            return {
                fade: {
                    in: {
                        step: step,
                        stop: function () { return fading.in = false; }
                    },
                    out: {
                        start: function () {
                            fading.out = true;
                            requestAnimationFrame(function frame() {
                                if (fading.out) {
                                    update();
                                    requestAnimationFrame(frame);
                                }
                            });
                        },
                        step: step
                    }
                },
                stop: function () {
                    container.removeChild(scene);
                    fading.out = false;
                },
                image: function (image) {
                    var element = document.createElement('img');
                    element.src = image.url;
                    element.className = 'image';
                    scene.appendChild(element);
                    if (image.style) {
                        Object.keys(image.style).forEach(function (cssKey) {
                            var cssValue = image.style[cssKey];
                            element.style[cssKey] = cssValue;
                        });
                    }
                    return {
                        stop: function () { return scene.removeChild(element); }
                    };
                },
                sound: function () {
                    // Mobile Chrome (at least) only allows audio to be played
                    // as a direct result of user interaction, which means that
                    // overlap cannot trigger audio playback directly as it
                    // relies on non-interaction events. However, as soon as we
                    // call `play` on an audio element, we can trigger playback
                    // on that element later in any context. We thus create a
                    // pool of two audio elements that we then alternate between
                    // in order to support overlap.
                    var elements = {
                        busy: [],
                        idle: []
                    };
                    [0, 1].forEach(function (i) {
                        var element = document.createElement('audio');
                        element.play();
                        element.pause();
                        element.className = 'track';
                        elements.idle.push(element);
                    });
                    return {
                        stop: function () { },
                        track: function (url) {
                            var element = elements.idle.pop();
                            element.src = url;
                            element.className = 'track';
                            element.addEventListener('timeupdate', update);
                            scene.appendChild(element);
                            element.play();
                            elements.busy.push(element);
                            return {
                                stop: function () {
                                    element.pause();
                                    scene.removeChild(element);
                                    element.currentTime = 0;
                                    element.src = '';
                                    element.removeEventListener('timeupdate', update);
                                    elements.busy.splice(elements.busy.indexOf(element), 1);
                                    elements.idle.push(element);
                                },
                                fade: function (volume) {
                                    element.volume = volume;
                                },
                                duration: function () { return element.duration * 1000; }
                            };
                        }
                    };
                }
            };
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dom;
;

},{}],2:[function(require,module,exports){
"use strict";
var sound_1 = require('./sound');
var SceneState;
(function (SceneState) {
    SceneState[SceneState["Starting"] = 0] = "Starting";
    SceneState[SceneState["FadingIn"] = 1] = "FadingIn";
    SceneState[SceneState["Playing"] = 2] = "Playing";
    SceneState[SceneState["FadingOut"] = 3] = "FadingOut";
    SceneState[SceneState["Ended"] = 4] = "Ended";
})(SceneState || (SceneState = {}));
function startScene(items, fadeInDuration, volume, outside) {
    if (fadeInDuration === void 0) { fadeInDuration = 0; }
    if (volume === void 0) { volume = 1; }
    var fadeOutDuration = null;
    var started = null;
    var stopped = null;
    var handles = {
        scene: null,
        items: null
    };
    var state = SceneState.Starting;
    enterState(SceneState.FadingIn);
    function validTransition(before, after) {
        switch (after) {
            case SceneState.FadingIn:
                return before === SceneState.Starting;
            case SceneState.Playing:
                return before === SceneState.FadingIn;
            case SceneState.FadingOut:
                return before === SceneState.FadingIn || before === SceneState.Playing;
            case SceneState.Ended:
                return before === SceneState.FadingOut;
            default:
                throw new Error('Invalid state: ' + after);
        }
    }
    function enterState(newState) {
        if (!validTransition(state, newState)) {
            throw new Error('Invalid transition: ' + state + ' to ' + newState);
        }
        var time = outside.time();
        if (newState === SceneState.FadingIn) {
            started = time;
            handles.scene = outside.scene(update);
            handles.items = items.map(function (item) {
                if (item.type === 'sound') {
                    var callbacks = {
                        time: outside.time,
                        shuffle: outside.shuffle,
                        sound: handles.scene.sound,
                        track: handles.scene.track
                    };
                    return {
                        type: 'sound',
                        callback: sound_1.default(item, callbacks)
                    };
                }
                else {
                    return {
                        type: item.type,
                        callback: handles.scene[item.type](item, update)
                    };
                }
            });
            handles.scene.stop = once(handles.scene.stop);
            handles.scene.fade.in.stop = once(handles.scene.fade.in.stop);
            handles.scene.fade.out.start = once(handles.scene.fade.out.start);
        }
        else if (newState === SceneState.Playing) {
            handles.scene.fade.in.step(1);
            handles.scene.fade.in.stop();
        }
        else if (newState === SceneState.FadingOut) {
            stopped = time;
            // If we're jumping straight to fade-out from fade-in, make sure
            // that the fade-in is completed, because that is otherwise done
            // when the transition completes normally.
            if (state === SceneState.FadingIn) {
                handles.scene.fade.in.step(1);
                handles.scene.fade.in.stop();
            }
            handles.scene.fade.out.start();
        }
        else if (newState === SceneState.Ended) {
            handles.scene.fade.out.step(0);
            handles.items.forEach(function (handle) {
                handle.callback.stop();
            });
            handles.scene.stop();
        }
        else {
            throw new Error('Invalid transition: ' + newState);
        }
        state = newState;
    }
    function update() {
        var time = outside.time();
        var scenesPlaying = [];
        if (state === SceneState.FadingIn) {
            var progress = fadeInDuration === 0 ? 1 : bound(0, 1, (time - started) / fadeInDuration);
            invariant(0 <= progress && progress <= 1, 'Fade-in progress between 0 and 1', progress);
            var fadeInEnding = progress === 1;
            var opacity = progress;
            scenesPlaying = updateHandles(time, opacity);
            if (fadeInEnding) {
                enterState(SceneState.Playing);
            }
            else {
                handles.scene.fade.in.step(progress);
            }
        }
        else if (state === SceneState.Playing) {
            var opacity = 1;
            scenesPlaying = updateHandles(time, opacity);
        }
        else if (state === SceneState.FadingOut) {
            var progress = fadeOutDuration === 0 ? 1 : bound(0, 1, (time - stopped) / fadeOutDuration);
            invariant(0 <= progress && progress <= 1, 'Fade-out progress between 0 and 1', progress);
            var opacity = 1 - progress;
            scenesPlaying = updateHandles(time, opacity);
            var isEnding = time >= stopped + fadeOutDuration;
            if (isEnding) {
                enterState(SceneState.Ended);
            }
            else {
                handles.scene.fade.out.step(opacity);
            }
        }
        if (scenesPlaying.some(function (p) { return p === false; }) && onlySound(items)) {
            end();
        }
    }
    function checkForEnd(time) {
        if (time >= stopped + fadeOutDuration) {
            enterState(SceneState.Ended);
        }
    }
    function updateHandles(time, opacity) {
        var scenesPlaying = handles.items.map(function (handle) {
            if (handle.callback.update) {
                if (handle.type === 'sound') {
                    return handle.callback.update();
                }
                else {
                    return handle.callback.update();
                }
            }
            else {
                return true;
            }
        });
        handles.items.forEach(function (handle) {
            if (handle.callback.fade) {
                if (handle.type === 'sound') {
                    handle.callback.fade(opacity * volume);
                }
                else {
                    handle.callback.fade(opacity);
                }
            }
        });
        return scenesPlaying;
    }
    var stop = function (fadeDuration) {
        if (fadeDuration === void 0) { fadeDuration = 0; }
        if (state === SceneState.FadingIn || state === SceneState.Playing) {
            stopped = outside.time();
            fadeOutDuration = fadeDuration;
            enterState(SceneState.FadingOut);
            update();
        }
        else {
            end();
        }
    };
    var end = function () {
        if (state !== SceneState.Ended) {
            fadeOutDuration = 0;
            if (state === SceneState.FadingIn || state === SceneState.Playing) {
                enterState(SceneState.FadingOut);
            }
            enterState(SceneState.Ended);
        }
    };
    return {
        stop: stop,
        volume: function (newVolume) {
            volume = newVolume;
            update();
        }
    };
    function onlySound(items) {
        return items.every(function (i) { return i.type === 'sound'; });
    }
    function nothing() { }
    function once(callback) {
        var called = false;
        // Function keyword in order to capture arguments.
        return function () {
            if (called) {
                throw new Error('Function called more than once');
            }
            else {
                called = true;
                return callback.apply(undefined, arguments);
            }
        };
    }
    function bound(min, max, value) {
        invariant(min <= max, 'Lower bound lower than upper bound', min, max);
        var boundedAbove = Math.min(value, max);
        return Math.max(min, boundedAbove);
    }
    function invariant(expression, description) {
        var values = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            values[_i - 2] = arguments[_i];
        }
        if (expression !== true) {
            throw new Error('Invariant broken: ' + description + '\n' +
                'Values: ' + values.join(', '));
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startScene;
;

},{"./sound":3}],3:[function(require,module,exports){
"use strict";
function startSound(sound, outside) {
    var loop = 'loop' in sound ? sound.loop : true;
    var shuffle = 'shuffle' in sound ? sound.shuffle : true;
    var overlap = sound.overlap || 0;
    var shuffleArray = outside.shuffle || shuffleArrayRandomly;
    var volume = 0;
    var tracks = sound.tracks.slice();
    if (sound.tracks.length === 0) {
        throw new Error('Cannot start sound without tracks.');
    }
    if (shuffle) {
        tracks = shuffleArray(tracks);
    }
    var soundHandle = outside.sound();
    var outsideTracks = [];
    var updateLatest = startTrack(0);
    var fadeSound = function (newVolume) {
        volume = newVolume;
        outsideTracks.forEach(function (t) { return t.fade(volume); });
    };
    var stopSound = once(function () {
        outsideTracks.forEach(function (t) { return t.stop(); });
        soundHandle.stop();
    });
    return {
        fade: fadeSound,
        stop: stopSound,
        update: function () { return updateLatest(); }
    };
    function startTrack(index) {
        var startTime = outside.time();
        var outsideTrack = soundHandle.track(tracks[index]);
        outsideTrack.stop = once(outsideTrack.stop);
        outsideTracks.push(outsideTrack);
        outsideTrack.fade(volume);
        var updateNext = nothing;
        return function update() {
            var currentTime = outside.time();
            var elapsed = currentTime - startTime;
            var duration = outsideTrack.duration();
            // Duration not known yet, so don't attempt any overlap until it is.
            if (isNaN(duration)) {
                return true;
            }
            if (elapsed >= duration) {
                outsideTrack.stop();
                remove(outsideTrack, outsideTracks);
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
                    return false;
                }
                else {
                    updateLatest = updateNext;
                }
            }
            return true;
        };
    }
    function nothing() {
        return true;
    }
    function once(callback) {
        var args = arguments;
        var called = false;
        return function () {
            if (!called) {
                called = true;
                callback.apply(undefined, args);
            }
        };
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = startSound;
;
function shuffleArrayRandomly(array) {
    var source = array.slice();
    var result = [];
    while (source.length > 0) {
        var index = randomInteger(source.length - 1);
        result.push(source[index]);
        source.splice(index, 1);
    }
    return result;
}
function randomInteger(max) {
    return Math.floor(Math.random() * (max + 1));
}
function remove(value, array) {
    array.splice(array.indexOf(value), 1);
}

},{}],4:[function(require,module,exports){
"use strict";
var scene_1 = require('./scene');
function stage(outside) {
    var fadingOut = null;
    var fadingIn = null;
    var volume = 1;
    return {
        start: function (items, fadeInDuration) {
            if (fadeInDuration === void 0) { fadeInDuration = 0; }
            if (fadingOut)
                fadingOut.stop();
            fadingOut = fadingIn;
            if (fadingOut)
                fadingOut.stop(fadeInDuration);
            fadingIn = scene_1.default(items, fadeInDuration, volume, outside);
        },
        volume: function (newVolume) {
            volume = newVolume;
            if (fadingOut)
                fadingOut.volume(newVolume);
            if (fadingIn)
                fadingIn.volume(newVolume);
        }
    };
    function nothing() { }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stage;

},{"./scene":2}],5:[function(require,module,exports){
"use strict";
var upgrade_1 = require('./upgrade');
function default_1(backend) {
    function list(signal) {
        signal.adventureListDownloadStarted();
        return backend.search({
            mimeType: 'application/json',
            extension: 'ambience'
        })
            .then(function (ids) {
            signal.adventureListDownloadFinished(ids.length);
            var adventures = {};
            return Promise.all(ids.map(function (id) {
                signal.adventureDownloadStarted(id);
                return backend.download.contents(id).then(function (adventureToUpgrade) {
                    var adventure = upgrade_1.default(adventureToUpgrade);
                    signal.adventureDownloadFinished(id);
                    adventure.id = id;
                    adventures[id] = adventure;
                })
                    .catch(function () { return signal.adventureDownloadError(id); });
            }))
                .then(function () {
                return adventures;
            });
        });
    }
    function download(id, progress) {
        return backend.download.blob(id, progress)
            .then(function (blob) { return URL.createObjectURL(blob); });
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

},{"./upgrade":6}],6:[function(require,module,exports){
"use strict";
function default_1(adventure) {
    upgradeOlderVersions(adventure);
    if (adventure.version !== 4) {
        throw new Error('Upgrade only supported from version 4 to 5.');
    }
    adventure.scenes.forEach(upgradeScene);
    adventure.version = 5;
    return adventure;
    function upgradeScene(scene) {
        if (!scene.key) {
            scene.key = null;
        }
        delete scene.mixin;
        var fadesIn = scene.fade.direction.indexOf('in') !== -1;
        scene.fade.in = fadesIn ? scene.fade.duration : 0;
        var fadesOut = scene.fade.direction.indexOf('out') !== -1;
        scene.fade.out = fadesOut ? scene.fade.duration : 0;
        delete scene.fade.duration;
        delete scene.fade.direction;
        scene.background = scene.background.color;
        scene.media = [];
        if (scene.image.file) {
            scene.media.push({
                type: 'image',
                file: scene.image.file.id,
                size: scene.image.size
            });
        }
        delete scene.image;
        if (scene.text.string.length > 0) {
            scene.media.push({
                type: 'text',
                string: scene.text.string,
                size: scene.text.size,
                font: scene.text.font ? scene.text.font : null,
                color: scene.text.color,
                bold: scene.text.bold,
                italic: scene.text.italic,
                alignment: scene.text.alignment,
                padding: scene.text.padding
            });
        }
        delete scene.text;
        if (scene.sound.tracks.length > 0) {
            scene.media.push({
                type: 'sound',
                tracks: scene.sound.tracks.map(function (t) { return t.id; }),
                loop: scene.sound.loop,
                shuffle: scene.sound.shuffle,
                volume: scene.sound.volume / 100,
                overlap: scene.sound.overlap
            });
        }
        delete scene.sound;
        return scene;
    }
    // The code below (including comments) is taken straight from the previous
    // version of RPG Ambience, which also includes tests for it. To keep things
    // simple, the tests are not included in this version.
    function upgradeOlderVersions(config) {
        if (config.version === 2) {
            // Adventures of version 2 only contain IDs of media files, not
            // names and MIME types. Add these here so that they are properly
            // queued when downloaded.
            config.scenes.forEach(function (scene) {
                var imageFile = scene.image.file;
                if (imageFile) {
                    imageFile.name = 'Unknown filename';
                    imageFile.mimeType = 'image/unknown';
                }
                scene.sound.tracks.forEach(function (soundFile) {
                    soundFile.name = 'Unknown filename';
                    soundFile.mimeType = 'audio/unknown';
                });
            });
            config.version = 3;
        }
        if (config.version === 3) {
            delete config.creationDate;
            delete config.modificationDate;
            config.version = 4;
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;

},{}],7:[function(require,module,exports){
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
function array(arraylike) {
    if ('from' in Array) {
        return Array.from(arraylike);
    }
    else {
        return Array.prototype.slice.call(arraylike);
    }
}
exports.array = array;
function toggleClass(node, table) {
    Object.keys(table).forEach(function (className) {
        var value = table[className];
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
    R.mapObjIndexed(function (node, key) {
        if (!(key in table)) {
            node.remove();
        }
    }, state.nodes);
    var keys = Object.keys(table);
    var order = options.sort || R.identity;
    var filter = options.filter || (function () { return true; });
    var nodes = R.sortBy(function (key) { return order(table[key]); }, keys).map(function (key) {
        var object = table[key];
        var instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        instance.hidden = !filter(object);
        map(mapping, object, instance, state.first);
        state.nodes[key] = instance;
        return instance;
    });
    nodes.forEach(function (node, index) {
        if (node.parent !== container) {
            container.insertBefore(node, container.children[index]);
        }
    });
    state.first = false;
    return function (table) {
        return replicate(table, container, options, mapping, state);
    };
}
exports.replicate = replicate;
function map(selectors, object, ancestor, first) {
    R.mapObjIndexed(function (values, selector) {
        if (typeof values !== 'object') {
            values = { text: values };
        }
        var matching = all(selector, ancestor).concat(matches(ancestor, selector) ? [ancestor] : []);
        matching.forEach(function (node) {
            R.mapObjIndexed(function (createValue, key) {
                if (key === 'text') {
                    var value = createValue(object);
                    if (node.textContent !== value) {
                        node.textContent = value;
                    }
                }
                else if (key === 'class') {
                    R.mapObjIndexed(function (active, className) {
                        node.classList.toggle(className, active(object));
                    }, createValue);
                }
                else if (key === 'style') {
                    R.mapObjIndexed(function (createCssValue, cssKey) {
                        var cssValue = createCssValue(object);
                        if (node.style[cssKey] !== cssValue) {
                            node.style[cssKey] = cssValue;
                        }
                    }, createValue);
                }
                else if (key === 'on') {
                    if (first) {
                        R.mapObjIndexed(function (callback, eventName) {
                            node.addEventListener(eventName, function () { return callback(object, node); });
                        }, createValue);
                    }
                }
                else if (key === 'node') {
                    if (first)
                        createValue(node, object);
                }
                else {
                    var value = createValue(object);
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
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}
exports.selectText = selectText;
function loadScript(url) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.addEventListener('load', function () { return resolve(); });
        script.addEventListener('error', function () { return reject(); });
        document.head.appendChild(script);
    });
}
exports.loadScript = loadScript;
function enterFullscreen(element) {
    element = element || document.documentElement;
    [
        'webkitRequestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullscreen',
        'mozRequestFullScreen',
        'requestFullscreen'
    ].forEach(function (f) {
        if (f in element)
            element[f]();
    });
}
exports.enterFullscreen = enterFullscreen;
function toggleFullscreen(element) {
    [
        'webkitFullscreenElement',
        'webkitFullScreenElement',
        'mozFullscreenElement',
        'mozFullScreenElement',
        'fullscreenElement'
    ].forEach(function (p) {
        if (p in document) {
            if (document[p]) {
                [
                    'webkitExitFullscreen',
                    'webkitExitFullScreen',
                    'mozExitFullScreen',
                    'mozExitFullScreen',
                    'exitFullscreen'
                ].forEach(function (f) {
                    if (f in document)
                        document[f]();
                });
            }
            else {
                enterFullscreen(element);
            }
        }
    });
}
exports.toggleFullscreen = toggleFullscreen;
function key(code) {
    var keys = {
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
function stateful(container, states) {
    var enterState = function (newState) {
        states.forEach(function (state) {
            var element = container.getElementsByClassName(state)[0];
            element.hidden = state !== newState;
        });
        enterState['current'] = newState;
    };
    enterState(states[0]);
    return enterState;
}
exports.stateful = stateful;

},{}],8:[function(require,module,exports){
"use strict";
var library_1 = require('./adventure/library');
var google_drive_1 = require('./storage/google-drive');
var loading_library_1 = require('./views/loading-library');
var soundboard_1 = require('./views/soundboard');
var google_drive_2 = require('./views/google-drive');
var session_error_1 = require('./views/session-error');
var welcome_1 = require('./views/welcome');
var online_play_1 = require('./views/online-play');
var dom = require('./document');
var ui = require('./ui');
var stage_1 = require('../libraries/ambience-stage/stage');
var dom_1 = require('../libraries/ambience-stage/dom');
var state_machine_1 = require('./state-machine');
var queue_1 = require('./queue');
var Persistence = require('./persistence');
var network_1 = require('./network');
var utils_1 = require('./utils');
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
        },
        session: {
            id: null,
            trigger: function () { },
            pause: function () { }
        }
    };
    var appId = '907013371139';
    var library = library_1.default(google_drive_1.default(appId));
    var views = {
        welcome: welcome_1.default(dom.id('welcome'), {
            dismiss: function () { return Storage.modify(function (store) { return store.welcomed = true; }); }
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
    enterState(state_machine_1.State.AccountPossiblyConnected);
    if (!Storage.read().welcomed) {
        ui.showDialog('welcome');
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
        document.body.insertBefore(next, previous.nextElementSibling);
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
            startSoundboard(adventures);
            enterState(state_machine_1.State.LibraryLoaded);
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
        if (Object.keys(adventures).length === 0) {
            showPage('no-adventures', 0.25);
            return;
        }
        else {
            showPage('soundboard', 0.25);
        }
        var network = network_1.default(appId, function (event, index) {
            latest.session.pause(function () {
                if (event.type === 'name')
                    playSceneWithName(event.name);
                if (event.type === 'hotkey')
                    playSceneWithHotkey(event.hotkey);
                if (event.type === 'stop')
                    stopAllScenes();
            });
        });
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
            },
            zoomLevel: Storage.read().zoom || 10,
            zoomed: function (level) {
                Storage.modify(function (store) { return store.zoom = level; });
            },
            playOnline: function () { return ui.showDialog('online-play'); }
        });
        var joinSession = function (id) {
            (id ? network.joinSession(id) : network.startSession(Storage.read().session)).then(function (session) {
                latest.session = session;
                var url = location.protocol + '//' + location.host + '/?session=' + encodeURIComponent(session.id);
                onlinePlayView.sessionJoined(url);
                Storage.modify(function (store) { return store.session = session.id; });
            })
                .catch(function (error) { return onlinePlayView.sessionError(error.message); });
        };
        var onlinePlayView = online_play_1.default(dom.id('online-play'), {
            startSession: joinSession,
            joinSession: joinSession,
            dismiss: function () { }
        });
        if (sessionInUrl()) {
            ui.showDialog('online-play');
            onlinePlayView.joiningSession();
            joinSession(sessionInUrl());
        }
        selectAdventure(adventureInUrl(location.pathname) ||
            Storage.read().adventure ||
            R.sortBy(function (id) { return adventures[id].title; }, Object.keys(adventures))[0]);
        dom.on(document, 'keydown', function (event) {
            playSceneWithHotkey(dom.key(event.keyCode));
        });
        dom.on(document, 'keypress', function (event) {
            playSceneWithHotkey(dom.key(event.charCode));
        });
        dom.on(window, 'popstate', function () {
            onPageChange(location.pathname);
        });
        function selectAdventure(id) {
            go('/' + id);
        }
        function adventureSelected(id) {
            if (!(id in adventures)) {
                return;
            }
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
            Storage.modify(function (store) { return store.adventure = id; });
        }
        function adventureInUrl(path) {
            var id = path.substring(1);
            return id ? id : null;
        }
        function go(path) {
            history.pushState(null, '', path);
            onPageChange(location.pathname);
        }
        function onPageChange(path) {
            if (adventureInUrl(path)) {
                adventureSelected(adventureInUrl(path));
            }
        }
        function playSceneWithHotkey(hotkey) {
            if (!selectedAdventure)
                return;
            var scenes = selectedAdventure.scenes.filter(function (s) { return s.key === hotkey; });
            scenes.forEach(playScene);
        }
        function playSceneWithName(name) {
            if (!selectedAdventure)
                return;
            var scenes = selectedAdventure.scenes.filter(function (s) { return s.name === name; });
            scenes.forEach(playScene);
        }
        function stopAllScenes() {
            latest.session.trigger({ type: 'stop' });
            background.start([], latest.fade.background * 1000);
            foreground.start([], latest.fade.foreground * 1000);
        }
        function playScene(scene) {
            if (scene.name) {
                latest.session.trigger({ type: 'name', name: scene.name });
            }
            else if (scene.hotkey) {
                latest.session.trigger({ type: 'hotkey', name: scene.hotkey });
            }
            var firstImage = scene.media.filter(function (m) { return m.type === 'image'; })[0];
            var firstSound = scene.media.filter(function (m) { return m.type === 'sound'; })[0] || { tracks: [] };
            Promise.all(firstSound.tracks.map(function (t) { return loadFile(t); }))
                .then(function (soundFiles) {
                var items = [];
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
            case state_machine_1.State.LibraryLoaded: break;
            case state_machine_1.State.SessionError:
                views.error.error(arg);
                showPage('session-error', 0.25);
                break;
            default: throw new Error('Unhandled state: ' + state);
        }
    }
    function sessionInUrl() {
        return utils_1.parseQuery(location)['session'];
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

},{"../libraries/ambience-stage/dom":1,"../libraries/ambience-stage/stage":4,"./adventure/library":5,"./document":7,"./network":9,"./persistence":10,"./queue":11,"./state-machine":12,"./storage/google-drive":13,"./ui":14,"./utils":15,"./views/google-drive":16,"./views/loading-library":17,"./views/online-play":18,"./views/session-error":19,"./views/soundboard":20,"./views/welcome":21}],9:[function(require,module,exports){
"use strict";
var dom = require('./document');
function default_1(appId, onEvent) {
    var loadOnce = R.memoize(load);
    return {
        startSession: function (id) { return loadOnce().then(function () { return host(id, onEvent); }); },
        joinSession: function (id) { return loadOnce().then(function () { return connect(id, onEvent); }); }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function host(id, onEvent) {
    if (id) {
        console.log('Hosting existing session: ' + id);
        return connect(id, onEvent).catch(function () {
            console.log('Error using existing file: ' + id + '; creating new file');
            return create().then(function (newId) { return connect(newId, onEvent); });
        });
    }
    else {
        console.log('Hosting new session');
        return create().then(function (newId) { return connect(newId, onEvent); });
    }
}
function connect(id, onEvent) {
    return new Promise(function (resolve, reject) {
        console.log('Connecting to session: ' + id);
        gapi.drive.realtime.load(id, startEditing, createModel, function (error) {
            // If the provided file does not exist (for example if its ID was
            // saved in the app but the file itself was removed from Google
            // Drive), simply create a new one.
            if (error.type === 'not_found') {
                host(null, onEvent).then(resolve).catch(reject);
            }
            else {
                reject(error);
            }
        });
        function startEditing(doc) {
            try {
                console.log('Connected to session: ' + id);
                var events_1 = doc.getModel().getRoot().get('events');
                events_1.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, function (event) {
                    if (!event.isLocal) {
                        event.values.forEach(function (v, i) { return onEvent(v, i + event.index); });
                    }
                });
                var paused_1 = false;
                resolve({
                    id: id,
                    trigger: function (newEvent) {
                        if (!paused_1) {
                            events_1.push(newEvent);
                        }
                    },
                    pause: function (callback) {
                        paused_1 = true;
                        callback();
                        paused_1 = false;
                    }
                });
            }
            catch (error) {
                reject(error);
                throw error;
            }
        }
        function createModel(model) {
            try {
                model.getRoot().set('events', model.createList());
            }
            catch (error) {
                reject(error);
                throw error;
            }
        }
    });
}
function create() {
    return new Promise(function (resolve, reject) {
        console.log('Creating new file');
        gapi.client.drive.files.create({
            resource: {
                name: 'RPG Ambience Soundboard ' + new Date().toLocaleString(),
                mimeType: 'application/vnd.google-apps.drive-sdk'
            }
        })
            .execute(function (file) {
            if (file.error) {
                reject(file.error);
            }
            else {
                console.log('Created new file: ' + file.id);
                gapi.client.drive.permissions.create({
                    fileId: file.id,
                    resource: {
                        type: 'anyone',
                        role: 'writer'
                    }
                })
                    .execute(function (permission) {
                    if (permission.error) {
                        reject(permission.error);
                    }
                    else {
                        resolve(file.id);
                    }
                });
            }
        });
    });
}
function load() {
    var scripts = [
        'https://apis.google.com/js/api.js',
        'https://www.gstatic.com/realtime/realtime-client-utils.js'
    ];
    return Promise.all(scripts.map(dom.loadScript))
        .then(function () {
        return new Promise(function (resolve, reject) {
            gapi.load('auth:client,drive-realtime,drive-share', function () {
                gapi.client.load('drive', 'v3').then(function () {
                    resolve();
                }, reject);
            }, reject);
        });
    });
}

},{"./document":7}],10:[function(require,module,exports){
"use strict";
function read(version, defaults) {
    var json = localStorage.getItem(version.toString());
    if (json === null) {
        return Object.assign({}, defaults);
    }
    else {
        try {
            var store = JSON.parse(json);
            if (typeof store === 'object' && !Array.isArray(store)) {
                return Object.assign({}, defaults, store);
            }
            else {
                return Object.assign({}, defaults);
            }
        }
        catch (error) {
            return Object.assign({}, defaults);
        }
    }
}
exports.read = read;
function modify(version, defaults, transaction) {
    var store = read(version, defaults);
    transaction(store);
    write(version, store);
}
exports.modify = modify;
function write(version, store) {
    var json = JSON.stringify(store);
    localStorage.setItem(version.toString(), json);
}

},{}],11:[function(require,module,exports){
"use strict";
function createQueue(limit) {
    var waiting = [];
    var running = [];
    var timer = null;
    function add(task) {
        return new Promise(function (resolve, reject) {
            waiting.unshift({
                resolve: resolve,
                reject: reject,
                task: task
            });
            schedule();
        });
    }
    function schedule() {
        if (timer === null) {
            timer = setTimeout(execute, 0);
        }
    }
    function execute() {
        timer = null;
        var starting = waiting.slice(0, limit - running.length);
        starting.forEach(function (entry) {
            waiting.splice(waiting.indexOf(entry), 1);
            running.push(entry);
            entry.task()
                .then(function (x) {
                entry.resolve(x);
                complete();
            })
                .catch(function (e) {
                entry.reject(e);
                complete();
            });
            function complete() {
                running.splice(running.indexOf(entry), 1);
                schedule();
            }
        });
    }
    return add;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createQueue;

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
"use strict";
function default_1(appId) {
    var ids = {
        app: appId
    };
    ids.client = ids.app + '.apps.googleusercontent.com';
    var urls = {
        files: 'https://www.googleapis.com/drive/v3/files',
        client: 'https://apis.google.com/js/client.js',
        api: 'https://apis.google.com/js/api.js',
        scope: 'https://www.googleapis.com/auth/drive'
    };
    function downloadMetadata(id) {
        var url = urls.files + '/' + id + '?fields=thumbnailLink';
        return request('GET', url);
    }
    function downloadContents(id) {
        var url = urls.files + '/' + id + '?alt=media';
        return request('GET', url);
    }
    function downloadBlob(id, progress) {
        var url = urls.files + '/' + id + '?alt=media';
        return request('GET', url, { responseType: 'blob', progress: progress });
    }
    function downloadPreview(id) {
        return downloadMetadata(id).then(function (metadata) {
            return metadata.thumbnailLink;
        });
    }
    function search(options) {
        var mimeType = options.mimeType;
        var extension = options.extension;
        var query = "trashed=false and mimeType='" + mimeType + "'";
        var url = urls.files + '?q=' + encodeURIComponent(query);
        return searchPage(url, extension);
    }
    function searchPage(url, extension) {
        return request('GET', url)
            .then(function (listing) {
            var items = listing.files.filter(function (item) {
                var tokens = item.name.split('.');
                return tokens[tokens.length - 1] === extension;
            })
                .map(function (item) {
                return item.id;
            });
            if ('nextLink' in listing) {
                return searchPage(urls.files + '?pageToken=' + encodeURIComponent(listing.nextPageToken), extension);
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
            var element = document.createElement('script');
            element.addEventListener('load', function () { return resolve(); });
            element.addEventListener('error', function () { return reject(new Error('Could not load script: ' + url)); });
            element.async = true;
            element.src = url;
            document.head.appendChild(element);
        });
    }
    function loadGoogleApi() {
        return new Promise(function (resolve, reject) {
            Promise.all([
                loadScript(urls.client)
                    .then(function () {
                    return new Promise(function (resolve, reject) {
                        gapi.load('client', { callback: function () { return resolve(); } });
                    });
                }),
                loadScript(urls.api)
                    .then(function () {
                    return new Promise(function (resolve, reject) {
                        gapi.load('drive-share', function () { return resolve(); });
                    });
                })
            ])
                .then(function () { return resolve(); })
                .catch(reject);
        });
    }
    var accessToken = null;
    function loadAccessToken(immediate) {
        return new Promise(function (resolve, reject) {
            if (accessToken) {
                resolve(accessToken);
            }
            else if (immediate) {
                loadGoogleApi()
                    .then(googleAuth)
                    .catch(reject);
            }
            else {
                googleAuth();
            }
            function googleAuth() {
                gapi.auth.authorize({
                    client_id: ids.client,
                    scope: urls.scope,
                    immediate: immediate
                }, function (result) {
                    if (result && !result.error) {
                        accessToken = result.access_token;
                        resolve(accessToken);
                    }
                    else {
                        reject();
                    }
                });
            }
        });
    }
    function http(method, url, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.responseType = options.responseType || '';
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.responseType = options.responseType;
            Object.keys(options.headers).forEach(function (key) {
                var value = options.headers[key];
                xhr.setRequestHeader(key, value);
            });
            xhr.addEventListener('load', function () {
                var response = options.responseType
                    ? xhr.response
                    : responseFromRequest(xhr);
                resolve(response);
            });
            xhr.addEventListener('error', function (e) { return reject(new Error('Could not load URL: ' + url)); });
            xhr.addEventListener('abort', function (e) { return reject(new Error('Loading of URL aborted: ' + url)); });
            if (options.progress) {
                xhr.addEventListener('progress', function (e) {
                    if (e.lengthComputable) {
                        options.progress(e.loaded / e.total);
                    }
                });
            }
            xhr.send();
        });
    }
    function responseFromRequest(xhr) {
        var mimeTypeString = xhr.getResponseHeader('Content-Type');
        var mimeType = mimeTypeString.split(';')[0];
        if (mimeType === 'application/json') {
            return JSON.parse(xhr.responseText);
        }
        else {
            return xhr.responseText;
        }
    }
    function reauthenticate() {
        console.log('Reauthenticating...');
        gapi.auth.authorize({
            client_id: ids.client,
            scope: urls.scope,
            immediate: true
        }, function (result) {
            if (result && !result.error) {
                accessToken = result.access_token;
                console.log('New access token: ' + accessToken);
            }
        });
    }
    return {
        authenticate: function (immediate) {
            setInterval(reauthenticate, 10 * 60 * 1000);
            return loadAccessToken(immediate);
        },
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

},{}],14:[function(require,module,exports){
"use strict";
var dom = require('./document');
function dialog(element, onClose) {
    var close = function () {
        hideDialog();
        onClose();
    };
    dom.on(dom.first('.close', element), 'click', close);
    dom.on(document, 'keydown', function (event) {
        if (!element.hidden && dom.key(event.keyCode) === 'Escape') {
            close();
        }
    });
    dom.on(element.parentNode, 'click', function (event) {
        if (!element.hidden && event.target === element.parentNode) {
            close();
        }
    });
}
exports.dialog = dialog;
function showDialog(id) {
    var container = dom.id('dialog');
    var dialogs = dom.all('.dialog');
    var active = dialogs.filter(function (d) { return d.id === id; })[0];
    var inactive = dialogs.filter(function (d) { return d.id !== id; });
    container.hidden = false;
    active.hidden = false;
    inactive.forEach(function (d) { return d.hidden = true; });
}
exports.showDialog = showDialog;
function hideDialog(onClose) {
    onClose = onClose || (function (x) { });
    var dialogs = dom.all('.dialog');
    var dialog = R.find(function (d) { return !d.hidden; }, dialogs);
    onClose(dialog);
    var container = dom.id('dialog');
    container.hidden = true;
}
exports.hideDialog = hideDialog;

},{"./document":7}],15:[function(require,module,exports){
"use strict";
function bound(min, max, value) {
    var boundedAbove = Math.min(value, max);
    return Math.max(min, boundedAbove);
}
exports.bound = bound;
function parseNumber(str) {
    var number = parseFloat(str);
    if (isNaN(number)) {
        throw new Error('Cannot parse string to number: ' + str);
    }
    else {
        return number;
    }
}
exports.parseNumber = parseNumber;
function parseQuery(location) {
    var query = {};
    if (location.search.substring(1) !== '') {
        location.search.substring(1)
            .split('&')
            .forEach(function (s) {
            var kv = s.split('=').map(decodeURIComponent);
            var k = kv[0];
            var v = kv[1];
            query[k] = v;
        });
    }
    return query;
}
exports.parseQuery = parseQuery;

},{}],16:[function(require,module,exports){
"use strict";
var dom = require('../document');
function default_1(page, signal) {
    dom.on(dom.first('form', page), 'submit', function (event) {
        event.preventDefault();
        signal.login();
    });
    return {};
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":7}],17:[function(require,module,exports){
"use strict";
var dom = require('../document');
function default_1(page) {
    var meter = dom.first('progress', page);
    meter.value = 0;
    var events = dom.first('.events', page);
    var template = events.firstElementChild;
    template.remove();
    return {
        progress: function (ratio) {
            meter.value = ratio;
        },
        event: function (text) {
            var instance = template.cloneNode(true);
            instance.textContent = text;
            events.insertBefore(instance, events.firstElementChild);
        },
        error: function (text) {
            var instance = template.cloneNode(true);
            instance.textContent = text;
            instance.classList.add('error');
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":7}],18:[function(require,module,exports){
"use strict";
var dom = require('../document');
var ui = require('../ui');
function default_1(dialog, signal) {
    ui.dialog(dialog, function () {
        if (enterState['current'] === 'joining-session') {
            enterState('no-session');
        }
        signal.dismiss();
    });
    var enterState = dom.stateful(dialog, ['no-session', 'joining-session', 'connecting-to-session', 'session-active']);
    dom.on(dom.id('start-session-form'), 'submit', function (event) {
        event.preventDefault();
        enterState('connecting-to-session');
        signal.startSession();
    });
    dom.on(dom.id('join-session-form'), 'submit', function (event) {
        event.preventDefault();
        enterState('joining-session');
    });
    var joinSessionIdForm = dom.id('join-session-id-form');
    dom.on(joinSessionIdForm, 'submit', function (event) {
        event.preventDefault();
        var url = dom.first('input', joinSessionIdForm).value;
        var id = idFromUrl(url);
        enterState('connecting-to-session');
        signal.joinSession(id);
    });
    return {
        joiningSession: function () {
            enterState('connecting-to-session');
        },
        sessionError: function (message) {
            enterState('no-session');
            dom.id('online-play-error').hidden = false;
            dom.id('online-play-error-message').textContent = message;
        },
        sessionJoined: function (url) {
            enterState('session-active');
            var link = dom.id('join-session-link');
            link.href = link.textContent = url;
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function idFromUrl(url) {
    try {
        var marker = 'session=';
        var id = url.substring(url.indexOf(marker) + marker.length);
        return id;
    }
    catch (error) {
        return url;
    }
}

},{"../document":7,"../ui":14}],19:[function(require,module,exports){
"use strict";
var dom = require('../document');
function default_1(page, signal) {
    function showError(message) {
        dom.id('session-error-detail').textContent = message;
    }
    showError('');
    dom.on(dom.first('form', page), 'submit', function (event) {
        event.preventDefault();
        signal.retry();
    });
    return {
        error: function (error) { return showError(error.message); }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":7}],20:[function(require,module,exports){
"use strict";
var dom = require('../document');
var utils_1 = require('../utils');
function default_1(options) {
    var dropdown = options.dropdown;
    var adventures = options.adventures;
    var scenes = R.fromPairs(R.unnest(R.values(adventures).map(function (adventure) {
        return adventure.scenes.map(function (scene, i) { return [adventure.id + '/' + i, scene]; });
    })));
    var previews = {};
    var files = {};
    var progressCallbacks = [];
    dom.replicate(adventures, dropdown, { sort: function (a) { return a.title; } }, {
        'option': {
            text: function (adventure) { return adventure.title; },
            value: function (adventure) { return adventure.id; }
        }
    });
    var render = dom.replicate(scenes, dom.first('.scene-list'), {
        sort: function (scene) { return selectedAdventure().scenes.indexOf(scene); },
        filter: function (scene) { return selectedAdventure().scenes.indexOf(scene) !== -1; }
    }, {
        '.scene': { node: function (node, scene) {
                node.classList.add('loading');
                progressCallbacks.push(function (allFiles) {
                    var loading = sceneFiles(scene).some(function (f) { return !(f in allFiles) || typeof allFiles[f] === 'number'; });
                    node.classList.toggle('loading', loading);
                });
                node.classList.toggle('with-image', Boolean(firstImage(scene)));
            } },
        '.scene-name': function (scene) { return scene.name || String.fromCharCode(160); },
        '.scene-hotkey': function (scene) { return scene.key || ''; },
        '.scene-button': {
            on: { click: options.playScene },
            title: function (scene) { return 'Play scene' + (scene.name ? ' ' + scene.name : ''); },
        },
        '.scene-preview-image': {
            hidden: function (scene) { return !firstImage(scene); },
            on: { load: function (scene, image) { return image.classList.add('loaded'); } },
            src: function (scene) { return hasImagePreview(scene)
                ? previews[firstImage(scene).file]
                : ''; }
        },
        'progress': { node: function (node, scene) {
                progressCallbacks.push(function (allFiles) {
                    node.value = combinedProgress(sceneFiles(scene), allFiles);
                });
            } }
    });
    function sceneFiles(scene) {
        return firstSound(scene).tracks;
    }
    function firstImage(scene) {
        return scene.media.filter(function (m) { return m.type === 'image'; })[0];
    }
    function firstSound(scene) {
        return scene.media.filter(function (m) { return m.type === 'sound'; })[0] || { tracks: [] };
    }
    function hasImagePreview(scene) {
        return firstImage(scene) && typeof previews[firstImage(scene).file] === 'string';
    }
    function renderProgress() {
        progressCallbacks.forEach(function (callback) { return callback(files); });
    }
    function combinedProgress(sceneFiles, allFiles) {
        return sceneFiles.length === 0
            ? 1
            : R.sum(sceneFiles.map(function (t) { return singleProgress(allFiles[t]); })) / sceneFiles.length;
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
    dom.on(dom.id('stop-button'), 'click', function () {
        options.stopAllScenes();
    });
    var volumeSlider = dom.id('volume-slider');
    var mutedVolume = currentVolume();
    setVolume(currentVolume());
    dom.on(dom.id('mute'), 'click', function () {
        setVolume(0);
        dom.id('unmute').focus();
    });
    dom.on(dom.id('unmute'), 'click', function () {
        setVolume(mutedVolume);
        dom.id('mute').focus();
    });
    dom.on(dom.id('volume-slider'), 'input', function () {
        setVolume(currentVolume());
    });
    dom.on(dom.id('volume-slider'), 'change', function () {
        if (currentVolume() > 0) {
            mutedVolume = currentVolume();
        }
    });
    function currentVolume() {
        return utils_1.parseNumber(volumeSlider.value);
    }
    function setVolume(volume) {
        volumeSlider.value = String(volume);
        options.changeVolume(volume);
        allowMute(volume > 0);
    }
    function allowMute(canMute) {
        dom.id('mute').hidden = !canMute;
        dom.id('unmute').hidden = canMute;
    }
    (function () {
        var percentages = R.range(1, 20 + 1).map(function (n) { return 1 / n; });
        var nodes = dom.first('.scene-list').children; // Live
        dom.on(dom.id('zoom-out'), 'click', function () { return zoom(zoomLevel() + 1); });
        dom.on(dom.id('zoom-in'), 'click', function () { return zoom(zoomLevel() - 1); });
        zoom(options.zoomLevel - 1);
        function zoom(level) {
            var boundedLevel = utils_1.bound(0, percentages.length - 1, level);
            var newPercentage = percentages[boundedLevel];
            Array.from(nodes).forEach(function (n) { return n.style.width = (newPercentage * 100) + '%'; });
            options.zoomed(boundedLevel + 1);
        }
        function zoomLevel() {
            var reference = R.find(function (n) { return !n.hidden; }, nodes);
            var percentage = reference.getBoundingClientRect().width / reference.parentNode.getBoundingClientRect().width;
            var closestPercentage = R.sortBy(function (p) { return Math.abs(percentage - p); }, percentages)[0];
            var level = percentages.indexOf(closestPercentage);
            return level;
        }
    })();
    dom.on(dom.id('fullscreen'), 'click', function () {
        dom.toggleFullscreen();
    });
    dropdown.addEventListener('change', function () { return options.adventureSelected(dropdown.value); });
    dom.on(dom.id('online-play-button'), 'click', function () { return options.playOnline(); });
    function selectedAdventure() {
        return adventures[dropdown.value];
    }
    return {
        previewLoaded: function (id, url) {
            previews[id] = url;
            render(scenes);
        },
        fileProgress: function (id, ratio) {
            files[id] = ratio;
            renderProgress();
        },
        fileLoaded: function (id, url) {
            files[id] = url;
            renderProgress();
        },
        adventureSelected: function (id) {
            dropdown.value = id;
            render(scenes);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
;

},{"../document":7,"../utils":15}],21:[function(require,module,exports){
"use strict";
var dom = require('../document');
var ui = require('../ui');
function default_1(page, signal) {
    ui.dialog(page, signal.dismiss);
    dom.on(dom.first('form', page), 'submit', function (event) {
        event.preventDefault();
        ui.hideDialog();
        signal.dismiss();
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

},{"../document":7,"../ui":14}]},{},[8]);
