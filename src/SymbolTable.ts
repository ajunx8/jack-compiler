type Kind = "STATIC" | "FIELD" | "ARG" | "VAR"

type Key = number;
interface SymbolRow {
    name: string;
    type: string;
    kind: Kind;
    kindCount: number;
}

export class SymbolTable {
    public table: Map<Key, SymbolRow> = new Map();
    private index: number = 0
    private kindCount: {
        [K in Kind]: number
    } = {
            STATIC: 0,
            FIELD: 0,
            ARG: 0,
            VAR: 0
        }

    define(name: string, type: string, kind: string): void {
        const parsedKind = kind.toUpperCase() as Kind
        const symbolRow = {
            name,
            type,
            kind: parsedKind,
            kindCount: this.kindCount[parsedKind]++
        }
        this.table.set(this.index++, symbolRow)
    }

    varCount(kind: Kind) { }
    typeOf(name: string) { }
    kindOf(name: string) { }
    indexOf(name: string) { }

    reset() {
        this.table.clear()
        this.index = 0
        this.kindCount = {
            STATIC: 0,
            FIELD: 0,
            ARG: 0,
            VAR: 0
        }
    }
}

// const newSt = new SymbolTable()
// newSt.define("x", "int", "var")
// console.log(newSt)
// newSt.reset()
// console.log(newSt)