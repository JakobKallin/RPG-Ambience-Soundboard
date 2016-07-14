export function read(version:number, defaults:{}):{} {
    const json = localStorage.getItem(version.toString());
    if (json === null) {
        return Object.assign({}, defaults);
    }
    else {
        try {
            const store = JSON.parse(json);
            if (typeof store === 'object' && !Array.isArray(store)) {
                return Object.assign({}, defaults, store);
            }
            else {
                return Object.assign({}, defaults);
            }
        }
        catch(error) {
            return Object.assign({}, defaults);
        }
    }
}

export function modify(version:number, defaults:{}, transaction:(store:{}) => {}):void {
    const before = read(version, defaults);
    const after = transaction(before);
    write(version, after);
}

function write(version:number, store:{}):void {
    const json = JSON.stringify(store);
    localStorage.setItem(version.toString(), json);
}
