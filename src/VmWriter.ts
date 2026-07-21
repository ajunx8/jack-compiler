import { type Kind } from './SymbolTable.js'
export type Segment = "CONSTANT" | "ARGUMENT" | "LOCAL" | "STATIC" | "THIS" | "THAT" | "POINTER" | "TEMP"
export type Command = "ADD" | "SUB" | "NEG" | "EQ" | "GT" | "LT" | "AND" | "OR" | "NOT"

export class VmWriter {
    outContent: string = ''
    kindToSegmentMap: {
        [K in Kind]: Segment
    } = {
        "FIELD": "THIS", 
        "STATIC": "STATIC", 
        "ARG": "ARGUMENT", 
        "VAR": "LOCAL", 
    }

    constructor(
        public outFile: string,
    ) { }

    addLine(text: string) {
        const lines = '\n' + text
        this.outContent += lines
    }

    writePush(segment: Segment | Kind, index: string | number) {
        const mapped = this.kindToSegmentMap[segment as Kind] || segment;
        this.addLine(`push ${mapped.toLowerCase()} ${Number(index)}`)
    }
    writePop(segment: Segment | Kind, index: number) {
        const mapped = this.kindToSegmentMap[segment as Kind] || segment;
        this.addLine(`pop ${mapped.toLowerCase()} ${index}`)
    }
    writeArithmetic(operation: "+" | "-" | "*" | "/" | "&" | "|" | "<" | ">" | "=" | "NEG" | "NOT") {
        switch (operation) {
            case "+": this.addLine("add"); break
            case "-": this.addLine("sub"); break
            case "*": this.writeCall('Math.multiply', 2); break
            case "/": this.writeCall('Math.divide', 2); break
            case "&": this.addLine("and"); break
            case "|": this.addLine("or"); break
            case "<": this.addLine("lt"); break
            case ">": this.addLine("gt"); break
            case "=": this.addLine("eq"); break
            case "NEG": this.addLine("neg"); break
            case "NOT": this.addLine("not"); break
            default: throw new SyntaxError(`operation unrecognised: ${operation}`)
        }
    }
    writeLabel(label: string) {
        this.addLine(`label ${label}`)
    }
    writeGoto(label: string) {
        this.addLine(`goto ${label}`)
    }
    writeIf(label: string) {
        this.addLine(`if-goto ${label}`)
    }
    writeCall(label: string, nArgs: number) {
        this.addLine(`call ${label} ${nArgs}`)
    }
    writeFunction(label: string, nVars: number) {
        this.addLine(`function ${label} ${nVars}`)
    }
    writeReturn() {
        this.addLine("return")
    }
    close() {
        const removeStartingNewLine = () => {
            if (this.outContent[0] === "\n" ) {
                this.outContent = this.outContent.slice(1)
            } else {
                console.log("boop")
            }
        }
        removeStartingNewLine()
    }
}