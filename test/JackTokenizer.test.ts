import { expect, it } from "vitest";
import { JackTokenizer } from "../src/JackTokenizer.js";

// start of the simplest happy path. Each subsequent test should be a little harder
it('tokenizes "class"', () => {
    const contents = "class"
    const tokenizer = new JackTokenizer(contents)

    expect(tokenizer.hasMoreTokens()).toBe(true)
    tokenizer.advance()
    expect(tokenizer.curToken).toStrictEqual({
        "token": "class",
        "type": "keyword",
    })
    expect(tokenizer.hasMoreTokens()).toBe(false)
})

it('tokenizes "class Main"', () => {
    const contents = "class Main"
    const tokenizer = new JackTokenizer(contents)

    let i = 0;
    while (i < 2) {
        expect(tokenizer.hasMoreTokens()).toBe(true)
        tokenizer.advance()
        i++
    }

    expect(tokenizer.curToken).toStrictEqual({
        "token": "Main",
        "type": "identifier",
    })
    expect(tokenizer.hasMoreTokens()).toBe(false)
})

it('handle single space', () => {
    const tokenizer = new JackTokenizer(" ")
    expect(tokenizer.hasMoreTokens()).toBe(false)
})

it('handle content with comments', () => {
    const contents = `class Main() { // comment to end of line
}
/* This is a
multi-line
comment */
/** Comments for API
docs */`
    const tokenizer = new JackTokenizer(contents)

    let i = 0
    while (i < 6) {
        tokenizer.advance()
        i++
    }
    expect(tokenizer.curToken).toStrictEqual({
        "token": "}",
        "type": "symbol",
    })
    expect(tokenizer.hasMoreTokens()).toBe(false)
})