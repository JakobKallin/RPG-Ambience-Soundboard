import * as dom from '../document';

interface Callbacks {
    dismissed: () => void
}

export default function(page:Element, signal:Callbacks) {
    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        signal.dismissed();
    });
}
