import * as dom from '../document';
import { bound, parseNumber } from '../utils';
declare var R:any;

interface SoundboardViewCallbacks {
    dropdown: HTMLSelectElement,
    adventures: any,
    playScene: (scene:any) => void,
    stopAllScenes: () => void,
    adventureSelected: (s:string) => void,
    changeVolume: (volume:number) => void,
    zoomLevel: number,
    zoomed: (level:number) => void,
    playOnline: () => void
}

export default function(options:SoundboardViewCallbacks) {
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

    const render = dom.replicate(
        scenes,
        dom.first('.scene-list'),
        {
            sort: scene => selectedAdventure().scenes.indexOf(scene),
            filter: scene => selectedAdventure().scenes.indexOf(scene) !== -1
        },
        {
            '.scene': { node: (node, scene) => {
                node.classList.add('loading');
                progressCallbacks.push(allFiles => {
                    const loading = sceneFiles(scene).some(f => !(f in allFiles) || typeof allFiles[f] === 'number');
                    node.classList.toggle('loading', loading);
                });
                node.classList.toggle('with-image', Boolean(firstImage(scene)));
            } },
            '.scene-name': scene => scene.name || String.fromCharCode(160),
            '.scene-hotkey': scene => scene.key || '',
            '.scene-button': {
                on: { click: options.playScene },
                title: scene => 'Play scene' + (scene.name ? ' ' + scene.name : ''),
            },
            '.scene-preview-image': {
                hidden: scene => !firstImage(scene),
                on: { load: (scene, image) => image.classList.add('loaded') },
                src: scene => hasImagePreview(scene)
                    ? previews[firstImage(scene).file]
                    : ''
            },
            'progress': { node: (node, scene) => {
                progressCallbacks.push(allFiles => {
                    node.value = combinedProgress(sceneFiles(scene), allFiles);
                });
            } }
        }
    );

    function sceneFiles(scene) {
        return firstSound(scene).tracks;
    }

    function firstImage(scene) {
        return scene.media.filter(m => m.type === 'image')[0];
    }

    function firstSound(scene) {
        return scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
    }

    function hasImagePreview(scene) {
        return firstImage(scene) && typeof previews[firstImage(scene).file] === 'string';
    }

    function renderProgress() {
        progressCallbacks.forEach(callback => callback(files));
    }

    function combinedProgress(sceneFiles, allFiles) {
        return sceneFiles.length === 0
            ? 1
            : R.sum(sceneFiles.map(t => singleProgress(allFiles[t]))) / sceneFiles.length;
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

    dom.on(dom.id('stop-button'), 'click', () => {
        options.stopAllScenes();
    });

    const volumeSlider = <HTMLInputElement> dom.id('volume-slider');
    let mutedVolume = currentVolume();
    setVolume(currentVolume());

    dom.on(dom.id('mute'), 'click', () => {
        setVolume(0);
        dom.id('unmute').focus();
    });
    dom.on(dom.id('unmute'), 'click', () => {
        setVolume(mutedVolume);
        dom.id('mute').focus();
    });

    dom.on(dom.id('volume-slider'), 'input', () => {
        setVolume(currentVolume());
    });

    dom.on(dom.id('volume-slider'), 'change', () => {
        if (currentVolume() > 0) {
            mutedVolume = currentVolume();
        }
    });

    function currentVolume() {
        return parseNumber(volumeSlider.value);
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

    (() => {
        const percentages = R.range(1, 20+1).map(n => 1 / n);
        const nodes = dom.first('.scene-list').children; // Live
        dom.on(dom.id('zoom-out'), 'click', () => zoom(zoomLevel() + 1));
        dom.on(dom.id('zoom-in'), 'click', () => zoom(zoomLevel() - 1));
        zoom(options.zoomLevel - 1);

        function zoom(level) {
            const boundedLevel = bound(0, percentages.length - 1, level);
            const newPercentage = percentages[boundedLevel];
            Array.from(nodes).forEach(n => n.style.width = (newPercentage * 100) + '%');
            options.zoomed(boundedLevel + 1);
        }

        function zoomLevel() {
            const reference = R.find(n => !n.hidden, nodes);
            const percentage = reference.getBoundingClientRect().width / reference.parentNode.getBoundingClientRect().width;
            const closestPercentage = R.sortBy(p => Math.abs(percentage - p), percentages)[0];
            const level = percentages.indexOf(closestPercentage);
            return level;
        }
    })();

    dom.on(dom.id('fullscreen'), 'click', () => {
        dom.toggleFullscreen();
    });

    dropdown.addEventListener('change', () => options.adventureSelected(dropdown.value));

    dom.on(dom.id('online-play-button'), 'click', () => options.playOnline());

    function selectedAdventure() {
        return adventures[dropdown.value];
    }

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
        },
        adventureSelected: id => {
            dropdown.value = id;
            render(scenes);
        }
    };
};
