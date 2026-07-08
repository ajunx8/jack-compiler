import { type Kind } from './SymbolTable.js'
export type Segment = "CONST" | "ARG" | "LOCAL" | "STATIC" | "THIS" | "THAT" | "POINTER" | "TEMP"
export type Command = "ADD" | "SUB" | "NEG" | "EQ" | "GT" | "LT" | "AND" | "OR" | "NOT"

// this should only write vm commands
export class VmWriter {
    outContent: string = ''
    kindToSegmentMap: {
        [K in Kind]: Segment
    } = {
        "FIELD": "THIS", 
        "STATIC": "STATIC", 
        "ARG": "ARG", 
        "VAR": "LOCAL", 
    }

    constructor(
        public outFile: string,
    ) { }

    addLines(text: string) {
        const lines = '\n' + text.toLocaleLowerCase()
        this.outContent += lines
        console.log(lines)
    }

    writePush(segment: Segment | Kind, index: string | number) {
        const mapped = this.kindToSegmentMap[segment as Kind] || segment;
        this.addLines(`push ${mapped} ${Number(index)}`)
    }
    writePop(segment: Segment | Kind, index: number) {
        const mapped = this.kindToSegmentMap[segment as Kind] || segment;
        this.addLines(`pop ${mapped} ${index}`)
    }
    writeArithmetic(operation: "+" | "-" | "*" | "/" | "&" | "|" | "<" | ">" | "=" | "NEG" | "NOT") {
        switch (operation) {
            case "+": this.addLines("add"); break
            case "-": this.addLines("sub"); break
            case "*": this.addLines('multiply'); break
            case "/": this.addLines('divide'); break
            case "&": this.addLines("and"); break
            case "|": this.addLines("or"); break
            case "<": this.addLines("lt"); break
            case ">": this.addLines("gt"); break
            case "=": this.addLines("eq"); break
            case "NEG": this.addLines("neg"); break
            case "NOT": this.addLines("not"); break
            default: throw new SyntaxError(`operation unrecognised: ${operation}`)
        }
    }
    writeLabel(label: string) {
        this.addLines(label)
    }
    writeGoto(label: string) {
        this.addLines(`goto ${label}`)
    }
    writeIf(label: string) {
        this.addLines(`if-goto ${label}`)
    }
    writeCall(label: string, nArgs: number) {
        this.addLines(`call ${label} ${nArgs}`)
    }
    writeFunction(label: string, nVars: number) {

    }
    writeReturn() {
        this.addLines("return")
    }
    close() { }
}