/*
Goal: develop a syntax analyzer for the Jack language

Contract:
- Implement syntax analyzer for the Jack language
- User it to parse all the supplied test .jack class files
- For each test .jack file, your analyzer should generate an .xml output file,
identical to the supplied compare file.

Tools and Resources:
- Text programs and compare files: nand2tetris/projects/10
- TextComparer: nand2tetris/tools
- XML file viewer: browser, text editor, ...
- Programming language: Java, Python, ...
- Reference: chapter 10 in 'The Elements of Computing Systems'

Implementation plan:
- Build a Jack Tokenizer
- Build a compilation engine (a Jack analyzer that makes use of the Tokenizer's services):
    - Basic version
    - Complete version
*/

/*
Top-most module JackAnalyzer
Input: a single fileName.jack, or a directory containing 0 or more such files
For each file, goes through the following logic:
    1. Creates a JackTokenizer from fileName.jack
    2. Creates an output file named fileName.xml
    3. Creates and uses a CompilationEngine to compile the input JackTokenizer into the output file.
*/
import { JackTokenizer } from './JackTokenizer.js'
import { CompilationEngine } from './CompilationEngine.js'
import * as fs from 'node:fs/promises'
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Stats } from 'node:fs';

// app layer
export class Main {
    userArg: string;
    jackFiles: string[] = [];
    tokenFiles: string[] = [];
    xmlFiles: string[] = [];

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

    private async validateInput(input: string): Promise<Stats> {
        return stat(input)
    }

    private async readJackFile(jackFile: string) {
        return fs.readFile(jackFile, 'utf8')
    }

    private async writeXMLFile(outPath: string, contents: string) {
        await fs.writeFile(outPath, contents)
    }

    public async startAnalysis(): Promise<void> {
        for (const jackFile of this.jackFiles) {
            const outPath = jackFile.replace('.jack', '.xml')
            this.xmlFiles.push(outPath)
            
            const contents = await this.readJackFile(jackFile)
            const tokenizer = new JackTokenizer(contents)
            const engine = new CompilationEngine(tokenizer)

            engine.compileClass()

            await this.writeXMLFile(outPath, engine.outContent)
        }
    }

    public async createTokenFiles() {
        for (const jackFile of this.jackFiles) {
            const contents = await this.readJackFile(jackFile)
            const tokenizer = new JackTokenizer(contents)

            const tokenFileContents = tokenizer.createTokenFileContents()

            const outPath = jackFile.replace('.jack', 'T.xml')
            this.tokenFiles.push(outPath)
            await this.writeXMLFile(outPath, tokenFileContents)
        }
    }
}