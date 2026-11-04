
import { scanProject } from "../scanner/project.scanner.js";
import { parseJavaScript } from "../parser/javascript.parser.js";
import { analyzeDependencies } from "./dependency.analyzer.js";

export const analyzeProject = async (projectPath) => {
    const files = await scanProject(projectPath);

    const parsedFiles = files.map((file) => {
        return {
            filePath: file.filePath,
            ...parseJavaScript(file.content)
        };
    });

    const result = analyzeDependencies(parsedFiles);

    return {
        projectPath,
        totalFiles: files.length,
        dependencies: result.dependencies
    };
};
