type Segment = "CONST" | "ARG" | "LOCAL" | "STATIC" | "THIS" | "THAT" | "POINTER" | "TEMP"
type Command = "ADD" | "SUB" | "NEG" | "EQ" | "GT" | "LT" | "AND" | "OR" | "NOT"

export class VmWriter {
    outContent: string = ''

    constructor(
        public outFile: string,
    ) { }

    addLine(text: string) {
        this.outContent += `\n${text}`
    }
    writePush(segment: Segment, index: number) {
        this.addLine(`push ${index}`)
    }
    writePop(segment: Segment, index: number) { }
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
        this.addLine("return")
    }
    close() { }
}