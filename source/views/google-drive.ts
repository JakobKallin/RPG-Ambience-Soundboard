import * as dom from '../document';

interface Callbacks {
    login:() => void
}

export default function(page:Element, signal:Callbacks) {
    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        signal.login();
    });
    return {};
}
