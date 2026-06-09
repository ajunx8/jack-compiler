import { type JackTokenizer } from "./JackTokenizer.js";
import { SymbolTable } from "./SymbolTable.js";
import { VmWriter } from "./VmWriter.js"

export type ProcessedToken = {
    curToken: JackTokenizer['curToken']
    curTokenType: JackTokenizer['tokenType']
}

export class CompilationEngine {
    tokenizer: JackTokenizer;
    classST: SymbolTable;
    subroutineST: SymbolTable;
    vmWriter: VmWriter;
    outContent: string = ""

    constructor(tokenizer: JackTokenizer, classST: SymbolTable, subRoutineST: SymbolTable, vmWriter: VmWriter,) {
        this.tokenizer = tokenizer
        this.classST = classST
        this.subroutineST = subRoutineST
        this.vmWriter = vmWriter
    }
    private currentToken() {
        return this.tokenizer.curToken;
    }
    // validates the token and advances to the next token
    processToken(tokenType: string, token: string | undefined): ProcessedToken {
        if (token === undefined) throw new SyntaxError("token undefined")

        const curTokenType = this.tokenizer.tokenType
        const curToken = this.currentToken()
        if (curTokenType !== tokenType) throw new SyntaxError(`expected TokenType: ${tokenType}, recieved: ${curTokenType}`)
        if (curToken !== token) throw new SyntaxError(`expected token: ${token}, recieved: ${curToken}`)

        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance()
        }

        return { curToken, curTokenType }
    }

    // class: "'class' className '{' classVarDec* subroutineDec* '}'",
    compileClass() {
        if (this.tokenizer.hasMoreTokens()) this.tokenizer.advance();
        this.processToken("keyword", "class")
        const { curToken: type } = this.processToken("identifier", this.currentToken())
        this.processToken("symbol", "{")
        while (this.currentToken() === 'static' || this.currentToken() === 'field') {
            this.compileClassVarDec()
        }
        while (["constructor", "function", "method"].includes(this.currentToken() || "")) {
            console.log(`subroutineST before reset`)
            for (let [k, v] of this.subroutineST.table.entries()) {
                console.log(k, v)
            }
            this.subroutineST.reset()
            if (this.currentToken() === "method") {
                this.subroutineST.define("this", type, "ARG")
            }
            this.compileSubroutine()
        }
        this.processToken("symbol", "}")
        return
    }
    // classVarDec: "('static' | 'field') type varName (',' varName)* ';'"
    compileClassVarDec() {
        let name: string;
        const { curToken: kind } = this.processToken("keyword", this.currentToken())
        const type = this.processType()
        name = this.processToken("identifier", this.currentToken()).curToken
        this.classST.define(name, type, kind)
        console.log("create Class ST")
        while (this.currentToken() === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.currentToken()).curToken
            this.classST.define(name, type, kind)
        }
        this.processToken("symbol", ";")
    }
    // type: "'int' | 'char' | 'boolean' | className"
    processType() {
        let type;
        switch (this.tokenizer.tokenType) {
            case "identifier": type = this.processToken("identifier", this.currentToken()).curToken; break
            case "keyword":
                switch (this.currentToken()) {
                    case "int": type = this.processToken("keyword", "int").curToken; break
                    case "char": type = this.processToken("keyword", "char").curToken; break
                    case "boolean": type = this.processToken("keyword", "boolean").curToken; break
                }
                break
            default: throw new SyntaxError("missing type")
        }
        return type || ""
    }
    // subroutineDec: "('constructor' | 'function' | 'method') ('void' | type) subroutineName '('parameterList')' subroutineBody"
    compileSubroutine() {
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
    }
    // parameterList: "((type varName) (',' type varName)*)?"
    compileParameterList() {
        const curToken = this.currentToken()

        if (this.tokenizer.tokenType === "identifier" || curToken === "int" || curToken === "char" || curToken === "boolean") {
            let type = this.processType()
            let name = this.processToken("identifier", this.currentToken()).curToken
            this.subroutineST.define(name, type, "ARG")
            while (this.currentToken() === ',') {
                this.processToken("symbol", ",")
                type = this.processType()
                name = this.processToken("identifier", this.currentToken()).curToken
                this.subroutineST.define(name, type, "ARG")
            }
        }
    }
    // subroutineBody: "'{' varDec* statements '}'"
    compileSubroutineBody() {
        this.processToken("symbol", "{")
        while (this.currentToken() === "var") {
            this.compileVarDec()
        }
        this.compileStatements()
        this.processToken("symbol", "}")
    }
    // varDec: "'var' type varName (',' varName)* ';'"
    compileVarDec() {
        this.processToken("keyword", "var")
        let type = this.processType()
        let name = this.processToken("identifier", this.currentToken()).curToken
        this.subroutineST.define(name, type, "VAR")
        while (this.currentToken() === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.currentToken()).curToken
            this.subroutineST.define(name, type, "VAR")
        }
        this.processToken("symbol", ";")
    }
    // statements: "statement*"
    // statement: "letStatement | ifStatement | whileStatement | doStatement | returnStatement"
    compileStatements() {
        while (["let", "if", "while", "do", "return"].includes(this.currentToken() || "")) {
            switch (this.currentToken()) {
                case "let": this.compileLet(); break
                case "if": this.compileIf(); break
                case "while": this.compileWhile(); break
                case "do": this.compileDo(); break
                case "return": this.compileReturn(); break
            }
        }
    }
    // letStatement: "'let' varName ('[' expression ']')? '=' expression ';'",
    compileLet() {
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
    }
    // ifStatement: "'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?",
    compileIf() {
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
    }
    // whileStatement: "'while' '(' expression ')' '{' statements '}'",
    compileWhile() {
        this.processToken("keyword", "while")
        this.processToken("symbol", "(")
        this.compileExpression()
        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")
    }
    // doStatement: "'do' subroutineCall ';'",
    compileDo() {
        this.processToken("keyword", "do")
        this.compileSubroutineCall()
        this.processToken("symbol", ";")
    }
    // returnStatement: "'return' expression? ';'"
    compileReturn() {
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
        let exp: ProcessedToken[] = [];
        let term0 = this.compileTerm()
        exp.push(term0)

        let op;
        while (op = ["+", "-", "*", "/", "&", "|", "<", ">", "="].find(op => op === this.currentToken())) {
            let opN = this.processToken("symbol", op)
            exp.push(opN)

            let termN = this.compileTerm()
            exp.push(termN)
        }

        function codeWrite(exp: string[]) {
            if (exp === "integerConstant") {
                this.vmWriter.writePush("CONST", Number(exp))
            }
        }
    }
    // term: "integerConstant | stringConstant | keywordConstant | varName | "varName'['expression']'" | '('expression')' | (unaryOP term) | subroutineCall"
    compileTerm() {
        let term: any;
        switch (this.tokenizer.tokenType) {
            case "integerConstant":
            case "stringConstant": term = this.processToken(this.tokenizer.tokenType, this.currentToken()); break
            case "keyword":
                switch (this.currentToken()) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": term = this.processToken(this.tokenizer.tokenType, this.currentToken()).curToken; break
                    default: throw new SyntaxError(`SyntaxError: expected keyword ['true' | 'false' | 'null' | 'this'], recieved keyword ${this.currentToken()}`)
                }; break
            case "identifier":
                const lookAheadToken = this.tokenizer.contents[this.tokenizer.cursor]
                switch (lookAheadToken) {
                    default: term = this.processToken("identifier", this.currentToken()); break
                    case "[": // arrays
                        this.processToken("identifier", this.currentToken())
                        this.processToken("symbol", "[")
                        this.compileExpression()
                        this.processToken("symbol", "]"); break
                    case "(": // subroutine Calls
                    case ".": this.compileSubroutineCall(); break
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
        return term
    }
    // expressionList: "(expression(',' expression)*)?"
    compileExpressionList(): number {
        let expressionCount = 0
        switch (this.tokenizer.tokenType) {
            case "integerConstant":
            case "stringConstant": this.compileExpression(); expressionCount++; break
            case "keyword":
                switch (this.currentToken()) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": this.compileExpression(); expressionCount++; break
                }; break
            case "identifier": this.compileExpression(); expressionCount++; break
            case "symbol":
                switch (this.currentToken()) {
                    case "-":
                    case "~":
                    case "(": this.compileExpression(); expressionCount++; break
                }
        }
        while (this.currentToken() === ",") {
            this.processToken("symbol", ",")
            this.compileExpression()
            expressionCount++
        }
        return expressionCount
    }
}