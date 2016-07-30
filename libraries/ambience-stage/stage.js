"use strict";
const scene_1 = require('./scene');
function stage(outside) {
    let fadingOut = null;
    let fadingIn = null;
    let volume = 1;
    return {
        start: (items, fadeInDuration = 0) => {
            if (fadingOut)
                fadingOut.stop();
            fadingOut = fadingIn;
            if (fadingOut)
                fadingOut.stop(fadeInDuration);
            fadingIn = scene_1.default(items, fadeInDuration, volume, outside);
        },
        volume: (newVolume) => {
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
