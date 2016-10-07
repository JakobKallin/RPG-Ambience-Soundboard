import * as dom from './document';
declare var R:any;

document.addEventListener('DOMContentLoaded', () => {
    const pages = dom.all('body > .page').sort((a, b) => a.id.localeCompare(b.id));
    const firstPageName = location.hash.substring(1);
    const firstPage = pages.filter(p => p.id === firstPageName)[0];
    showPage(firstPage ? pages.indexOf(firstPage) : 0);

    dom.on(document, 'keydown', event => {
        const key = (<KeyboardEvent>event).keyCode;
        const pageNames = pages.map(p => p.id);
        const pageName = location.hash.substring(1);
        const pageIndex = pageNames.indexOf(pageName);

        if (key === 37) {
            const nextIndex = pageIndex === 0 ? pageNames.length - 1 : pageIndex - 1;
            showPage(nextIndex);
        }
        else if (key === 39) {
            const nextIndex = (pageIndex + 1) % pageNames.length;
            showPage(nextIndex);
        }
    });

    function showPage(target) {
        pages.forEach((p, i) => {
            p.hidden = i !== target;
        });
        history.pushState('', null, '#' + pages[target].id);
    }

    dom.all('[data-repeat]').reverse().forEach(node => {
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

    dom.all('[data-cycle]').forEach(container => {
        const classNames = container.dataset['cycle'].split(/\s+/);
        const elements = <HTMLElement[]> classNames.map(n => container.getElementsByClassName(n)[0]);
        elements.forEach(e => {
            dom.on(e, 'click', event => cycle());
            e.hidden = true;
        });
        cycle();

        function cycle() {
            const next = elements[elements.indexOf(active()) + 1] || elements[0];
            elements.forEach(e => e.hidden = e !== next);
        }

        function active() {
            return R.find(e => !e.hidden, elements);
        }
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

    (() => {
        const dialogs = dom.all('.dialog').sort((a, b) => a.id.localeCompare(b.id));
        hideDialog();

        dom.on(document, 'keydown', event => {
            const key = (<KeyboardEvent>event).keyCode;

            if (key === 40) {
                showDialog(activeDialog()
                    ? dialogs[dialogs.indexOf(activeDialog()) - 1]
                    : dialogs[dialogs.length - 1]
                );
            }
            else if (key === 38) {
                showDialog(activeDialog()
                    ? dialogs[dialogs.indexOf(activeDialog()) + 1]
                    : dialogs[0]
                );
            }
        });

        function showDialog(target) {
            if (!target) {
                hideDialog();
            }
            else {
                dom.id('dialog').hidden = false;
                dialogs.forEach(d => d.hidden = d !== target);
            }
        }

        function hideDialog() {
            dom.id('dialog').hidden = true;
            dialogs.forEach(d => d.hidden = true);
        }

        function activeDialog() {
            return R.find(d => !d.hidden, dialogs);
        }
    })();
});

document.addEventListener('submit', event => {
    event.preventDefault();
});
