import { type JackTokenizer } from "./JackTokenizer.js";

export class CompilationEngine {
    tokenizer: JackTokenizer;
    outContent: string;
    indent: number = 0;

    constructor(tokenizer: JackTokenizer) {
        this.tokenizer = tokenizer
        this.outContent = ""
    }

    private currentToken() {
        return this.tokenizer.curToken;
    }

    processToken(tokenType: string, token: string | undefined) {
        if (token === undefined) {
            throw new SyntaxError("token undefined")
        }

        const curtokenType = this.tokenizer.tokenType
        const curToken = this.currentToken()

        if (curtokenType === tokenType) {
            if (curToken === token) {
                let xmlEntity;
                switch (curToken) {
                    case "<": xmlEntity = "&lt;"; break
                    case ">": xmlEntity = "&gt;"; break
                    case "\"": xmlEntity = "&quot;"; break
                    case "&": xmlEntity = "&amp;"; break
                    default: xmlEntity = curToken
                }
                this.outContent += `\r\n${"  ".repeat(this.indent)}<${curtokenType}> ${xmlEntity} </${curtokenType}>`
            } else {
                throw new SyntaxError(`expected token: ${token}, recieved: ${curToken}`)
            }
        } else {
            throw new SyntaxError(`expected TokenType: ${tokenType}, recieved: ${curtokenType}`)
        }

        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance()
        }
    }
    addNonTerminalStart(nonTerminal: string) {
        this.outContent += `\r\n${"  ".repeat(this.indent)}<${nonTerminal}>`
        this.indent++
    }
    addNonTerminalEnd(nonTerminal: string) {
        this.indent--
        this.outContent += `\r\n${"  ".repeat(this.indent)}</${nonTerminal}>`
    }
    compileClass() {
        if (this.tokenizer.hasMoreTokens()) this.tokenizer.advance();
        this.outContent += "<class>"
        this.indent++
        // class: "'class' className '{' classVarDec* subroutineDec* '}'",
        this.processToken("keyword", "class")
        this.processToken("identifier", this.currentToken())
        this.processToken("symbol", "{")
        while (this.currentToken() === 'static' || this.currentToken() === 'field') {
            this.compileClassVarDec()
        }
        while (["constructor", "function", "method"].includes(this.currentToken() || "")) {
            this.compileSubroutine()
        }
        this.processToken("symbol", "}")

        this.outContent += `\r\n</class>\r\n`
        return
    }
    compileClassVarDec() {
        this.addNonTerminalStart("classVarDec")
        // classVarDec: "('static' | 'field') type varName (',' varName)* ';'"
        this.processToken("keyword", this.currentToken())
        this.processType()
        this.processToken("identifier", this.currentToken())
        while (this.currentToken() === ',') {
            this.processToken("symbol", ",")
            this.processToken("identifier", this.currentToken())
        }
        this.processToken("symbol", ";")

        this.addNonTerminalEnd("classVarDec")
    }
    processType() {
        // type: "'int' | 'char' | 'boolean' | className"
        switch (this.tokenizer.tokenType) {
            case "identifier": this.processToken("identifier", this.currentToken()); break
            case "keyword":
                switch (this.currentToken()) {
                    case "int": this.processToken("keyword", "int"); break
                    case "char": this.processToken("keyword", "char"); break
                    case "boolean": this.processToken("keyword", "boolean"); break
                }
                break
            default: throw new SyntaxError("missing type")
        }
    }
    compileSubroutine() {
        this.addNonTerminalStart("subroutineDec")
        // subroutineDec: "('constructor' | 'function' | 'method') ('void' | type) subroutineName '('parameterList')' subroutineBody"
        this.processToken("keyword", this.currentToken())
        switch (this.tokenizer.tokenType) {
            case "keyword": this.processToken("keyword", 'void'); break
            case "identifier": this.processType(); break
            default: throw new SyntaxError("missing void or type")
        }
        this.processToken("identifier", this.currentToken())
        this.processToken("symbol", "(")
        this.compileParameterList()
        this.processToken("symbol", ")")
        this.compileSubroutineBody()

        this.addNonTerminalEnd("subroutineDec")
    }
    // parameterList: "((type varName) (',' type varName)*)?"
    compileParameterList() {
        const curToken = this.currentToken()
        this.addNonTerminalStart("parameterList")

        if (this.tokenizer.tokenType === "identifier" || curToken === "int" || curToken === "char" || curToken === "boolean") {
            this.processType()
            this.processToken("identifier", this.currentToken())
            while (this.currentToken() === ',') {
                this.processToken("symbol", ",")
                this.processType()
                this.processToken("identifier", this.currentToken())
            }
        }

        this.addNonTerminalEnd("parameterList")
    }
    // subroutineBody: "'{' varDec* statements '}'"
    compileSubroutineBody() {
        this.addNonTerminalStart("subroutineBody")

        this.processToken("symbol", "{")
        while (this.currentToken() === "var") {
            this.compileVarDec()
        }
        this.compileStatements()
        this.processToken("symbol", "}")

        this.addNonTerminalEnd("subroutineBody")
    }
    // varDec: "'var' type varName (',' varName)* ';'"
    compileVarDec() {
        this.addNonTerminalStart("varDec")

        this.processToken("keyword", "var")
        this.processType()
        this.processToken("identifier", this.currentToken())
        while (this.currentToken() === ',') {
            this.processToken("symbol", ",")
            this.processToken("identifier", this.currentToken())
        }
        this.processToken("symbol", ";")

        this.addNonTerminalEnd("varDec")
    }
    // statements: "statement*"
    // statement: "letStatement | ifStatement | whileStatement | doStatement | returnStatement"
    compileStatements() {
        this.addNonTerminalStart("statements")

        while (["let", "if", "while", "do", "return"].includes(this.currentToken() || "")) {
            switch (this.currentToken()) {
                case "let": this.compileLet(); break
                case "if": this.compileIf(); break
                case "while": this.compileWhile(); break
                case "do": this.compileDo(); break
                case "return": this.compileReturn(); break
            }
        }

        this.addNonTerminalEnd("statements")
    }
    compileLet() {
        this.addNonTerminalStart("letStatement")
        // letStatement: "'let' varName ('[' expression ']')? '=' expression ';'",
        this.processToken("keyword", "let")
        this.processToken("identifier", this.currentToken())
        if (this.currentToken() === "[") {
            this.processToken("symbol", "[")
            this.compileExpression()
            this.processToken("symbol", "]")
        }
        this.processToken("symbol", "=")
        this.compileExpression()
        this.processToken("symbol", ";")

        this.addNonTerminalEnd("letStatement")
    }
    // ifStatement: "'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?",
    compileIf() {
        this.addNonTerminalStart("ifStatement")

        this.processToken("keyword", "if")
        this.processToken("symbol", "(")
        this.compileExpression()
        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")
        if (this.currentToken() === "else") {
            this.processToken("keyword", "else")
            this.processToken("symbol", "{")
            this.compileStatements()
            this.processToken("symbol", "}")
        }

        this.addNonTerminalEnd("ifStatement")
    }
    // whileStatement: "'while' '(' expression ')' '{' statements '}'",
    compileWhile() {
        this.addNonTerminalStart("whileStatement")

        this.processToken("keyword", "while")
        this.processToken("symbol", "(")
        this.compileExpression()
        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")

        this.addNonTerminalEnd("whileStatement")
    }
    // doStatement: "'do' subroutineCall ';'",
    compileDo() {
        this.addNonTerminalStart("doStatement")

        this.processToken("keyword", "do")
        this.compileSubroutineCall()
        this.processToken("symbol", ";")

        this.addNonTerminalEnd("doStatement")
    }
    // returnStatement: "'return' expression? ';'"
    compileReturn() {
        this.addNonTerminalStart("returnStatement")

        this.processToken("keyword", "return")
        switch (this.tokenizer.tokenType) {
            case "integerConstant":
            case "stringConstant": this.compileExpression(); break
            case "keyword":
                switch (this.currentToken()) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": this.compileExpression(); break
                }; break
            case "identifier": this.compileExpression(); break
            case "symbol":
                switch (this.currentToken()) {
                    case "-":
                    case "~":
                    case "(": this.compileExpression(); break
                }
        }
        this.processToken("symbol", ";")

        this.addNonTerminalEnd("returnStatement")
    }
    // subroutineCall: "subroutineName'('expressionList')'|(className | varName)'.'subroutineName'('expressionList')'"
    compileSubroutineCall() {
        this.processToken("identifier", this.currentToken())
        if (this.currentToken() === ".") {
            this.processToken("symbol", ".")
            this.processToken("identifier", this.currentToken())
        }
        this.processToken("symbol", "(")
        this.compileExpressionList()
        this.processToken("symbol", ")")
    }
    // expression: "term (op term)*"
    compileExpression() {
        this.addNonTerminalStart("expression")

        this.compileTerm()
        let op = ["+", "-", "*", "/", "&", "|", "<", ">", "="].find(op => op === this.currentToken())
        while (op) {
            this.processToken("symbol", op)
            this.compileTerm()
            op = ["+", "-", "*", "/", "&", "|", "<", ">", "="].find(op => op === this.currentToken())
        }

        this.addNonTerminalEnd("expression")
    }
    // term: "integerConstant | stringConstant | keywordConstant | varName | "varName'['expression']'" | '('expression')' | (unaryOP term) | subroutineCall"
    compileTerm() {
        this.addNonTerminalStart("term")

        switch (this.tokenizer.tokenType) {
            case "integerConstant":
            case "stringConstant": this.processToken(this.tokenizer.tokenType, this.currentToken()); break
            case "keyword":
                switch (this.currentToken()) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": this.processToken(this.tokenizer.tokenType, this.currentToken()); break
                    default: throw new SyntaxError(`SyntaxError: expected keyword ['true' | 'false' | 'null' | 'this'], recieved keyword ${this.currentToken()}`)
                }; break
            case "identifier":
                const lookAheadToken = this.tokenizer.contents[this.tokenizer.cursor]
                switch (lookAheadToken) {
                    case "[":
                        this.processToken("identifier", this.currentToken())
                        this.processToken("symbol", "[")
                        this.compileExpression()
                        this.processToken("symbol", "]"); break
                    case "(":
                    case ".":
                        this.compileSubroutineCall(); break
                    default: this.processToken("identifier", this.currentToken())
                }; break
            case "symbol":
                switch (this.currentToken()) {
                    case "-":
                    case "~":
                        this.processToken("symbol", this.currentToken())
                        this.compileTerm(); break
                    case "(":
                        this.processToken("symbol", "(")
                        this.compileExpression()
                        this.processToken("symbol", ")"); break
                }; break
        }

        this.addNonTerminalEnd("term")
    }
    // expressionList: "(expression(',' expression)*)?"
    compileExpressionList() {
        this.addNonTerminalStart("expressionList")

        switch (this.tokenizer.tokenType) {
            case "integerConstant":
            case "stringConstant": this.compileExpression(); break
            case "keyword":
                switch (this.currentToken()) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": this.compileExpression(); break
                }; break
            case "identifier": this.compileExpression(); break
            case "symbol":
                switch (this.currentToken()) {
                    case "-":
                    case "~":
                    case "(": this.compileExpression(); break
                }
        }
        while (this.currentToken() === ",") {
            this.processToken("symbol", ",")
            this.compileExpression()
        }

        this.addNonTerminalEnd("expressionList")
    }
}