"use strict";
var dom = require('../document');
function default_1(page, signal) {
    dom.on(dom.first('form', page), 'submit', function (event) {
        event.preventDefault();
        signal.login();
    });
    return {};
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
