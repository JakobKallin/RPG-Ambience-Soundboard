import * as R from 'ramda.0.19.1.min';
import * as dom from './dom.js';

document.addEventListener('DOMContentLoaded', () => {
    const pages = dom.all('body > .page').sort((a, b) => a.id.localeCompare(b.id));
    const pageMenu = createElement({
        select: pages.map(page => ({ option: page.id }))
    });
    pageMenu.style.position = 'fixed';
    pageMenu.style.right = '0';
    pageMenu.style.top = '0';
    pageMenu.style.margin = '1rem';
    document.body.appendChild(pageMenu);
    
    const firstPageName = location.hash.substring(1);
    const firstPage = pages.filter(p => p.id === firstPageName)[0];
    showPage(firstPage ? pages.indexOf(firstPage) : 0);
    pageMenu.addEventListener('change', () => {
        const index = pageMenu.selectedIndex;
        showPage(index);
        history.pushState('', null, '#' + pages[index].id);
    });
    
    dom.all('[data-repeat]').forEach(node => {
        const count = Number(node.dataset.repeat);
        R.range(0, count).reverse().forEach((i) => {
            const clone = node.cloneNode(true);
            insertNumber(clone, i + 1);
            node.parentNode.insertBefore(clone, node.nextSibling);
        });
        node.remove();
    });
    
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
        pageMenu.selectedIndex = target;
        pages.forEach((p, i) => {
            p.hidden = i !== target;
        });
    }
});
