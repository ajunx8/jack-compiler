type Kind = "STATIC" | "FIELD" | "ARG" | "VAR"

type Name = string;
export interface SymbolRow {
    type: string;
    kind: Kind;
    kindCount: number;
}

export class SymbolTable {
    public table: Map<Name, SymbolRow> = new Map();

    private kindCountRecord: {
        [K in Kind]: number
    } = {
            STATIC: 0,
            FIELD: 0,
            ARG: 0,
            VAR: 0
        }

    define(name: string, type: string, kind: string | undefined): void {
        if (kind === undefined) throw new Error("kind is undefined")
            
        const parsedKind = kind.toUpperCase() as Kind

        const symbolRow = {
            type,
            kind: parsedKind,
            kindCount: this.kindCountRecord[parsedKind]++
        }

        this.table.set(name, symbolRow)
    }

    kindCount(kind: Kind): number {
        return this.kindCountRecord[kind]
    }

    kindOf(name: string): Kind | "NONE" {
        const row = this.table.get(name)
        return row ? row.kind : "NONE"
    }

    indexOf(name: string): number | "NONE" {
        const row = this.table.get(name)
        return row ? row.kindCount : "NONE"
    }

    reset() {
        this.table.clear()
        
        this.kindCountRecord = {
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