"use strict";
const dom = require('../document');
function default_1(page) {
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
        },
        error: text => {
            const instance = template.cloneNode(true);
            instance.textContent = text;
            instance.classList.add('error');
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
