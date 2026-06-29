export type Token = {
    token: string;
    type: "keyword" | "symbol" | "identifier" | "integerConstant" | "stringConstant";
}

export class JackTokenizer {
    readonly contents: string = "";
    cursor: number = 0;
    curToken: Token | undefined;
    ignoredCharacters = ["\r", "\n", "\t", " ", "/*", "/**", "//"]

    constructor(contents: string) {
        this.contents = contents
    }

    skipIgnoredCharacters(): void {
        const ignoredChar = this.ignoredCharacters.find(char => this.contents.slice(this.cursor).startsWith(char))

        switch (ignoredChar) {
            case "\r":
            case "\n":
            case "\t":
            case " ": {
                while (this.ignoredCharacters.includes(this.contents[this.cursor] || "")) {
                    this.cursor++
                }
                this.skipIgnoredCharacters()
                break
            }
            case "/*":
            case "/**": {
                const endCommentIdx = this.contents.indexOf("*/", this.cursor)
                if (endCommentIdx >= this.cursor) {
                    this.cursor = endCommentIdx + 2
                } else {
                    throw new Error("syntaxError: end comment characters not found")
                }
                this.skipIgnoredCharacters()
                break
            }
            case "//": {
                const newLineIdx = this.contents.indexOf("\n", this.cursor)
                if (newLineIdx >= this.cursor) {
                    this.cursor = newLineIdx + 1
                } else if (!this.contents.endsWith("\n")) {
                    this.cursor = this.contents.length
                }
                this.skipIgnoredCharacters()
                break
            }
        }

        return
    }

    hasMoreTokens(): boolean {
        this.skipIgnoredCharacters()
        return this.cursor < this.contents.length
    }

    // gets next token from input, and makes it the current token.
    // should only be called if hasMoreTokens is true
    advance() {
        this.skipIgnoredCharacters()
        const curChar = this.contents[this.cursor]
        if (curChar === undefined) {
            throw new Error("curChar is undefined")
        }

        // keyword
        const keywordMatch = jackGrammar.lexicalElements.keyword.find(keyword => {
            return this.contents.startsWith(keyword, this.cursor)
        })
        if (keywordMatch !== undefined) {
            this.curToken = {
                token: keywordMatch, type: "keyword"
            }
            this.cursor += keywordMatch.length
            return
        }

        // symbol
        const symbolMatch = jackGrammar.lexicalElements.symbol.find(symbol => this.contents.startsWith(symbol, this.cursor))
        if (symbolMatch !== undefined) {
            this.curToken = {
                token: curChar, type: "symbol"
            }
            this.cursor += 1
            return
        }

        // integer constant from cursor position
        const integerMatchRegex = /^[0-9]+/
        const integerMatch = this.contents.slice(this.cursor).match(integerMatchRegex)
        if (integerMatch !== null) {
            this.curToken = {
                token: integerMatch[0], type: "integerConstant"
            }
            this.cursor += integerMatch[0].length
            return
        }

        // string constant
        if (curChar === "\"") {
            const endQuoteIndex = this.contents.indexOf("\"", this.cursor + 1)
            if (endQuoteIndex > this.cursor) {
                const stringConstant = this.contents.slice(this.cursor + 1, endQuoteIndex)
                this.curToken = {
                    token: stringConstant, type: "stringConstant"
                }
                this.cursor = endQuoteIndex + 1
            } else {
                throw new Error("end-quote not found")
            }
            return
        }

        // identifier
        if (/^[a-zA-Z_]/.test(curChar)) {
            let word: string = curChar
            let tempCursor = this.cursor + 1

            // if letter or underscore, keep going until we hit a space, symbol, double-quote or new-line then stop
            while (true) {
                const nextChar = this.contents[tempCursor]
                if (nextChar === undefined) break

                if (/[a-zA-Z0-9_]/.test(nextChar)) {
                    word += nextChar
                    tempCursor++
                } else {
                    break
                }
            }
            this.curToken = {
                token: word, type: "identifier"
            }
            this.cursor = tempCursor;
            return
        }
    }

    createTokenFileContents(): string {
        let tokenFileContents: string = "";

        tokenFileContents += "<tokens>"
        while (this.hasMoreTokens()) {
            this.advance()
            if (this.curToken !== undefined) {
                const tag = this.curToken.type
                let token = this.curToken.token
                switch (token) {
                    case "<": token = "&lt;"; break
                    case ">": token = "&gt;"; break
                    case "\"": token = "&quot;"; break
                    case "&": token = "&amp;"; break
                }
                tokenFileContents += `\r\n<${tag}> ${token} </${tag}>`
            } else {
                throw new Error("tokenType undefined")
            }
        }
        tokenFileContents += "\r\n</tokens>\r\n"

        return tokenFileContents
    }
}

const jackGrammar = {
    lexicalElements: {
        keyword: ['class', 'constructor', 'function', 'method', 'field', 'static', 'var', 'int', 'char', 'boolean', 'void', 'true', 'false', 'null', 'this', 'let', 'do', 'if', 'else', 'while', 'return'],
        symbol: ['{', '}', '(', ')', '[', ']', '.', ',', ';', '+', '-', '*', '/', '&', '|', '<', '>', '=', '~'],
        integerConstant: Array.from({ length: 32768 }).map((_, i) => i),
        stringConstant: "", // '"' A Sequence of characters not including double quote or newline '"'
        identifier: RegExp("/^[a-zA-Z_].*[a-zA-Z0-9_]/"), // Sequence of letters, digits, and underscore, not starting with a digit
    },
    programStructure: {
        class: "'class' className '{' classVarDec* subroutineDec* '}'",
        classVarDec: "('static' | 'field') type varName (',' varName)* ';'",
        type: "'int' | 'char' | 'boolean' | className",
        subroutineDec: "('constructor' | 'function' | 'method') ('void' | type) subroutineName '('parameterList')' subroutineBody",
        parameterList: "((type varName) (',' type varName)*)?",
        subroutineBody: "'{' varDec* statements '}'",
        varDec: "'var' type varName (',' varName)* ';'",
        className: "identifier",
        subroutineName: "identifier",
        varName: "identifier"
    },
    statements: {
        statements: "statement*",
        statement: "letStatement | ifStatement | whileStatement | doStatement | returnStatement",
        letStatement: "'let' varName ('[' expression ']')? '=' expression ';'",
        ifStatement: "'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?",
        whileStatement: "'while' '(' expression ')' '{' statements '}'",
        doStatement: "'do' subroutineCall ';'",
        returnStatement: "'return' expression? ';'"
    },
    expressions: {
        expression: "term (op term)*",
        term: "integerConstant | stringConstant | keywordConstant | varName | varName'['expression']' | '('expression')' | (unaryOP term) | subroutineCall",
        subroutineCall: "subroutineName '('expressionList')' | (className | varName)'.'subroutineName '('expressionList')'",
        expressionList: "(expression(',' expression)*)?",
        op: "'+' | '-' | '*' | '/' | '&' | '|' | '<' | '>' | '='",
        unaryOp: "'-' | '~'",
        keywordConstant: "'true' | 'false' | 'null' | 'this'"
    }
}
