"use strict";
var dom = require('../document');
function default_1(page) {
    dom.first('progress', page).value = 0;
    var events = dom.first('.events', page);
    var template = events.firstElementChild;
    template.remove();
    return {
        progress: function (ratio) {
            dom.first('progress', page).value = ratio;
        },
        event: function (text) {
            var instance = template.cloneNode(true);
            instance.textContent = text;
            events.insertBefore(instance, events.firstElementChild);
        },
        error: function (text) {
            var instance = template.cloneNode(true);
            instance.textContent = text;
            instance.classList.add('error');
            events.insertBefore(instance, events.firstElementChild);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
