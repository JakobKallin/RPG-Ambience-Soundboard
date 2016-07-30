import * as dom from './document';
declare var R:any;

document.addEventListener('DOMContentLoaded', () => {
    const pages = dom.all('body > .page').sort((a, b) => a.id.localeCompare(b.id));
    const firstPageName = location.hash.substring(1);
    const firstPage = pages.filter(p => p.id === firstPageName)[0];
    showPage(firstPage ? pages.indexOf(firstPage) : 0);

    dom.on(document, 'keydown', event => {
        const pageNames = pages.map(p => p.id)
        const currentName = location.hash.substring(1);
        const currentIndex = pageNames.indexOf(currentName);

        if ((<KeyboardEvent>event).keyCode === 37) {
            const nextIndex = currentIndex === 0 ? pageNames.length - 1 : currentIndex - 1;
            showPage(nextIndex);
        }
        else if ((<KeyboardEvent>event).keyCode === 39) {
            const nextIndex = (currentIndex + 1) % pageNames.length;
            showPage(nextIndex);
        }
    });

    dom.all('[data-repeat]').forEach(node => {
        const count = Number(node.dataset['repeat']);
        R.range(0, count).reverse().forEach((i) => {
            const clone = node.cloneNode(true);
            insertNumber(clone, i + 1);
            node.parentNode.insertBefore(clone, node.nextSibling);
        });
        node.remove();
    });

    dom.all('[data-zoom]').forEach(node => {
        const input = <HTMLInputElement> node;
        dom.on(input, 'input', update);
        function update() {
            const min = Number(input.min);
            const max = Number(input.max);
            const value = Number(input.value);
            R.range(min, max + 1).forEach(level => {
                const className = 'zoom-' + level;
                document.documentElement.classList.toggle(className, level === value);
            });
        }
    });

    dom.all('[data-menu]').forEach(button => {
        dom.on(button, 'click', () => document.documentElement.classList.toggle('menu'));
    });

    dom.all('[data-gradual]').forEach(parent => {
        const children = [].slice.call(parent.children).reverse();
        children.forEach(child => child.remove());
        children.forEach((child, i) => {
            setTimeout(
                () => parent.insertBefore(child, parent.firstElementChild),
                (i + 1) * 250
            );
        });
    });

    (() => {
        let url = '/boom.wav';
        const req = new XMLHttpRequest();
        req.responseType = 'blob';
        req.open('GET', url);
        req.onload = () => {
            url = URL.createObjectURL(req.response);
        };
        req.send();

        dom.all('[data-sound]').forEach(node => {
            dom.on(node, 'click', () => {
                new Audio(url).play();
            });
        });
    })();

    function insertNumber(node, number) {
        [].slice.call(node.childNodes).forEach(child => {
            if (child.nodeType === 1) { // element
                insertNumber(child, number);
            }
            else if (child.nodeType === 3) { // text
                if (child.textContent.trim() !== '') {
                    child.textContent += ' ' + number;
                }
            }
        });
    }

    function createElement(config) {
        const tagName = Object.keys(config)[0];
        const element = document.createElement(tagName);
        const contents = config[tagName];

        if ( typeof contents === 'object' ) {
            if ( contents instanceof Array ) {
                contents.forEach(function(contentConfig) {
                    element.appendChild(createElement(contentConfig));
                });
            } else {
                element.appendChild(createElement(contents));
            }
        } else {
            element.textContent = contents;
        }

        return element;
    }

    function showPage(target) {
        pages.forEach((p, i) => {
            p.hidden = i !== target;
        });
        history.pushState('', null, '#' + pages[target].id);
    }
});
