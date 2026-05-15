import { test, expect } from "vitest";
import { Main } from "../src/Main.js";
import * as fs from "node:fs/promises"
import path from "node:path";

// End-to-end testing of the business logic
test('it successfully handles a valid file', async () => {
    const inputFile = 'test/project10-jack-test-files/test-file-Main.jack'
    const main = new Main(inputFile)
    await main.handleInput()

    const cwd = process.cwd()
    const expectedJackFiles = [
        `${cwd}/test/project10-jack-test-files/test-file-Main.jack`
    ]

    expect(main.jackFiles).toEqual(expectedJackFiles)
})

test('it successfully handles a valid directory', async () => {
    const inputDir = 'test/project10-jack-test-files/Square'
    const main = new Main(inputDir)
    await main.handleInput()

    const cwd = process.cwd()
    const expectedJackFiles = [
        `${cwd}/test/project10-jack-test-files/Square/Main.jack`,
        `${cwd}/test/project10-jack-test-files/Square/Square.jack`,
        `${cwd}/test/project10-jack-test-files/Square/SquareGame.jack`
    ]
    expect(main.jackFiles).toEqual(expectedJackFiles)
})

async function tokenizeDirectory(dir: string) {
    const main = new Main(dir)
    await main.handleInput()
    await main.createTokenFiles()
    
    for (const tokenFile of main.tokenFiles) {
        const tokenFileContents = await fs.readFile(tokenFile, 'utf8')
        const correctTokenFile = `test/project10-jack-test-files-fixture/${path.basename(dir)}/${path.basename(tokenFile)}`
        const correctTokenFileContents = await fs.readFile(correctTokenFile, 'utf8')
        
        expect(tokenFileContents).toBe(correctTokenFileContents)
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

async function compileDirectory(dir: string) {
    const main = new Main(dir)
    await main.handleInput()
    await main.startAnalysis()
    
    for (const xmlFile of main.xmlFiles) {
        const xmlFileContents = await fs.readFile(xmlFile, 'utf8')
        const correctXmlFile = `test/project10-jack-test-files-fixture/${path.basename(dir)}/${path.basename(xmlFile)}`
        const correctXmlFileContents = await fs.readFile(correctXmlFile, 'utf8')
        
        expect(xmlFileContents).toBe(correctXmlFileContents)
    }
}


test('compiles ExpressionLessSquare', async () => {
    const input = 'test/project10-jack-test-files/ExpressionLessSquare'
    await compileDirectory(input)
})

test('compiles Square', async () => {
    const input = 'test/project10-jack-test-files/Square'
    await compileDirectory(input)
})

test('compiles ArrayTest', async () => {
    const input = 'test/project10-jack-test-files/ArrayTest'
    await compileDirectory(input)
})