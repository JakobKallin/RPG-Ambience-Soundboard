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
