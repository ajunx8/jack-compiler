import { JackTokenizer } from './JackTokenizer.js'
import { CompilationEngine } from './CompilationEngine.js'
import { SymbolTable } from "./SymbolTable.js"
import { VmWriter } from './VmWriter.js';
import * as fs from 'node:fs/promises'
import path from 'node:path';
import type { Stats } from 'node:fs';

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
        return fs.stat(input)
    }

    async readJackFile(jackFile: string) {
        return fs.readFile(jackFile, 'utf8')
    }

    async writeFile(outPath: string, contents: string) {
        await fs.writeFile(outPath, contents)
    }

    public async start(): Promise<void> {
        for (const jackFile of this.jackFiles) {
            const outPath = jackFile.replace('.jack', '.vm')
            this.vmFiles.push(outPath)

            const contents = await this.readJackFile(jackFile)
            const tokenizer = new JackTokenizer(contents)
            const symbolTable = new SymbolTable()
            const vmWriter = new VmWriter(outPath)

            const engine = new CompilationEngine(tokenizer, symbolTable, vmWriter)
            console.log(`compiling file: ${outPath}`)
            engine.compileClass()

            await this.writeFile(outPath, vmWriter.outContent)
        }
    }
}