import * as dom from '../dom.js';
import * as R from 'ramda.0.19.1.min';

export default function(options) {
    const dropdown = options.dropdown;
    const adventures = options.adventures;
    const library = options.library;
    
    const render = dom.replicate({}, dom.first('.scene-list'), scene => scene.name, scene => ({
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
    }));
    
    function showAdventure(adventure) {
        const table = {};
        adventure.scenes.forEach((s, i) => {
            table[adventure.id + '/' + i] = s;
        });
        render(table);
        adventure.scenes.forEach(scene => {
            if (scene.image.file) {
                library.preview(scene.image.file.id)
                .then(url => {
                    scene.image.file.thumbnail = url;
                    render(table);
                });
            }
        });
        // dom.insertAlignmentElements(sceneList);
    }
    
    dom.replicate(adventures, dropdown, a => a.title, adventure => ({
        'option': { text: adventure.title, value: adventure.id }
    }));
    
    // showAdventure(sortedAdventures[0]);
    dropdown.addEventListener('change', () => {
        const id = dropdown.value;
        showAdventure(adventures[id]);
    });
};
