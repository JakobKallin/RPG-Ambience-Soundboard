import * as dom from '../document';
import { bound, parseNumber } from '../utils';
declare var R:any;

interface SoundboardViewCallbacks {
    dropdown: HTMLSelectElement,
    adventures: any,
    playScene: (id:string) => void,
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
        return adventure.scenes.map((scene, i) => [scene.id, scene]);
    })));

    let adventureSortProperty = a => a.title;
    const renderAdventureDropdown = dom.replicate(
        dropdown,
        adventures,
        {},
        { sort: a => adventureSortProperty(a) },
        adventure => ({
            'option': {
                text: adventure.title,
                value: adventure.id
            }
        })
    );

    const render = dom.replicate(
        dom.first('.scene-list'),
        scenes,
        { previews: {}, files: {}, playing: {} },
        { sort: scene => selectedAdventure().scenes.indexOf(scene) },
        scene => ({
            '.scene': {
                data: { key: scene.id },
                class: {
                    'loading': state => sceneProgress(scene, state.files) < 1,
                    'with-image': hasImage(scene),
                    'playing': state => state.playing[scene.name] > 0
                }
            },
            '.scene-name': scene.name || String.fromCharCode(160),
            '.scene-hotkey': scene.key || '',
            '.scene-button': {
                on: { click: () => options.playScene(scene.id) },
                title: 'Play scene' + (scene.name ? ' ' + scene.name : ''),
            },
            '.scene-preview-image': {
                hidden: !hasImage(scene),
                on: { load: event => event.target.classList.add('loaded') },
                src: state => hasImagePreview(scene, state.previews)
                    ? state.previews[firstImage(scene).file]
                    : ''
            },
            'progress': {
                value: state => sceneProgress(scene, state.files)
            }
        })
    );

    function firstImage(scene) {
        return scene.media.filter(m => m.type === 'image')[0];
    }

    function hasImage(scene) {
        return Boolean(firstImage(scene));
    }

    function firstSound(scene) {
        return scene.media.filter(m => m.type === 'sound')[0] || { tracks: [] };
    }

    function hasImagePreview(scene, previews) {
        return hasImage(scene) && typeof previews[firstImage(scene).file] === 'string';
    }

    function sceneProgress(scene, files) {
        const sceneFiles = firstSound(scene).tracks;
        return sceneFiles.length === 0
            ? 1
            : R.sum(sceneFiles.map(t => fileProgress(files[t]))) / sceneFiles.length;
    }

    function fileProgress(progress) {
        if (typeof progress === 'string') return 1;
        else if (typeof progress === 'number') return progress;
        else return 0;
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
    dom.on(dom.id('player-count'), 'click', () => options.playOnline());

    function selectedAdventure() {
        return adventures[dropdown.value];
    }

    return (() => {
        const state = {
            previews: {},
            files: {},
            playing: {},
        };
        return {
            previewLoaded: (id, url) => {
                state.previews[id] = url;
                render(state);
            },
            fileProgress: (id, ratio) => {
                state.files[id] = ratio;
                render(state);
            },
            fileLoaded: (id, url) => {
                state.files[id] = url;
                render(state);
            },
            adventureSelected: id => {
                dropdown.value = id;
                Array.from(dom.first('.scene-list').children).forEach(node => {
                    const adventure = node.dataset.key.split('/')[0];
                    node.hidden = adventure !== id;
                });
                // We don't have to call render here to update the previously
                // hidden scenes, as the `fileLoaded` callback is already called
                // whenever an adventure is selected (assuming that adventure
                // has files).
            },
            sceneStarted: name => {
                state.playing[name] = state.playing[name] || 0;
                state.playing[name] += 1;
                render(state);
            },
            sceneEnded: name => {
                state.playing[name] -= 1;
                render(state);
            },
            sortAdventuresByTitle: () => {
                adventureSortProperty = a => a.title;
                renderAdventureDropdown({});
            },
            sortAdventuresByCreationDate: () => {
                adventureSortProperty = a => -a.created.getTime();
                renderAdventureDropdown({});
            },
            sortAdventuresByModificationDate: () => {
                adventureSortProperty = a => -a.modified.getTime();
                renderAdventureDropdown({});
            },
        };
    })();
};
