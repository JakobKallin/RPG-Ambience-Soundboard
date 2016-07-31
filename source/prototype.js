"use strict";
var dom = require('./document');
document.addEventListener('DOMContentLoaded', function () {
    var pages = dom.all('body > .page').sort(function (a, b) { return a.id.localeCompare(b.id); });
    var firstPageName = location.hash.substring(1);
    var firstPage = pages.filter(function (p) { return p.id === firstPageName; })[0];
    showPage(firstPage ? pages.indexOf(firstPage) : 0);
    dom.on(document, 'keydown', function (event) {
        var pageNames = pages.map(function (p) { return p.id; });
        var currentName = location.hash.substring(1);
        var currentIndex = pageNames.indexOf(currentName);
        if (event.keyCode === 37) {
            var nextIndex = currentIndex === 0 ? pageNames.length - 1 : currentIndex - 1;
            showPage(nextIndex);
        }
        else if (event.keyCode === 39) {
            var nextIndex = (currentIndex + 1) % pageNames.length;
            showPage(nextIndex);
        }
    });
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
    function showPage(target) {
        pages.forEach(function (p, i) {
            p.hidden = i !== target;
        });
        history.pushState('', null, '#' + pages[target].id);
    }
});
