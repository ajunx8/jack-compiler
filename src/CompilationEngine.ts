import { type JackTokenizer, type Token } from "./JackTokenizer.js";
import { SymbolTable } from "./SymbolTable.js";
import { VmWriter, type Segment } from "./VmWriter.js"

export class CompilationEngine {
    opArray = ["+", "-", "*", "/", "&", "|", "<", ">", "="] as const;
    ifDepth: number = 0;

    tokenizer: JackTokenizer;
    symbolTable: SymbolTable;
    vmWriter: VmWriter;

    constructor(tokenizer: JackTokenizer, symbolTable: SymbolTable, vmWriter: VmWriter,) {
        this.tokenizer = tokenizer
        this.symbolTable = symbolTable
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
            throw new SyntaxError(`expected token: ${{ token, tokenType }.toString()}, recieved: ${curToken.toString()}`)
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
            this.symbolTable.subroutineST.reset()
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
        this.symbolTable.define("class", name, type, kind)

        while (this.curToken().token === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.curToken().token).token
            this.symbolTable.define("class", name, type, kind)
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
        const keyword = this.processToken("keyword", this.curToken().token)
        const type = this.curToken().token
        switch (type) {
            case "void": this.processToken("keyword", 'void'); break
            default: this.processType()
        }
        const { token: subroutineName } = this.processToken("identifier", this.curToken().token)
        this.processToken("symbol", "(")
        this.compileParameterList()
        this.processToken("symbol", ")")
        if (keyword.token === 'constructor') {
            this.vmWriter.writeFunction(subroutineName, this.symbolTable.subroutineST.kindCount("VAR"))
            this.vmWriter.writePush("CONST", this.symbolTable.classST.kindCount("FIELD"))
            this.vmWriter.writeCall("Memory.alloc", 1)                                                                           // call Memory.alloc 1
            this.vmWriter.writePop("POINTER", 0)                                                                // pop pointer 0
        }
        this.compileSubroutineBody()
    }
    // parameterList: "((type varName) (',' type varName)*)?"
    compileParameterList() {
        const curToken = this.curToken()

        if (curToken.type === "identifier" || curToken.token === "int" || curToken.token === "char" || curToken.token === "boolean") {
            let type = this.processType()
            let name = this.processToken("identifier", this.curToken().token).token
            this.symbolTable.define("subroutine", name, type, "ARG")
            while (this.curToken().token === ',') {
                this.processToken("symbol", ",")
                type = this.processType()
                name = this.processToken("identifier", this.curToken().token).token
                this.symbolTable.define("subroutine", name, type, "ARG")
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
        this.symbolTable.define("subroutine", name, type, "VAR")
        while (this.curToken().token === ',') {
            this.processToken("symbol", ",")
            name = this.processToken("identifier", this.curToken().token).token
            this.symbolTable.define("subroutine", name, type, "VAR")
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

        // find the variable
        const st = this.symbolTable.find(varToken.token)
        const kind = st.kindOf(varToken.token)
        let segment: Segment
        switch (kind) {
            case "FIELD": segment = "THIS"; break
            case "STATIC": segment = "STATIC"; break
            case "ARG": segment = "ARG"; break
            case "VAR": segment = "LOCAL"; break
            default: throw new Error("kind undefined")
        }
        const index = st.indexOf(varToken.token)
        this.vmWriter.writePop(segment, index)
    }

    // ifStatement: "'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?",
    compileIf() {
        this.processToken("keyword", "if")
        this.processToken("symbol", "(")
        this.compileExpression()

        this.vmWriter.writeArithmetic("NOT")            // "not"            
        this.vmWriter.writeIf(`L${this.ifDepth}`)       // "if-goto L0"     

        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")

        this.vmWriter.writeGoto(`L${this.ifDepth + 1}`)   // "goto L1"        
        this.vmWriter.writeLabel(`L${this.ifDepth}`)    // "label L0"   

        if (this.curToken().token === "else") {
            this.processToken("keyword", "else")
            this.processToken("symbol", "{")
            this.compileStatements()
            this.processToken("symbol", "}")
        }

        this.vmWriter.writeLabel(`L${this.ifDepth + 1}`)  // "label L1"       
        this.ifDepth += 2
    }
    // whileStatement: "'while' '(' expression ')' '{' statements '}'",
    compileWhile() {
        this.vmWriter.writeLabel(`L${this.ifDepth}`)    // label L1

        this.processToken("keyword", "while")
        this.processToken("symbol", "(")
        this.compileExpression()

        this.vmWriter.writeArithmetic("NOT")            // not
        this.vmWriter.writeIf(`L${this.ifDepth + 1}`)     // if-goto L2

        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")

        this.vmWriter.writeGoto(`L${this.ifDepth}`)     // goto L1
        this.vmWriter.writeGoto(`L${this.ifDepth + 1}`)   // goto L2
        this.ifDepth += 2
    }
    // doStatement: "'do' subroutineCall ';'",
    compileDo() {
        this.processToken("keyword", "do")
        this.compileExpression()
        this.processToken("symbol", ";")
        this.vmWriter.writePop("TEMP", 0)
    }
    // returnStatement: "'return' expression? ';'"
    compileReturn() {
        this.processToken("keyword", "return")
        this.compileExpression()
        this.processToken("symbol", ";")
        this.vmWriter.writeReturn()
    }
    // expression: "term (op term)*"
    compileExpression() {
        this.compileTerm()

        let op: this["opArray"][number] | undefined;
        while (op = this.opArray.find(op => op === this.curToken().token)) {
            this.processToken("symbol", op)
            this.compileTerm()
            this.vmWriter.writeArithmetic(op)
        }
    }
    // term: "integerConstant | stringConstant | keywordConstant | varName | "varName'['expression']'" | '('expression')' | (unaryOP term) | subroutineCall"
    compileTerm() {
        let term: Token = this.curToken();
        switch (term.type) {
            case "integerConstant":
                this.processToken("integerConstant", term.token);
                this.vmWriter.writePush("CONST", term.token)
                break
            case "stringConstant":
                this.processToken("stringConstant", term.token); // #TODO
                this.vmWriter.writePush("TEMP", "404")
                break
            case "keyword":
                switch (term.token) {                                   // #TODO verify
                    case "true": this.vmWriter.writePush("CONST", -1); break
                    case "false": this.vmWriter.writePush("CONST", 0); break
                    case "null": this.vmWriter.writePush("CONST", 0); break
                    case "this": this.vmWriter.writePush("POINTER", 0); break
                    default: throw new SyntaxError(`SyntaxError: expected keyword ['true' | 'false' | 'null' | 'this'], recieved keyword ${this.curToken()}`)
                }
                this.processToken("keyword", term.token)
                break
            case "identifier":
                const lookAheadToken = this.tokenizer.contents[this.tokenizer.cursor]
                this.processToken("identifier", term.token)
                switch (lookAheadToken) {
                    case "[": // arrays
                        this.processToken("symbol", "[")
                        this.compileExpression()
                        this.processToken("symbol", "]"); break
                    case ".":
                        this.processToken("symbol", ".")
                        this.processToken("identifier", this.curToken().token)  // fall-through: if '.' add identifier before params
                    case "(":
                        this.processToken("symbol", "(")
                        let numExp = this.compileExpressionList()
                        this.processToken("symbol", ")"); break
                }; break
            case "symbol":
                switch (term.token) {
                    case "-":
                        this.processToken("symbol", "-")
                        this.vmWriter.writeArithmetic("NEG")
                        this.compileTerm(); break
                    case "~":
                        this.processToken("symbol", "~")
                        this.vmWriter.writeArithmetic("NOT")
                        this.compileTerm(); break
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
}