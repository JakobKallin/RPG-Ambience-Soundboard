import * as dom from '../document';
declare var R:any;

interface SoundboardViewCallbacks {
    dropdown: HTMLSelectElement,
    adventures: any,
    playScene: (scene:any) => void,
    stopAllScenes: () => void,
    adventureSelected: (s:string) => void,
    changeVolume: (volume:number) => void
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
            filter: scene => selectedAdventure().scenes.includes(scene)
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
            '.scene-title': scene => scene.name || String.fromCharCode(160),
            '.scene-hotkey': scene => scene.key || '',
            '.scene-button': { on: { click: options.playScene } },
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
    dom.on(dom.id('volume-down'), 'click', () => {
        const volume = 0;
        volumeSlider.value = String(volume);
        options.changeVolume(volume);
    });

    dom.on(dom.id('volume-up'), 'click', () => {
        const volume = 1;
        volumeSlider.value = String(volume);
        options.changeVolume(volume);
    });

    dom.on(dom.id('volume-slider'), 'input', () => {
        const volume = parseFloat(volumeSlider.value);
        if (!isNaN(volume)) {
            options.changeVolume(volume);
        }
    });

    dom.on(dom.id('fullscreen'), 'click', () => {
        dom.toggleFullscreen();
    });

    dropdown.addEventListener('change', () => options.adventureSelected(dropdown.value));

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
