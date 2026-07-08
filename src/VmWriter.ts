export type Segment = "CONST" | "ARG" | "LOCAL" | "STATIC" | "THIS" | "THAT" | "POINTER" | "TEMP"
export type Command = "ADD" | "SUB" | "NEG" | "EQ" | "GT" | "LT" | "AND" | "OR" | "NOT"

// this should only write vm commands
export class VmWriter {
    outContent: string = ''

    constructor(
        public outFile: string,
    ) { }

    addLine(textArray: string[]) {
        this.outContent += '\n' + textArray.join('\n')
    }

    writePush(segment: Segment, index: number) {
        this.addLine([`push ${segment.toLocaleLowerCase()} ${index}`])
    }
    writePop(segment: Segment, index: number) {
        this.addLine([`pop ${segment.toLocaleLowerCase()} ${index}`])
    }
    writeArithmetic(command: Command) { }
    writeLabel(label: string) { }
    writeGoto(label: string) { }
    writeIf(label: string) { }
    writeCall(label: string, nArgs: number) {
        const vmC = `
        call ${label} ${nArgs}
        pop temp 0
        `
    }
    writeFunction(label: string, nVars: number) { }
    writeReturn() {
        this.addLine(["return"])
    }
    close() { }
}