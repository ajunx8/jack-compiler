import { characterMap } from "./hack-charset.js";
import { type JackTokenizer, type Token } from "./JackTokenizer.js";
import { SymbolTable } from "./SymbolTable.js";
import { VmWriter } from "./VmWriter.js"

export class CompilationEngine {
    opArray = ["+", "-", "*", "/", "&", "|", "<", ">", "="] as const;
    ifDepth: number = 0;
    className: string = "";
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
            throw new SyntaxError(`expected token: ${JSON.stringify({ token: token, tokenType: tokenType })}, recieved: ${JSON.stringify(curToken)}`)
        }

        if (this.tokenizer.hasMoreTokens()) {
            this.tokenizer.advance()
        }
        return curToken
    }

    // class: "'class' className '{' classVarDec* subroutineDec* '}'",
    compileClass() {
        if (this.tokenizer.hasMoreTokens()) this.tokenizer.advance();
        this.processToken("keyword", "class");
        this.className = this.processToken("identifier", this.curToken().token).token
        this.processToken("symbol", "{")
        while (this.curToken().token === 'static' || this.curToken().token === 'field') {
            this.compileClassVarDec()
        }
        while (["constructor", "function", "method"].includes(this.curToken().token || "")) {
            const subroutineType = this.curToken().token
            this.symbolTable.subroutineST.reset()
            if (subroutineType === "method") {
                this.symbolTable.subroutineST.define("this", this.className, "ARG")
            }
            this.compileSubroutine()
        }
        this.processToken("symbol", "}")
        this.vmWriter.close()
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
        const subroutineType = this.processToken("keyword", this.curToken().token)
        const returnType = this.curToken().token
        switch (returnType) {
            case "void": this.processToken("keyword", 'void'); break
            default: this.processType()
        }
        const { token: subroutineName } = this.processToken("identifier", this.curToken().token)
        this.processToken("symbol", "(")
        this.compileParameterList()
        this.processToken("symbol", ")")
        this.compileSubroutineBody(subroutineType.token, subroutineName)
    }
    // parameterList: "((type varName) (',' type varName)*)?"
    compileParameterList() {
        const curToken = this.curToken()

        if (curToken.type === "identifier" || curToken.token === "int" || curToken.token === "char" || curToken.token === "boolean") {
            let paramType = this.processType()
            let paramVarName = this.processToken("identifier", this.curToken().token).token
            this.symbolTable.define("subroutine", paramVarName, paramType, "ARG")
            while (this.curToken().token === ',') {
                this.processToken("symbol", ",")
                paramType = this.processType()
                paramVarName = this.processToken("identifier", this.curToken().token).token
                this.symbolTable.define("subroutine", paramVarName, paramType, "ARG")
            }
        }
    }
    // subroutineBody: "'{' varDec* statements '}'"
    compileSubroutineBody(subroutineType: string, subroutineName: string) {
        this.processToken("symbol", "{")
        while (this.curToken().token === "var") {
            this.compileVarDec()
        }

        this.vmWriter.writeFunction(`${this.className}.${subroutineName}`, this.symbolTable.subroutineST.kindCount("VAR"))                     // function functionName nVars
        switch (subroutineType) {
            case 'constructor':
                this.vmWriter.writePush("CONSTANT", this.symbolTable.classST.kindCount("FIELD"))
                this.vmWriter.writeCall("Memory.alloc", 1)                                                              // call Memory.alloc 1
                this.vmWriter.writePop("POINTER", 0)                                                                    // pop pointer 0
                break
            case 'method':
                this.vmWriter.writePush("ARG", 0)
                this.vmWriter.writePop("POINTER", 0)
                break
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
        const varSt = this.symbolTable.find(varToken.token)
        const varKind = varSt.kindOf(varToken.token)
        const varIndex = varSt.indexOf(varToken.token)

        if (this.curToken().token === "[") {
            if (varKind !== "NONE") {
                this.vmWriter.writePush(varKind, varIndex)
            }
            this.processToken("symbol", "[")
            this.compileExpression()
            this.processToken("symbol", "]")
            this.processToken("symbol", "=")
            this.vmWriter.writeArithmetic("+")
            this.compileExpression()
            this.vmWriter.writePop("TEMP", 0)
            this.vmWriter.writePop("POINTER", 1)
            this.vmWriter.writePush("TEMP", 0)
            this.vmWriter.writePop("THAT", 0)
        } else {
            this.processToken("symbol", "=")
            this.compileExpression()
            if (varKind !== "NONE") {
                this.vmWriter.writePop(varKind, varIndex)
            }
        }
        this.processToken("symbol", ";")
    }
    // ifStatement: "'if' '(' expression ')' '{' statements '}' ('else' '{' statements '}')?",
    compileIf() {
        this.processToken("keyword", "if")
        this.processToken("symbol", "(")

        this.compileExpression()
        this.vmWriter.writeArithmetic("NOT")
        const falseLabel = this.ifDepth++;
        this.vmWriter.writeIf(`L${falseLabel}`)

        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")

        const endLabel = this.ifDepth++
        this.vmWriter.writeGoto(`L${endLabel}`)

        this.vmWriter.writeLabel(`L${falseLabel}`)
        if (this.curToken().token === "else") {
            this.processToken("keyword", "else")
            this.processToken("symbol", "{")
            this.compileStatements()
            this.processToken("symbol", "}")
        }

        this.vmWriter.writeLabel(`L${endLabel}`)
    }
    // whileStatement: "'while' '(' expression ')' '{' statements '}'",
    compileWhile() {
        const startLabel = this.ifDepth++;
        this.vmWriter.writeLabel(`L${startLabel}`)
        this.processToken("keyword", "while")
        this.processToken("symbol", "(")
        this.compileExpression()
        this.vmWriter.writeArithmetic("NOT")
        const endLabel = this.ifDepth++
        this.vmWriter.writeIf(`L${endLabel}`)
        this.processToken("symbol", ")")
        this.processToken("symbol", "{")
        this.compileStatements()
        this.processToken("symbol", "}")
        this.vmWriter.writeGoto(`L${startLabel}`)
        this.vmWriter.writeLabel(`L${endLabel}`)
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
        if (this.curToken().token === ";") {
            this.vmWriter.writePush("CONSTANT", 0)
        } else {
            this.compileExpression()
        }
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
                this.vmWriter.writePush("CONSTANT", term.token)
                break
            case "stringConstant":
                const stringToken = this.processToken("stringConstant", term.token).token;
                this.vmWriter.writePush("CONSTANT", stringToken.length)
                this.vmWriter.writeCall("String.new", 1)
                for (let i = 0; i < stringToken.length; i++) {
                    this.vmWriter.writePush("CONSTANT", characterMap.get(stringToken[i] || "A") || 0)
                    this.vmWriter.writeCall("String.appendChar", 2)
                }
                break
            case "keyword":
                switch (term.token) {
                    case "true": this.vmWriter.writePush("CONSTANT", 1); this.vmWriter.writeArithmetic("NEG"); break
                    case "false": this.vmWriter.writePush("CONSTANT", 0); break
                    case "null": this.vmWriter.writePush("CONSTANT", 0); break
                    case "this": this.vmWriter.writePush("POINTER", 0); break
                    default: throw new SyntaxError(`SyntaxError: expected keyword ['true' | 'false' | 'null' | 'this'], recieved keyword ${this.curToken()}`)
                }
                this.processToken("keyword", term.token)
                break
            case "identifier":
                const lookAheadToken = this.tokenizer.contents[this.tokenizer.cursor]
                const identifier = this.processToken("identifier", term.token)
                const st = this.symbolTable.find(identifier.token)
                const kind = st.kindOf(identifier.token)
                switch (lookAheadToken) {
                    case "[":
                        if (kind !== "NONE") {
                            this.vmWriter.writePush(kind, st.indexOf(identifier.token))
                        }
                        this.processToken("symbol", "[")
                        this.compileExpression()
                        this.processToken("symbol", "]")
                        this.vmWriter.writeArithmetic("+")
                        this.vmWriter.writePop("POINTER", 1)
                        this.vmWriter.writePush("THAT", 0)
                        break
                    case ".":
                        if (kind !== "NONE") {
                            const className = st.typeOf(identifier.token)
                            this.vmWriter.writePush(kind, st.indexOf(identifier.token))
                            this.processToken("symbol", ".")
                            const methodName = this.processToken("identifier", this.curToken().token).token
                            this.processToken("symbol", "(")
                            const numExp1 = this.compileExpressionList()
                            this.processToken("symbol", ")")
                            this.vmWriter.writeCall(`${className}.${methodName}`, numExp1 + 1)
                        } else { // if doesn't exist, assume its an OS **function**. trust the number of args are correct.
                            const className = identifier.token // assume identifier is the className
                            this.processToken("symbol", ".")
                            const methodName = this.processToken("identifier", this.curToken().token).token
                            this.processToken("symbol", "(")
                            const numExp1 = this.compileExpressionList()
                            this.processToken("symbol", ")")
                            this.vmWriter.writeCall(`${className}.${methodName}`, numExp1)
                        }
                        break
                    case "(":
                        this.vmWriter.writePush("POINTER", 0)
                        this.processToken("symbol", "(")
                        const numExp2 = this.compileExpressionList()
                        this.processToken("symbol", ")")
                        this.vmWriter.writeCall(`${this.className}.${identifier.token}`, numExp2 + 1)
                        break
                    default:
                        if (kind !== "NONE") {
                            this.vmWriter.writePush(kind, st.indexOf(identifier.token))
                        }
                        break
                }; break
            case "symbol":
                switch (term.token) {
                    case "-":
                        this.processToken("symbol", "-")
                        this.compileTerm()
                        this.vmWriter.writeArithmetic("NEG"); break
                    case "~":
                        this.processToken("symbol", "~")
                        this.compileTerm()
                        this.vmWriter.writeArithmetic("NOT"); break
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