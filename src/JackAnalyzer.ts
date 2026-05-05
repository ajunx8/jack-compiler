import { Main } from "./Main.js";

// interface layer
export default async function run() {
    const userArg = process.argv[2];

    if (userArg == undefined) {
        console.error("Error: Please provide a .jack file or a directory.");
        console.log("Usage: node JackAnalyzer.js <file.vm | directory>");
        process.exitCode = 1;
        return;
    }

    try {
        const main = new Main(userArg)
        await main.handleInput()
        await main.startAnalysis()
        console.log("Successfully created xml file")
    } catch (err) {
        process.exitCode = 1;
        if (err instanceof Error) {
            console.log(new Error(err.message))
        } else {
            console.error(err)
        }
    }
}

await run();