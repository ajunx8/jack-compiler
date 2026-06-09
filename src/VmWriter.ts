type Segment = "CONST" | "ARG" | "LOCAL" | "STATIC" | "THIS" | "THAT" | "POINTER" | "TEMP"
type Command = "ADD" | "SUB" | "NEG" | "EQ" | "GT" | "LT" | "AND" | "OR" | "NOT"

export class VmWriter {
    constructor(
        public outFile: string,
    ) { }

    writePush(segment: Segment, index: number) { }
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
        this.outFile += vmC
    }
    writeFunction(label: string, nVars: number) { }
    writeReturn() { }
    close() { }
}