"use strict";
var dom = require('./document');
document.addEventListener('DOMContentLoaded', function () {
    var pages = dom.all('body > .page').sort(function (a, b) { return a.id.localeCompare(b.id); });
    var firstPageName = location.hash.substring(1);
    var firstPage = pages.filter(function (p) { return p.id === firstPageName; })[0];
    showPage(firstPage ? pages.indexOf(firstPage) : 0);
    dom.on(document, 'keydown', function (event) {
        var key = event.keyCode;
        var pageNames = pages.map(function (p) { return p.id; });
        var pageName = location.hash.substring(1);
        var pageIndex = pageNames.indexOf(pageName);
        if (key === 37) {
            var nextIndex = pageIndex === 0 ? pageNames.length - 1 : pageIndex - 1;
            showPage(nextIndex);
        }
        else if (key === 39) {
            var nextIndex = (pageIndex + 1) % pageNames.length;
            showPage(nextIndex);
        }
    });
    function showPage(target) {
        pages.forEach(function (p, i) {
            p.hidden = i !== target;
        });
        history.pushState('', null, '#' + pages[target].id);
    }
    dom.all('[data-repeat]').forEach(function (node) {
        var count = Number(node.dataset['repeat']);
        R.range(0, count).reverse().forEach(function (i) {
            var clone = node.cloneNode(true);
            insertNumber(clone, i + 1);
            node.parentNode.insertBefore(clone, node.nextSibling);
        });
        node.remove();
    });
    dom.all('[data-zoom]').forEach(function (node) {
        var input = node;
        dom.on(input, 'input', update);
        function update() {
            var min = Number(input.min);
            var max = Number(input.max);
            var value = Number(input.value);
            R.range(min, max + 1).forEach(function (level) {
                var className = 'zoom-' + level;
                document.documentElement.classList.toggle(className, level === value);
            });
        }
    });
    dom.all('[data-menu]').forEach(function (button) {
        dom.on(button, 'click', function () { return document.documentElement.classList.toggle('menu'); });
    });
    dom.all('[data-gradual]').forEach(function (parent) {
        var children = [].slice.call(parent.children).reverse();
        children.forEach(function (child) { return child.remove(); });
        children.forEach(function (child, i) {
            setTimeout(function () { return parent.insertBefore(child, parent.firstElementChild); }, (i + 1) * 250);
        });
    });
    dom.all('[data-cycle]').forEach(function (container) {
        var classNames = container.dataset['cycle'].split(/\s+/);
        var elements = classNames.map(function (n) { return container.getElementsByClassName(n)[0]; });
        elements.forEach(function (e) {
            dom.on(e, 'click', function (event) { return cycle(); });
            e.hidden = true;
        });
        cycle();
        function cycle() {
            var next = elements[elements.indexOf(active()) + 1] || elements[0];
            elements.forEach(function (e) { return e.hidden = e !== next; });
        }
        function active() {
            return R.find(function (e) { return !e.hidden; }, elements);
        }
    });
    (function () {
        var url = '/boom.wav';
        var req = new XMLHttpRequest();
        req.responseType = 'blob';
        req.open('GET', url);
        req.onload = function () {
            url = URL.createObjectURL(req.response);
        };
        req.send();
        dom.all('[data-sound]').forEach(function (node) {
            dom.on(node, 'click', function () {
                new Audio(url).play();
            });
        });
    })();
    function insertNumber(node, number) {
        [].slice.call(node.childNodes).forEach(function (child) {
            if (child.nodeType === 1) {
                insertNumber(child, number);
            }
            else if (child.nodeType === 3) {
                if (child.textContent.trim() !== '') {
                    child.textContent += ' ' + number;
                }
            }
        });
    }
    function createElement(config) {
        var tagName = Object.keys(config)[0];
        var element = document.createElement(tagName);
        var contents = config[tagName];
        if (typeof contents === 'object') {
            if (contents instanceof Array) {
                contents.forEach(function (contentConfig) {
                    element.appendChild(createElement(contentConfig));
                });
            }
            else {
                element.appendChild(createElement(contents));
            }
        }
        else {
            element.textContent = contents;
        }
        return element;
    }
    (function () {
        var dialogs = dom.all('.dialog').sort(function (a, b) { return a.id.localeCompare(b.id); });
        hideDialog();
        dom.on(document, 'keydown', function (event) {
            var key = event.keyCode;
            if (key === 40) {
                showDialog(activeDialog()
                    ? dialogs[dialogs.indexOf(activeDialog()) - 1]
                    : dialogs[dialogs.length - 1]);
            }
            else if (key === 38) {
                showDialog(activeDialog()
                    ? dialogs[dialogs.indexOf(activeDialog()) + 1]
                    : dialogs[0]);
            }
        });
        function showDialog(target) {
            if (!target) {
                hideDialog();
            }
            else {
                dom.id('dialog').hidden = false;
                dialogs.forEach(function (d) { return d.hidden = d !== target; });
            }
        }
        function hideDialog() {
            dom.id('dialog').hidden = true;
            dialogs.forEach(function (d) { return d.hidden = true; });
        }
        function activeDialog() {
            return R.find(function (d) { return !d.hidden; }, dialogs);
        }
    })();
});
document.addEventListener('submit', function (event) {
    event.preventDefault();
});
