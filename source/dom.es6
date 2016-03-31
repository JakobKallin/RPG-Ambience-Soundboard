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

// export function replicate(values, template, container, callback) {
//     clear(container);
//     if ( !Array.isArray(values) ) {
//         values = [values];
//     }
//     values.forEach((value, index) => {
//         const instance = template.cloneNode(true);
//         container.appendChild(instance);
//         callback(instance, value, index);
//     });
// }

export function replicate(table, container, order, mapping, state) {
    if (!state) {
        state = {
            template: container.removeChild(container.firstElementChild),
            nodes: {}
        };
    }
    
    const keys = Object.keys(table);
    const nodes = R.sortBy(key => order(table[key]), keys).map(key => {
        const value = table[key];
        const instance = key in state.nodes
            ? state.nodes[key]
            : state.template.cloneNode(true);
        map(mapping(value), instance);
        state.nodes[key] = instance;
        return instance;
    });
    
    nodes.forEach((node, index) => {
        if (node.parent !== container) {
            container.insertBefore(node, container.children[index]);
        }
    });
    
    return (table) => {
        return replicate(table, container, order, mapping, state);
    };
}

function map(selectors, ancestor) {
    R.mapObjIndexed((value, selector) => {
        all(selector, ancestor).forEach(node => {
            if (typeof value === 'object') {
                R.mapObjIndexed((attrValue, attrName) => {
                    if (attrName === 'class') {
                        R.mapObjIndexed((active, className) => {
                            node.classList.toggle(className, active);
                        }, attrValue);
                    }
                    else {
                        node.setAttribute(attrValue, attrName);
                    }
                }, value);
            }
            else {
                node.textContent = value;
            }
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
