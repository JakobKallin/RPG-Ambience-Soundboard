import * as dom from '../document';
import * as ui from '../ui';

interface Callbacks {
    sortAdventuresByTitle: () => void
    sortAdventuresByCreationDate: () => void
    sortAdventuresByModificationDate: () => void
    groupScenesByLayer: (boolean) => void
}

interface Values {
    groupScenesByLayer:boolean;
    adventureOrder:string;
}

export default function(dialog:HTMLElement, initial:Values, signal:Callbacks) {
    ui.dialog(dialog);

    dom.sync.select(<HTMLSelectElement> dom.id('adventure-sort-order'), initial.adventureOrder, {
        title: signal.sortAdventuresByTitle,
        created: signal.sortAdventuresByCreationDate,
        modified: signal.sortAdventuresByModificationDate,
    });

    dom.sync.checkbox(<HTMLInputElement> dom.id('scene-layer-grouping'), initial.groupScenesByLayer, signal.groupScenesByLayer);
}
