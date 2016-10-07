export function bound(min:number, max:number, value:number):number {
    const boundedAbove = Math.min(value, max);
    return Math.max(min, boundedAbove);
}

export function parseNumber(str:string) {
    const number = parseFloat(str);
    if (isNaN(number)) {
        throw new Error('Cannot parse string to number: ' + str);
    }
    else {
        return number;
    }
}

export function parseQuery(location:Location):{} {
    const query = {};
    if (location.search.substring(1) !== '') {
        location.search.substring(1)
        .split('&')
        .forEach(s => {
            const kv = s.split('=').map(decodeURIComponent);
            const k = kv[0];
            const v = kv[1];
            query[k] = v;
        });
    }
    return query;
}

export function shallowlyEqual(a:any[], b:any[]) {
    return a.length === b.length && a.every((v, i) => a[i] === b[i]);
}

export function capitalize(string:string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1);
}
