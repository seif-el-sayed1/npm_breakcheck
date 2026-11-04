
import path from "node:path";

const resolveImport = (importSource, importerPath, filesMap) => {
    if (!importSource.startsWith(".")) {
        return null;
    }

    const basePath = path.resolve(
        path.dirname(importerPath),
        importSource
    );

    const candidates = [
        basePath,
        `${basePath}.js`,
        `${basePath}.jsx`,
        `${basePath}.mjs`,
        `${basePath}.cjs`,
        path.join(basePath, "index.js"),
        path.join(basePath, "index.jsx")
    ];

    for (const candidate of candidates) {
        const normalizedPath = path.resolve(candidate);

        if (filesMap.has(normalizedPath)) {
            return filesMap.get(normalizedPath).filePath;
        }
    }

    return null;
};

export const analyzeDependencies = (parsedFiles) => {
    const filesMap = new Map();

    parsedFiles.forEach((file) => {
        filesMap.set(path.resolve(file.filePath), file);
    });

    const dependencies = parsedFiles.map((file) => {
        const dependsOn = file.imports
            .map((importItem) => {
                return resolveImport(
                    importItem.source,
                    file.filePath,
                    filesMap
                );
            })
            .filter(Boolean);

        return {
            file: file.filePath,
            dependsOn: [...new Set(dependsOn)]
        };
    });

    return {
        dependencies
    };
};
