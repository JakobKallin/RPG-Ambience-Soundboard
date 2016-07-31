"use strict";
const dom = require('../document');
function default_1(page, signal) {
    function showError(message) {
        dom.id('session-error-detail').textContent = message;
    }
    showError('');
    dom.on(dom.first('form', page), 'submit', event => {
        event.preventDefault();
        signal.retry();
    });
    return {
        error: error => showError(error.message)
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
