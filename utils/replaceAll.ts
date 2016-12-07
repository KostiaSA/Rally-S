export function replaceAll(str: string, search: string, replace: string): string {
    if (str === undefined)
        return undefined as any;
    else if (str === null)
        return null as any;
    else
        return str.replace(new RegExp(search, "g"), replace);
}

