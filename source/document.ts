declare var R:any;

export function clear(node) {
    while ( node.firstChild ) {
        node.removeChild(node.firstChild);
    }
}

export function remove(node) {
    return node.parentNode.removeChild(node);
}

export function all(selector, node?):HTMLElement[] {
    node = node || document;
    return [].slice.call(node.querySelectorAll(selector));
}

export function first(selector, node?):HTMLElement {
    node = node || document;
    return node.querySelector(selector)
}

export function id(id) {
    return document.getElementById(id);
}

export function on(node:any, event:string, listener:(e:Event) => void) {
    node.addEventListener(event, listener);
}

export function capture(node, event, listener) {
    node.addEventListener(event, listener, true);
}

export function array(arraylike) {
    if ('from' in Array) {
        return Array.from(arraylike);
    }
    else {
        return Array.prototype.slice.call(arraylike);
    }
}

export function toggleClass(node, table) {
    Object.keys(table).forEach(className => {
        const value = table[className];
        value ? node.classList.add(className) : node.classList.remove(className);
    });
}

export function replicate(container, table, userState, options, createMapping, state?) {
    if (!state) {
        state = {
            template: container.removeChild(container.firstElementChild),
            nodes: {},
            first: true,
            mappings: {}
        };
    }

    if (state.first) {
        R.mapObjIndexed((value, key) => {
            state.mappings[key] = createMapping(value);
        }, table);
    }

    R.mapObjIndexed((node, key) => {
        if (!(key in table)) {
            node.remove();
        }
    }, state.nodes);

    const keys = Object.keys(table);
    const order = options.sort || R.identity;
    const nodes = R.sortBy(key => order(table[key]), keys).map(key => {
        const object = table[key];
        const instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        map(state.mappings[key], instance, state.first, userState);
        state.nodes[key] = instance;
        return instance;
    });

    if (state.first) {
        nodes.forEach((node, index) => {
            if (node.parent !== container) {
                container.insertBefore(node, container.children[index]);
            }
        });
    }

    state.first = false;
    return (userState) => {
        return replicate(container, table, userState, options, createMapping, state);
    };
}

function map(selectors, ancestor, first, state) {
    R.mapObjIndexed((values, selector) => {
        if (typeof values !== 'object') {
            values = { text: values };
        }

        const matching = all(selector, ancestor).concat(
            matches(ancestor, selector) ? [ancestor] : []
        );

        matching.forEach(node => {
            R.mapObjIndexed((value, key) => {
                if (key === 'text') {
                    update(v => set.property(node, 'textContent', v), value, first, state);
                }
                else if (key === 'class') {
                    R.mapObjIndexed((active, className) => {
                        update(v => set.class(node, className, v), active, first, state);
                    }, value);
                }
                else if (key === 'data') {
                    R.mapObjIndexed((dataValue, dataKey) => {
                        update(v => set.data(node, dataKey, v), dataValue, first, state);
                    }, value);
                }
                else if (key === 'style') {
                    R.mapObjIndexed((cssValue, cssKey) => {
                        update(v => set.style(node, cssKey, v), cssValue, first, state);
                    }, value);
                }
                else if (key === 'on') {
                    if (first) {
                        R.mapObjIndexed((callback, eventName) => {
                            node.addEventListener(eventName, callback);
                        }, value);
                    }
                }
                else {
                    update(v => set.property(node, key, v), value, first, state);
                }
            }, values);
        });
    }, selectors);
}

function update(callback, value, first, state) {
    if (first || typeof value === 'function') {
        if (typeof value === 'function') {
            value = value(state);
        }
        callback(value);
    }
}

const set = {
    class: (node, key, value) => {
        node.classList.toggle(key, value);
    },
    style: (node, key, value) => {
        if (node.style[key] !== value) node.style[key] = value;
    },
    property: (node, key, value) => {
        if (node[key] != value) node[key] = value;
    },
    data: (node, key, value) => {
        if (node.dataset[key] != value) node.dataset[key] = value;
    }
};

export function matches(element, selector) {
    if ( element.matches ) {
        return element.matches(selector);
    }
    else {
        return element.msMatchesSelector(selector);
    }
}

export function closest(element, selector) {
    if ( element.closest ) {
        return element.closest(selector);
    }
    else {
        return msClosest(element, selector);
    }
}

function msClosest(element, selector) {
    if ( !element ) {
        return element;
    }
    else if ( matches(element, selector) ) {
        return element;
    }
    else {
        return msClosest(element.parentNode, selector);
    }
}

export function origin(link) {
    if ( link.origin ) {
        return link.origin;
    }
    else {
        return link.protocol + '//' + link.hostname;
    }
}

export function selectText(element) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

export function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject());
        document.head.appendChild(script);
    });
}

export function enterFullscreen(element?:Element) {
    element = element || document.documentElement;
    [
        'webkitRequestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullscreen',
        'mozRequestFullScreen',
        'requestFullscreen'
    ].forEach(f => {
        if (f in element) element[f]();
    });
}

export function toggleFullscreen(element?:Element) {
    [
        'webkitFullscreenElement',
        'webkitFullScreenElement',
        'mozFullscreenElement',
        'mozFullScreenElement',
        'fullscreenElement'
    ].forEach(p => {
        if (p in document) {
            if (document[p]) {
                [
                    'webkitExitFullscreen',
                    'webkitExitFullScreen',
                    'mozExitFullScreen',
                    'mozExitFullScreen',
                    'exitFullscreen'
                ].forEach(f => {
                    if (f in document) document[f]();
                });
            }
            else {
                enterFullscreen(element);
            }
        }
    });
}

export function key(code) {
    const keys = {
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

export function stateful(container:HTMLElement, states:string[]):(s:string) => void {
    const enterState = (newState) => {
        states.forEach(state => {
            const element = <HTMLElement> container.getElementsByClassName(state)[0];
            element.hidden = state !== newState;
        });
        enterState['current'] = newState;
    };
    enterState(states[0]);
    return enterState;
}

export function isControl(element:HTMLElement) {
    return ['input', 'textarea', 'select', 'button'].indexOf(element.tagName.toLowerCase()) !== -1;
}
