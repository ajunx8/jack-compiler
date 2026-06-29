import { type JackTokenizer, type Token } from "./JackTokenizer.js";
import { SymbolTable, type SymbolRow } from "./SymbolTable.js";
import { VmWriter } from "./VmWriter.js"

export class CompilationEngine {
    tokenizer: JackTokenizer;
    classST: SymbolTable;
    subroutineST: SymbolTable;
    vmWriter: VmWriter;

    constructor(tokenizer: JackTokenizer, classST: SymbolTable, subRoutineST: SymbolTable, vmWriter: VmWriter,) {
        this.tokenizer = tokenizer
        this.classST = classST
        this.subroutineST = subRoutineST
        this.vmWriter = vmWriter
    }
    private curToken(): Token {
        if (!this.tokenizer.curToken) {
            throw new Error("token not defined")
        }
        return this.tokenizer.curToken
    }
    // validates the token and advances to the next token
    processToken(tokenType: string, token: string | undefined): Token {
        if (token === undefined) throw new SyntaxError("token undefined")

        const curToken = this.curToken()
        if (curToken.type !== tokenType || curToken.token !== token) {
            throw new SyntaxError(`expected token: ${{ token, tokenType }}, recieved: ${curToken}`)
        }

        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance()
        }
        return curToken
    }

    // class: "'class' className '{' classVarDec* subroutineDec* '}'",
    compileClass() {
        if (this.tokenizer.hasMoreTokens()) this.tokenizer.advance();
        this.processToken("keyword", "class")
        const { type } = this.processToken("identifier", this.curToken().token)
        this.processToken("symbol", "{")
        while (this.curToken().token === 'static' || this.curToken().token === 'field') {
            this.compileClassVarDec()
        }
        while (["constructor", "function", "method"].includes(this.curToken().token || "")) {
            console.log(`subroutineST before reset`)
            for (let [k, v] of this.subroutineST.table.entries()) {
                console.log(k, v)
            }
            this.subroutineST.reset()
            if (this.curToken().token === "method") {
                this.subroutineST.define("this", type, "ARG")
            }
            this.compileSubroutine()
        }
        this.processToken("symbol", "}")
        return
    }
    // classVarDec: "('static' | 'field') type varName (',' varName)* ';'"
    compileClassVarDec() {
        let name: string | undefined;
        const { token: kind } = this.processToken("keyword", this.curToken().token)
        const type = this.processType()
        name = this.processToken("identifier", this.curToken().token).token
        this.classST.define(name, type, kind)
        console.log("create Class ST")
        while (this.curToken().token === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.curToken().token).token
            this.classST.define(name, type, kind)
        }
        this.processToken("symbol", ";")
    }
    // type: "'int' | 'char' | 'boolean' | className"
    processType() {
        let type;
        switch (this.curToken().type) {
            case "identifier": type = this.processToken("identifier", this.curToken().token).token; break
            case "keyword":
                switch (this.curToken().token) {
                    case "int": type = this.processToken("keyword", "int").token; break
                    case "char": type = this.processToken("keyword", "char").token; break
                    case "boolean": type = this.processToken("keyword", "boolean").token; break
                }
                break
            default: throw new SyntaxError("missing type")
        }
        return type || ""
    }
    // subroutineDec: "('constructor' | 'function' | 'method') ('void' | type) subroutineName '('parameterList')' subroutineBody"
    compileSubroutine() {
        this.processToken("keyword", this.curToken().token)
        const tokenType = this.curToken().type
        switch (tokenType) {
            case "keyword": this.processToken("keyword", 'void'); break
            case "identifier": this.processType(); break
            default: throw new SyntaxError("missing void or type")
        }
        this.processToken("identifier", this.curToken().token)
        this.processToken("symbol", "(")
        this.compileParameterList()
        this.processToken("symbol", ")")
        this.compileSubroutineBody()

        // if (tokenType === key)
    }
    // parameterList: "((type varName) (',' type varName)*)?"
    compileParameterList() {
        const curToken = this.curToken()

        if (curToken.type === "identifier" || curToken.token === "int" || curToken.token === "char" || curToken.token === "boolean") {
            let type = this.processType()
            let name = this.processToken("identifier", this.curToken().token).token
            this.subroutineST.define(name, type, "ARG")
            while (this.curToken().token === ',') {
                this.processToken("symbol", ",")
                type = this.processType()
                name = this.processToken("identifier", this.curToken().token).token
                this.subroutineST.define(name, type, "ARG")
            }
        }
    }
    // subroutineBody: "'{' varDec* statements '}'"
    compileSubroutineBody() {
        this.processToken("symbol", "{")
        while (this.curToken().token === "var") {
            this.compileVarDec()
        }
        this.compileStatements()
        this.processToken("symbol", "}")
    }
    // varDec: "'var' type varName (',' varName)* ';'"
    compileVarDec() {
        this.processToken("keyword", "var")
        let type = this.processType()
        let name = this.processToken("identifier", this.curToken().token).token
        this.subroutineST.define(name, type, "VAR")
        while (this.curToken().token === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.curToken().token).token
            this.subroutineST.define(name, type, "VAR")
        }
        this.processToken("symbol", ";")
    }
    // statements: "statement*"
    // statement: "letStatement | ifStatement | whileStatement | doStatement | returnStatement"
    compileStatements() {
        while (["let", "if", "while", "do", "return"].includes(this.curToken().token || "")) {
            switch (this.curToken().token) {
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
        let varToken = this.processToken("identifier", this.curToken().token)
        if (this.curToken().token === "[") {
            this.processToken("symbol", "[")
            this.compileExpression()
            this.processToken("symbol", "]")
        }
        this.processToken("symbol", "=")
        this.compileExpression()
        this.processToken("symbol", ";")
        // this.subroutineST.table.
        // find the variable
        // if (this.subroutineST.table.has(varToken.token)) {
        //     const segment = this.subroutineST.kindOf(varToken.token)
        //     const index = this.subroutineST.indexOf(varToken.token)
        //     this.vmWriter.writePop(this.subroutineST., 2)
        // }
        // write the vm code
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
        if (this.curToken().token === "else") {
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
        this.compileExpression()
        // switch (this.curToken().type) {
        //     case "integerConstant":
        //     case "stringConstant": this.compileExpression(); break
        //     case "keyword":
        //         switch (this.curToken().token) {
        //             case "true":
        //             case "false":
        //             case "null":
        //             case "this": this.compileExpression(); break
        //         }; break
        //     case "identifier": this.compileExpression(); break
        //     case "symbol":
        //         switch (this.curToken().token) {
        //             case "-":
        //             case "~":
        //             case "(": this.compileExpression(); break
        //         }
        // }
        this.vmWriter.writeReturn()
        this.processToken("symbol", ";")
    }
    // subroutineCall: "subroutineName'('expressionList')'|(className | varName)'.'subroutineName'('expressionList')'"
    compileSubroutineCall() {
        this.processToken("identifier", this.curToken().token)
        if (this.curToken().token === ".") {
            this.processToken("symbol", ".")
            this.processToken("identifier", this.curToken().token)
        }
        this.processToken("symbol", "(")
        let numExp = this.compileExpressionList()
        this.processToken("symbol", ")")
    }
    // expression: "term (op term)*"
    compileExpression() {
        this.compileTerm()

        let op;
        while (op = ["+", "-", "*", "/", "&", "|", "<", ">", "="].find(op => op === this.curToken().token)) {
            this.processToken("symbol", op)
            this.compileTerm()
            console.log(op)
        }
    }
    // term: "integerConstant | stringConstant | keywordConstant | varName | "varName'['expression']'" | '('expression')' | (unaryOP term) | subroutineCall"
    compileTerm() {
        let term: Token | undefined = undefined;
        switch (this.curToken().type) {
            case "integerConstant":
            case "stringConstant":
                term = this.processToken(this.curToken().type!, this.curToken().token); 
                console.log(`push ${term?.token}`)
                break
            case "keyword":
                switch (this.curToken().token) {
                    case "true":
                    case "false":
                    case "null":
                    case "this":
                        term = this.processToken(this.curToken().type!, this.curToken().token);
                        console.log(`push ${term?.token}`)
                        break
                    default: throw new SyntaxError(`SyntaxError: expected keyword ['true' | 'false' | 'null' | 'this'], recieved keyword ${this.curToken()}`)
                }; break
            case "identifier":
                const lookAheadToken = this.tokenizer.contents[this.tokenizer.cursor]
                switch (lookAheadToken) {
                    default: term = this.processToken("identifier", this.curToken().token); break
                    case "[": // arrays
                        this.processToken("identifier", this.curToken().token)
                        this.processToken("symbol", "[")
                        this.compileExpression()
                        this.processToken("symbol", "]"); break
                    case "(": // subroutine Calls
                    case ".": this.compileSubroutineCall(); break
                }; break
            case "symbol":
                switch (this.curToken().token) {
                    case "-":
                    case "~":
                        term = this.processToken("symbol", this.curToken().token)
                        console.log(`push ${term?.token}`)
                        this.compileTerm()
                        break
                    case "(":
                        this.processToken("symbol", "(")
                        this.compileExpression()
                        this.processToken("symbol", ")"); break
                }; break
        }
    }
    // expressionList: "(expression(',' expression)*)?"
    compileExpressionList(): number {
        let expressionCount = 0
        switch (this.curToken().type) {
            case "integerConstant":
            case "stringConstant": this.compileExpression(); expressionCount++; break
            case "keyword":
                switch (this.curToken().token) {
                    case "true":
                    case "false":
                    case "null":
                    case "this": this.compileExpression(); expressionCount++; break
                }; break
            case "identifier": this.compileExpression(); expressionCount++; break
            case "symbol":
                switch (this.curToken().token) {
                    case "-":
                    case "~":
                    case "(": this.compileExpression(); expressionCount++; break
                }
        }
        while (this.curToken().token === ",") {
            this.processToken("symbol", ",")
            this.compileExpression()
            expressionCount++
        }
        return expressionCount
    }

    // find(symbol: string): SymbolRow {
    //     if (this.subroutineST.table
    // }
}