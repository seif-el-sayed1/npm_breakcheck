
import path from "node:path";
import { analyzeProject } from "./analyzer/project.analyzer.js";

const projectPath = process.argv[2] || ".";

const result = await analyzeProject(
    path.resolve(projectPath)
);

console.dir(result, { depth: null });
