import { JackTokenizer } from './JackTokenizer.js'
import { CompilationEngine } from './CompilationEngine.js'
import { SymbolTable } from "./SymbolTable.js"
import * as fs from 'node:fs/promises'
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Stats } from 'node:fs';
import { VmWriter } from './VmWriter.js';

// app layer
export class Main {
    userArg: string;
    jackFiles: string[] = [];
    tokenFiles: string[] = [];
    xmlFiles: string[] = [];
    vmFiles: string[] = [];

    constructor(userArg: string) {
        this.userArg = userArg
    }

    public async handleInput(): Promise<void> {
        const stats = await this.validateInput(this.userArg)

        const parsedPath = path.parse(this.userArg)
        const absolutePath = path.resolve(process.cwd(), this.userArg)
        if (stats.isFile() && parsedPath.ext === '.jack') {
            this.jackFiles.push(absolutePath)
        }

        if (stats.isDirectory()) {
            const result = await fs.readdir(this.userArg)
            const jackFiles = result.filter(file => file.endsWith('.jack'))
            const jackFilesAbsPath = jackFiles.map(jackFile => path.resolve(process.cwd(), this.userArg, jackFile))
            this.jackFiles = this.jackFiles.concat(jackFilesAbsPath)
        }
        return
    }

    async validateInput(input: string): Promise<Stats> {
        return stat(input)
    }

    async readJackFile(jackFile: string) {
        return fs.readFile(jackFile, 'utf8')
    }

    async writeFile(outPath: string, contents: string) {
        await fs.writeFile(outPath, contents)
    }

    public async start(): Promise<void> {
        for (const jackFile of this.jackFiles) {
            const outPath = jackFile.replace('.jack', '.xml')
            const outPathVM = jackFile.replace('.jack', '.vm')
            this.xmlFiles.push(outPath)
            this.vmFiles.push(outPathVM)

            const contents = await this.readJackFile(jackFile)
            const tokenizer = new JackTokenizer(contents)
            const classSymbolTable = new SymbolTable()
            const subroutineSymbolTable = new SymbolTable()
            const vmWriter = new VmWriter("I write things")

            const engine = new CompilationEngine(tokenizer, classSymbolTable, subroutineSymbolTable, vmWriter)
            engine.compileClass()

            await this.writeFile(outPath, engine.outContent)
            // await this.writeFile(outPathVM, engine.outContent)
        }
    }
}