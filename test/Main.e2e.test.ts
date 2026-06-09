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
    async function tokenizeDirectory(dir: string) {
        const main = new Main(dir)
        await main.handleInput()
        await createTokenFiles(main)

        for (const tokenFile of main.tokenFiles) {
            const tokenFileContents = await fs.readFile(tokenFile, 'utf8')
            const correctTokenFile = `test/project10-jack-test-files-fixture/${path.basename(dir)}/${path.basename(tokenFile)}`
            const correctTokenFileContents = await fs.readFile(correctTokenFile, 'utf8')

            expect(tokenFileContents).toBe(correctTokenFileContents)
        }

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
    }

    test('it successfully creates valid tokenFiles for ArrayTest', async () => {
        const input = 'test/project10-jack-test-files/ArrayTest'
        await tokenizeDirectory(input)
    })

    test('it successfully creates valid tokenFiles for ExpressionLessSquare', async () => {
        const input = 'test/project10-jack-test-files/ExpressionLessSquare'
        await tokenizeDirectory(input)
    })

    test('it successfully creates valid tokenFiles for Square', async () => {
        const input = 'test/project10-jack-test-files/Square'
        await tokenizeDirectory(input)
    })
})


describe("testing Symbol Tables of project 10 programs", () => {
    async function compile(input: string) {
        const main = new Main(input)
        await main.handleInput()
        await main.start()
    }
    // debug this test
    test('compiles ExpressionLessSquare', async () => {
        const input = 'test/project10-jack-test-files/ExpressionLessSquare'
        compile(input)
    })
    test('compiles Square', async () => {
        const input = 'test/project10-jack-test-files/Square'
        compile(input)
    })
    test('compiles ArrayTest', async () => {
        const input = 'test/project10-jack-test-files/ArrayTest'
        compile(input)
    })
})

describe("compilation project 11 programs", () => {
    async function compile(dir: string) {
        const main = new Main(dir)
        await main.handleInput()
        await main.start2()
    }

    test('compiles Seven', async () => {
        await compile('test/11/Seven')
    })

    test('compiles ConvertToBin', async () => {
        await compile('test/11/ConvertToBin')
    })

    test('compiles Square', async () => {
        await compile('test/11/Square')
    })

    test('compiles Average', async () => {
        await compile('test/11/Average')
    })

    test('compiles Pong', async () => {
        await compile('test/11/Pong')
    })

    test('compiles ComplexArrays', async () => {
        await compile('test/11/ComplexArrays')
    })
})
