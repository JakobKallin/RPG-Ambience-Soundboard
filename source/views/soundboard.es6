import * as dom from '../dom.js';
import * as R from 'ramda.0.19.1.min';

export default function(options) {
    const dropdown = options.dropdown;
    const adventures = options.adventures;
    const scenes = R.fromPairs(R.unnest(R.values(adventures).map(adventure => {
        return adventure.scenes.map((scene, i) => [adventure.id + '/' + i, scene]);
    })));
    const thumbnails = {};
    
    dom.replicate(adventures, dropdown, { sort: a => a.title }, adventure => ({
        'option': { text: adventure.title, value: adventure.id }
    }));
    
    const render = dom.replicate(
        scenes,
        dom.first('.scene-list'),
        {
            sort: scene => scene.name,
            filter: scene => selectedAdventure().scenes.includes(scene)
        },
        scene => ({
            '.scene': { class: { loaded: !scene.image.file || scene.image.file.id in thumbnails } },
            '.scene-title': scene.name || String.fromCharCode(160),
            '.scene-button': button => {
                if (!button.onclick) button.onclick = options.playSound;
            },
            '.scene-preview-image': image => {
                image.hidden = !scene.image.file;
                if (!image.onload) image.onload = () => image.classList.add('loaded');
                if (!image.onloadstart) image.onloadstart = () => console.log(image.tagName);
                image.src = scene.image.file && scene.image.file.id in thumbnails
                    ? thumbnails[scene.image.file.id]
                    : '';
            }
        })
    );
    
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
        thumbnailLoaded: (id, url) => {
            thumbnails[id] = url;
            render(scenes);
        }
    };
};
