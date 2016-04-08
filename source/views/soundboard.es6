import * as dom from '../dom.js';
import * as R from 'ramda.0.19.1.min';

export default function(options) {
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
            sort: scene => scene.name,
            filter: scene => selectedAdventure().scenes.includes(scene)
        },
        {
            '.scene': { node: (node, scene) => {
                progressCallbacks.push(files => {
                    const loading = scene.sound.tracks.some(t => typeof files[t.id] === 'number');
                    node.classList.toggle('loading', loading);
                });
            } },
            '.scene-title': scene => scene.name || String.fromCharCode(160),
            '.scene-hotkey': scene => scene.key || '',
            '.scene-button': { on: { click: options.playScene } },
            '.scene-preview-image': {
                hidden: scene => !scene.image.file,
                on: { load: (scene, image) => image.classList.add('loaded') },
                src: scene => hasImagePreview(scene)
                    ? previews[scene.image.file.id]
                    : ''
            },
            'progress': { node: (node, scene) => {
                progressCallbacks.push(files => {
                    node.value = combinedProgress(scene.sound.tracks, files);
                });
            } }
        }
    );
    
    function hasImagePreview(scene) {
        return scene.image.file && typeof previews[scene.image.file.id] === 'string';
    }
    
    function renderProgress() {
        progressCallbacks.forEach(callback => callback(files));
    }
    
    function combinedProgress(tracks, files) {
        return tracks.length === 0
            ? 1
            : R.sum(tracks.map(t => singleProgress(files[t.id]))) / tracks.length;
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
    
    dropdown.addEventListener('change', showCurrentAdventure);
    showCurrentAdventure();
    function showCurrentAdventure() {
        showAdventure(selectedAdventure());
    }
    
    function selectedAdventure() {
        const id = dropdown.value;
        return adventures[id];
    }
    
    function showAdventure(adventure) {
        render(scenes);
        options.adventureSelected(adventure.id);
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
        }
    };
};
