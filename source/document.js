"use strict";
function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
exports.clear = clear;
function remove(node) {
    return node.parentNode.removeChild(node);
}
exports.remove = remove;
function all(selector, node) {
    node = node || document;
    return [].slice.call(node.querySelectorAll(selector));
}
exports.all = all;
function first(selector, node) {
    node = node || document;
    return node.querySelector(selector);
}
exports.first = first;
function id(id) {
    return document.getElementById(id);
}
exports.id = id;
function on(node, event, listener) {
    node.addEventListener(event, listener);
}
exports.on = on;
function capture(node, event, listener) {
    node.addEventListener(event, listener, true);
}
exports.capture = capture;
function array(arraylike) {
    if ('from' in Array) {
        return Array.from(arraylike);
    }
    else {
        return Array.prototype.slice.call(arraylike);
    }
}
exports.array = array;
function toggleClass(node, table) {
    Object.keys(table).forEach(function (className) {
        var value = table[className];
        value ? node.classList.add(className) : node.classList.remove(className);
    });
}
exports.toggleClass = toggleClass;
function replicate(table, container, options, mapping, state) {
    if (!state) {
        state = {
            template: container.removeChild(container.firstElementChild),
            nodes: {},
            first: true
        };
    }
    R.mapObjIndexed(function (node, key) {
        if (!(key in table)) {
            node.remove();
        }
    }, state.nodes);
    var keys = Object.keys(table);
    var order = options.sort || R.identity;
    var filter = options.filter || (function () { return true; });
    var nodes = R.sortBy(function (key) { return order(table[key]); }, keys).map(function (key) {
        var object = table[key];
        var instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        instance.hidden = !filter(object);
        map(mapping, object, instance, state.first);
        state.nodes[key] = instance;
        return instance;
    });
    nodes.forEach(function (node, index) {
        if (node.parent !== container) {
            container.insertBefore(node, container.children[index]);
        }
    });
    state.first = false;
    return function (table) {
        return replicate(table, container, options, mapping, state);
    };
}
exports.replicate = replicate;
function map(selectors, object, ancestor, first) {
    R.mapObjIndexed(function (values, selector) {
        if (typeof values !== 'object') {
            values = { text: values };
        }
        var matching = all(selector, ancestor).concat(matches(ancestor, selector) ? [ancestor] : []);
        matching.forEach(function (node) {
            R.mapObjIndexed(function (createValue, key) {
                if (key === 'text') {
                    var value = createValue(object);
                    if (node.textContent !== value) {
                        node.textContent = value;
                    }
                }
                else if (key === 'class') {
                    R.mapObjIndexed(function (active, className) {
                        node.classList.toggle(className, active(object));
                    }, createValue);
                }
                else if (key === 'style') {
                    R.mapObjIndexed(function (createCssValue, cssKey) {
                        var cssValue = createCssValue(object);
                        if (node.style[cssKey] !== cssValue) {
                            node.style[cssKey] = cssValue;
                        }
                    }, createValue);
                }
                else if (key === 'on') {
                    if (first) {
                        R.mapObjIndexed(function (callback, eventName) {
                            node.addEventListener(eventName, function () { return callback(object, node); });
                        }, createValue);
                    }
                }
                else if (key === 'node') {
                    if (first)
                        createValue(node, object);
                }
                else {
                    var value = createValue(object);
                    if (node[key] !== value) {
                        node[key] = value;
                    }
                }
            }, values);
        });
    }, selectors);
}
function matches(element, selector) {
    if (element.matches) {
        return element.matches(selector);
    }
    else {
        return element.msMatchesSelector(selector);
    }
}
exports.matches = matches;
function closest(element, selector) {
    if (element.closest) {
        return element.closest(selector);
    }
    else {
        return msClosest(element, selector);
    }
}
exports.closest = closest;
function msClosest(element, selector) {
    if (!element) {
        return element;
    }
    else if (matches(element, selector)) {
        return element;
    }
    else {
        return msClosest(element.parentNode, selector);
    }
}
function origin(link) {
    if (link.origin) {
        return link.origin;
    }
    else {
        return link.protocol + '//' + link.hostname;
    }
}
exports.origin = origin;
function selectText(element) {
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}
exports.selectText = selectText;
function loadScript(url) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.addEventListener('load', function () { return resolve(); });
        script.addEventListener('error', function () { return reject(); });
        document.head.appendChild(script);
    });
}
exports.loadScript = loadScript;
function enterFullscreen(element) {
    element = element || document.documentElement;
    [
        'webkitRequestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullscreen',
        'mozRequestFullScreen',
        'requestFullscreen'
    ].forEach(function (f) {
        if (f in element)
            element[f]();
    });
}
exports.enterFullscreen = enterFullscreen;
function toggleFullscreen(element) {
    [
        'webkitFullscreenElement',
        'webkitFullScreenElement',
        'mozFullscreenElement',
        'mozFullScreenElement',
        'fullscreenElement'
    ].forEach(function (p) {
        if (p in document) {
            if (document[p]) {
                [
                    'webkitExitFullscreen',
                    'webkitExitFullScreen',
                    'mozExitFullScreen',
                    'mozExitFullScreen',
                    'exitFullscreen'
                ].forEach(function (f) {
                    if (f in document)
                        document[f]();
                });
            }
            else {
                enterFullscreen(element);
            }
        }
    });
}
exports.toggleFullscreen = toggleFullscreen;
function key(code) {
    var keys = {
        8: 'Backspace',
        9: 'Tab',
        13: 'Enter',
        27: 'Escape',
        32: 'Space',
        46: 'Delete',
        112: 'F1',
        113: 'F2',
        114: 'F3',
        115: 'F4',
        116: 'F5',
        117: 'F6',
        118: 'F7',
        119: 'F8',
        120: 'F9',
        121: 'F10',
        122: 'F11',
        123: 'F12'
    };
    return code in keys ? keys[code] : String.fromCharCode(code);
}
exports.key = key;
