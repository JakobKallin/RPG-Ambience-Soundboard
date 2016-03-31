import * as dom from '../dom.js';
import { objectToArray } from '../utils.js';

export default function(options) {
    const dropdown = options.dropdown;
    const adventures = options.adventures;
    const sortedAdventures = _.sortBy(objectToArray(adventures), a => a.title);
    
    const sceneList = dom.id('scene-list');
    const sceneTemplate = dom.remove(dom.id('scene-template'));
    sceneTemplate.removeAttribute('id');
    function showAdventure(adventure) {
        dom.replicate(sceneTemplate, sceneList, adventure.scenes, (node, scene) => {
            dom.query('.scene-title', node).textContent = scene.name || String.fromCharCode(160);
            node.addEventListener('click', options.playSound);
        });
        dom.insertAlignmentElements(sceneList);
    }
    
    dom.populateSelect(dropdown, sortedAdventures.map(a => ({
        value: a.id,
        label: a.title
    })));
    
    showAdventure(sortedAdventures[0]);
    dropdown.addEventListener('change', () => {
        const id = dropdown.value;
        showAdventure(adventures[id]);
    });
};
