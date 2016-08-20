import * as dom from '../document';
import * as ui from '../ui';

interface Callbacks {
    dismiss: () => void
}

export default function(page:HTMLElement, signal:Callbacks) {
    ui.dialog(page, signal.dismiss);
    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        ui.hideDialog();
        signal.dismiss();
    });
}
