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
