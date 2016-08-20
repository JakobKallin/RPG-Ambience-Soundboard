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
