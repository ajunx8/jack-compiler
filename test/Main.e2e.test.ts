import { test, expect, describe } from "vitest";
import { Main } from "../src/Main.js";
import { JackTokenizer } from "../src/JackTokenizer.js";
import * as fs from "node:fs/promises"
import path from "node:path";

// End-to-end testing of the business logic
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

describe("full compilation", () => {
    async function compileDirectoryAndCompare(dir: string) {
        const main = new Main(dir)
        await main.handleInput()
        await main.start()

        // compare xmlFiles
        for (const xmlFile of main.xmlFiles) {
            const xmlFileContents = await fs.readFile(xmlFile, 'utf8')
            const correctXmlFile = `test/project10-jack-test-files-fixture/${path.basename(dir)}/${path.basename(xmlFile)}`
            const correctXmlFileContents = await fs.readFile(correctXmlFile, 'utf8')

            expect(xmlFileContents).toBe(correctXmlFileContents)
        }
    }

    // debug this test
    test('compiles ExpressionLessSquare', async () => {
        const input = 'test/project10-jack-test-files/ExpressionLessSquare'
        const main = new Main(input)
        await main.handleInput()
        await main.start()

        
    })

    test('compiles Square', async () => {
        const input = 'test/project10-jack-test-files/Square'
        await compileDirectoryAndCompare(input)
    })

    test('compiles ArrayTest', async () => {
        const input = 'test/project10-jack-test-files/ArrayTest'
        await compileDirectoryAndCompare(input)
    })
})
