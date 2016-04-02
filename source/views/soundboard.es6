import * as dom from '../dom.js';
import * as R from 'ramda.0.19.1.min';

export default function(options) {
    const dropdown = options.dropdown;
    const adventures = options.adventures;
    const scenes = R.fromPairs(R.unnest(R.values(adventures).map(adventure => {
        return adventure.scenes.map((scene, i) => [adventure.id + '/' + i, scene]);
    })));
    const library = options.library;
    
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
            '.scene-title': scene.name || String.fromCharCode(160),
            '.scene-button': button => {
                if (button.dataset.foo) {
                    button.addEventListener('click', options.playSound);
                }
                button.dataset.foo = true;
            },
            '.scene-preview': {
                style: {
                    backgroundImage: scene.image.file
                        ? 'url("' + scene.image.file.thumbnail + '")'
                        : ''
                }
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
        adventure.scenes.forEach(scene => {
            if (scene.image.file && !scene.image.file.thumbnail) {
                library.preview(scene.image.file.id)
                .then(url => {
                    scene.image.file.thumbnail = url;
                    render(scenes);
                });
            }
        });
    }
};
