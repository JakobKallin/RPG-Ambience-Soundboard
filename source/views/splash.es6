import * as dom from '../dom.js';
import * as R from 'ramda.0.19.1.min';

export default function(page) {
    dom.first('progress', page).value = 0;
    const events = dom.first('.events', page);
    const template = events.firstElementChild;
    template.remove();
    return {
        progress: ratio => {
            dom.first('progress', page).value = ratio;
        },
        event: text => {
            const instance = template.cloneNode(true);
            instance.textContent = text;
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
