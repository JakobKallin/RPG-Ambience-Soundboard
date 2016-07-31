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
    var before = read(version, defaults);
    var after = transaction(before);
    write(version, after);
}
exports.modify = modify;
function write(version, store) {
    var json = JSON.stringify(store);
    localStorage.setItem(version.toString(), json);
}
