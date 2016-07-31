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
