"use strict";
function read(version, defaults) {
    var json = localStorage.getItem(version.toString());
    if (json === null) {
        return Object.assign({}, defaults);
    }
    else {
        try {
            var store = JSON.parse(json);
            if (typeof store === 'object' && !Array.isArray(store)) {
                return Object.assign({}, defaults, store);
            }
            else {
                return Object.assign({}, defaults);
            }
        }
        catch (error) {
            return Object.assign({}, defaults);
        }
    }
}
exports.read = read;
function modify(version, defaults, transaction) {
    var store = read(version, defaults);
    transaction(store);
    write(version, store);
}
exports.modify = modify;
function write(version, store) {
    var json = JSON.stringify(store);
    localStorage.setItem(version.toString(), json);
}
