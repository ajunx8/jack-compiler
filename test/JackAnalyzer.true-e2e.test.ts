// create test to verify cli usage is correct. i.e node JackAnalyzer.js <file|folder>

import { expect, test } from 'vitest'
import { execSync } from 'node:child_process'
import * as fs from "node:fs"
import { readdirSync } from 'node:fs'
import path from 'node:path'

function compareFolders(dirA: string, dirB: string) {
    const dirAContents = readdirSync(dirA)
    const dirBContents = readdirSync(dirB)

    expect(dirAContents).toStrictEqual(dirBContents)

    const dirAContentsPaths = readdirSync(dirA).map(e => path.resolve(dirA, e))
    const dirBContentsPaths = readdirSync(dirB).map(e => path.resolve(dirB, e))

    for (let i = 0; i < dirAContentsPaths.length; i++) {
        const entryA = dirAContentsPaths[i]
        const entryB = dirBContentsPaths[i]

        if (entryA === undefined || entryB === undefined) throw new Error()

        const stats = fs.statSync(entryA)
        if (stats.isDirectory()) {
            compareFolders(entryA, entryB)
        }

        const fileAContents = fs.readFileSync(entryA, 'utf8')
        const fileBContents = fs.readFileSync(entryB, 'utf8')

        expect(fileAContents).toStrictEqual(fileBContents)
        // console.log(`${entryA}\n${entryB}\n!matches!\n${'~'.repeat(80)}`)
    }
}

test('runs the file dist/JackAnalyzer.js with ArrayTest', () => {
    const stdout = execSync('node dist/JackAnalyzer.js test/project10-jack-test-files/ArrayTest')
    compareFolders("test/project10-jack-test-files/ArrayTest", "test/project10-jack-test-files-fixture/ArrayTest")
})

test('runs the file dist/JackAnalyzer.js with ExpressionLessSquare', () => {
    const stdout = execSync('node dist/JackAnalyzer.js test/project10-jack-test-files/ExpressionLessSquare')
    compareFolders("test/project10-jack-test-files/ExpressionLessSquare", "test/project10-jack-test-files-fixture/ExpressionLessSquare")
})

test('runs the file dist/JackAnalyzer.js with Square', () => {
    const stdout = execSync('node dist/JackAnalyzer.js test/project10-jack-test-files/Square')
    compareFolders("test/project10-jack-test-files/Square", "test/project10-jack-test-files-fixture/Square")
})