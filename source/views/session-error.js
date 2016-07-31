"use strict";
var dom = require('../document');
function default_1(page, signal) {
    function showError(message) {
        dom.id('session-error-detail').textContent = message;
    }
    showError('');
    dom.on(dom.first('form', page), 'submit', function (event) {
        event.preventDefault();
        signal.retry();
    });
    return {
        error: function (error) { return showError(error.message); }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
