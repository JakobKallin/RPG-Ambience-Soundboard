import * as dom from '../document';

export default function(page) {
    const meter = <HTMLProgressElement> dom.first('progress', page);
    meter.value = 0;
    const events = dom.first('.events', page);
    const template = events.firstElementChild;
    template.remove();
    return {
        progress: ratio => {
            meter.value = ratio;
        },
        event: text => {
            const instance = template.cloneNode(true);
            instance.textContent = text;
            events.insertBefore(instance, events.firstElementChild);
        },
        error: text => {
            const instance = <HTMLElement> template.cloneNode(true);
            instance.textContent = text;
            instance.classList.add('error');
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
