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
