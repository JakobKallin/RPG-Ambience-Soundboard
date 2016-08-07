interface ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}

interface ArrayConstructor {
    from(value:any):any[];
}
