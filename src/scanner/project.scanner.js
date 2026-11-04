
import path from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";

export const scanProject = async (projectPath) => {
    const absoluteProjectPath = path.resolve(projectPath);

    const files = await fg("**/*.{js,jsx,mjs,cjs}", {
        cwd: absoluteProjectPath,
        ignore: [
            "**/node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/coverage/**"
        ],
        onlyFiles: true,
        absolute: true
    });

    const projectFiles = await Promise.all(
        files.map(async (filePath) => {
            const content = await readFile(filePath, "utf-8");

            return {
                filePath,
                content
            };
        })
    );

    return projectFiles;
};
