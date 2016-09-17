import * as dom from './document';
declare var R:any;

export function dialog(element:HTMLElement, onClose?:() => void):void {
    onClose = onClose || (() => {});
    const close = () => {
        hideDialog();
        onClose();
    };
    dom.on(dom.first('.close', element), 'click', close);
    dom.on(document, 'keydown', (event:KeyboardEvent) => {
        if (!element.hidden && dom.key(event.keyCode) === 'Escape') {
            close();
        }
    });
    dom.on(element.parentNode, 'click', event => {
        if (!element.hidden && event.target === element.parentNode) {
            close();
        }
    });
}

export function showDialog(id:string):void {
    const container = dom.id('dialog');
    const dialogs = dom.all('.dialog');
    const active = dialogs.filter(d => d.id === id)[0];
    const inactive = dialogs.filter(d => d.id !== id);
    container.hidden = false;
    active.hidden = false;
    inactive.forEach(d => d.hidden = true);
}

export function hideDialog(onClose?:(e:HTMLElement) => void):void {
    onClose = onClose || (x => {});

    const dialogs = dom.all('.dialog');
    const dialog = R.find(d => !d.hidden, dialogs);
    onClose(dialog);

    const container = dom.id('dialog');
    container.hidden = true;
}
