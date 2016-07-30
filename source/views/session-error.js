"use strict";
const dom = require('../document');
function default_1(page) {
    function showError(message) {
        dom.id('session-error-detail').textContent = message;
    }
    showError('');
    return {
        error: error => showError(error.message)
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
