import { test, expect, describe } from "vitest";
import { Main } from "../src/Main.js";
import { JackTokenizer } from "../src/JackTokenizer.js";
import * as fs from "node:fs/promises"
import path from "node:path";

// End-to-end testing of the business logic
describe('files and directory input handling', () => {
    test('it successfully handles a valid file', async () => {
        const inputFile = 'test/11/Seven/Main.jack'
        const main = new Main(inputFile)
        await main.handleInput()
        const cwd = process.cwd()
        const expectedJackFiles = [
            `${cwd}/${inputFile}`
        ]
        expect(main.jackFiles).toEqual(expectedJackFiles)
    })
    test('it successfully handles a valid directory', async () => {
        const inputDir = 'test/11/Square'
        const main = new Main(inputDir)
        await main.handleInput()
        const cwd = process.cwd()
        const expectedJackFiles = [
            `${cwd}/test/11/Square/Main.jack`,
            `${cwd}/test/11/Square/Square.jack`,
            `${cwd}/test/11/Square/SquareGame.jack`
        ]
        expect(main.jackFiles).toEqual(expectedJackFiles)
    })
})
describe('tokenization project 10 test programs', () => {
    const baseDir = 'test/project10-jack-test-files'
    async function tokenizeDirectory(dir: string) {
        const main = new Main(dir)
        await main.handleInput()
        await createTokenFiles(main)
        async function createTokenFiles(main: Main) {
            for (const jackFile of main.jackFiles) {
                const contents = await main.readJackFile(jackFile)
                const tokenizer = new JackTokenizer(contents)
                const tokenFileContents = tokenizer.createTokenFileContents()
                const outPath = jackFile.replace('.jack', 'T.xml')
                main.tokenFiles.push(outPath)
                await main.writeFile(outPath, tokenFileContents)
            }
        }
        for (const tokenFile of main.tokenFiles) {
            const tokenFileContents = await fs.readFile(tokenFile, 'utf8')
            const correctTokenFile = `test/project10-jack-test-files-fixture/${path.basename(dir)}/${path.basename(tokenFile)}`
            const correctTokenFileContents = await fs.readFile(correctTokenFile, 'utf8')

            expect(tokenFileContents).toBe(correctTokenFileContents)
        }
    }
    test('it successfully creates valid tokenFiles for ExpressionLessSquare', async () => {
        await tokenizeDirectory(`${baseDir}/ExpressionLessSquare`)
    })
    test('it successfully creates valid tokenFiles for Square', async () => {
        await tokenizeDirectory(`${baseDir}/Square`)
    })
    test('it successfully creates valid tokenFiles for ArrayTest', async () => {
        await tokenizeDirectory(`${baseDir}/ArrayTest`)
    })
})

describe("compilation project 10", () => {
    async function compile(input: string) {
        const main = new Main(input)
        await main.handleInput()
        await main.start()
    }
    describe("compilation project 10", () => {
        const baseDir = 'test/project10-jack-test-files'
        test('ExpressionLessSquare', async () => {
            compile(`${baseDir}/ExpressionLessSquare`)
        })
        test('Square', async () => {
            compile(`${baseDir}/Square`)
        })
        test('ArrayTest', async () => {
            compile(`${baseDir}/ArrayTest`)
        })
    })
    describe("compilation project 11", () => {
        const baseDir = 'test/11'
        test('Seven', async () => {
            await compile(`${baseDir}/Seven`)
        })
        test('ConvertToBin', async () => {
            await compile(`${baseDir}/ConvertToBin`)
        })
        test('Square', async () => {
            await compile(`${baseDir}/Square`)
        })
        test('Average', async () => {
            await compile(`${baseDir}/Average`)
        })
        test('Pong', async () => {
            await compile(`${baseDir}/Pong`)
        })
        test('ComplexArrays', async () => {
            await compile(`${baseDir}/ComplexArrays`)
        })
    })
})
