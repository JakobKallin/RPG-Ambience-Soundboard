import * as R from 'ramda.0.19.1.min';

export function clear(node) {
    while ( node.firstChild ) {
        node.removeChild(node.firstChild);
    }
}

export function remove(node) {
    return node.parentNode.removeChild(node);
}

export function all(selector, node) {
    node = node || document;
    return [].slice.call(node.querySelectorAll(selector));
}

export function first(selector, node) {
    node = node || document;
    return node.querySelector(selector)
}

export function id(id) {
    return document.getElementById(id);
}

export function on(node, event, listener) {
    node.addEventListener(event, listener);
}

export function capture(node, event, listener) {
    node.addEventListener(event, listener, true);
}

export function toggleClass(node, table) {
    Object.keys(table).forEach(className => {
        const value = table[className];
        value ? node.classList.add(className) : node.classList.remove(className);
    });
}

export function replicate(table, container, options, mapping, state) {
    if (!state) {
        state = {
            template: container.removeChild(container.firstElementChild),
            nodes: {},
            first: true
        };
    }
    
    R.mapObjIndexed((node, key) => {
        if (!(key in table)) {
            node.remove();
        }
    }, state.nodes);
    
    const keys = Object.keys(table);
    const order = options.sort || R.identity;
    const filter = options.filter || (() => true);
    const nodes = R.sortBy(key => order(table[key]), keys).map(key => {
        const object = table[key];
        const instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        instance.hidden = !filter(object);
        map(mapping, object, instance, state.first);
        state.nodes[key] = instance;
        return instance;
    });
    
    nodes.forEach((node, index) => {
        if (node.parent !== container) {
            container.insertBefore(node, container.children[index]);
        }
    });
    
    state.first = false;
    return (table) => {
        return replicate(table, container, options, mapping, state);
    };
}

function map(selectors, object, ancestor, first) {
    R.mapObjIndexed((values, selector) => {
        if (typeof values !== 'object') {
            values = { text: values };
        }
        
        const matching = all(selector, ancestor).concat(
            ancestor.matches(selector) ? [ancestor] : []
        );
        
        matching.forEach(node => {
            R.mapObjIndexed((createValue, key) => {
                if (key === 'text') {
                    const value = createValue(object);
                    if (node.textContent !== value) {
                        node.textContent = value;
                    }
                }
                else if (key === 'class') {
                    R.mapObjIndexed((active, className) => {
                        node.classList.toggle(className, active(object));
                    }, createValue);
                }
                else if (key === 'style') {
                    R.mapObjIndexed((createCssValue, cssKey) => {
                        const cssValue = createCssValue(object);
                        if (node.style[cssKey] !== cssValue) {
                            node.style[cssKey] = cssValue;
                        }
                    }, createValue);
                }
                else if (key === 'on') {
                    if (first) {
                        R.mapObjIndexed((callback, eventName) => {
                            node.addEventListener(eventName, () => callback(object, node));
                        }, createValue);
                    }
                }
                else if (key === 'node') {
                    if (first) createValue(node, object);
                }
                else {
                    const value = createValue(object);
                    if (node[key] !== value) {
                        node[key] = value;
                    }
                }
            }, values);
        });
    }, selectors);
}

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
