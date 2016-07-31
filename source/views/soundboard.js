"use strict";
var dom = require('../document');
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
        filter: function (scene) { return selectedAdventure().scenes.includes(scene); }
    }, {
        '.scene': { node: function (node, scene) {
                node.classList.add('loading');
                progressCallbacks.push(function (allFiles) {
                    var loading = sceneFiles(scene).some(function (f) { return !(f in allFiles) || typeof allFiles[f] === 'number'; });
                    node.classList.toggle('loading', loading);
                });
                node.classList.toggle('with-image', Boolean(firstImage(scene)));
            } },
        '.scene-title': function (scene) { return scene.name || String.fromCharCode(160); },
        '.scene-hotkey': function (scene) { return scene.key || ''; },
        '.scene-button': { on: { click: options.playScene } },
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
    dom.on(dom.id('volume-down'), 'click', function () {
        var volume = 0;
        volumeSlider.value = String(volume);
        options.changeVolume(volume);
    });
    dom.on(dom.id('volume-up'), 'click', function () {
        var volume = 1;
        volumeSlider.value = String(volume);
        options.changeVolume(volume);
    });
    dom.on(dom.id('volume-slider'), 'input', function () {
        var volume = parseFloat(volumeSlider.value);
        if (!isNaN(volume)) {
            options.changeVolume(volume);
        }
    });
    dom.on(dom.id('fullscreen'), 'click', function () {
        dom.toggleFullscreen();
    });
    dropdown.addEventListener('change', function () { return options.adventureSelected(dropdown.value); });
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
