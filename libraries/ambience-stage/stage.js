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
