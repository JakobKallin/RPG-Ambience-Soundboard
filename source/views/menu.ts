import * as dom from '../document';
import * as ui from '../ui';

interface Callbacks {
    sortAdventuresByTitle: () => void,
    sortAdventuresByCreationDate: () => void,
    sortAdventuresByModificationDate: () => void,
}

export default function(dialog:HTMLElement, signal:Callbacks) {
    ui.dialog(dialog);
    const adventureSortOrderDropdown = <HTMLSelectElement> dom.id('adventure-sort-order');
    dom.on(adventureSortOrderDropdown, 'change', event => {
        const value = adventureSortOrderDropdown.value;
        if (value === 'title') signal.sortAdventuresByTitle();
        if (value === 'created') signal.sortAdventuresByCreationDate();
        if (value === 'modified') signal.sortAdventuresByModificationDate();
    });
}
