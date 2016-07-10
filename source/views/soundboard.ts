import * as dom from '../document';
declare var R:any;

interface SoundboardViewCallbacks {
    dropdown: HTMLSelectElement,
    adventures: any,
    playScene: (scene:any) => void,
    stopAllScenes: () => void,
    adventureSelected: (s:string) => void
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
            filter: scene => selectedAdventure().scenes.includes(scene)
        },
        {
            '.scene': { node: (node, scene) => {
                node.classList.add('loading');
                progressCallbacks.push(files => {
                    const loading = firstSound(scene).tracks.some(t => !(t in files) || typeof files[t] === 'number');
                    node.classList.toggle('loading', loading);
                });
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
                progressCallbacks.push(files => {
                    node.value = combinedProgress(firstSound(scene).tracks, files);
                });
            } }
        }
    );
    
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
    
    function combinedProgress(tracks, files) {
        return tracks.length === 0
            ? 1
            : R.sum(tracks.map(t => singleProgress(files[t]))) / tracks.length;
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
