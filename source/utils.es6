export function objectToArray(object) {
    return Object.keys(object).map(key => object[key]);
}
