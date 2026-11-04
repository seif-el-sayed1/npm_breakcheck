
import { describe, it, expect } from "vitest";
import { analyzeDependencies } from "../../src/analyzer/dependency.analyzer.js";

describe("Dependency Analyzer", () => {
    it("should detect a direct dependency", () => {
        const parsedFiles = [
            {
                filePath: "src/controllers/user.controller.js",
                imports: [
                    {
                        source: "../services/user.service.js",
                        imported: ["default"],
                        line: 1
                    }
                ],
                exports: [],
                functions: []
            },
            {
                filePath: "src/services/user.service.js",
                imports: [],
                exports: ["getUser"],
                functions: []
            }
        ];

        const result = analyzeDependencies(parsedFiles);

        expect(result.dependencies).toHaveLength(2);

        expect(result.dependencies[0].dependsOn).toEqual([
            "src/services/user.service.js"
        ]);
    });

    it("should detect multiple dependencies", () => {
        const parsedFiles = [
            {
                filePath: "src/controllers/user.controller.js",
                imports: [
                    {
                        source: "../services/user.service.js",
                        imported: ["default"],
                        line: 1
                    },
                    {
                        source: "../utils/response.js",
                        imported: ["sendResponse"],
                        line: 2
                    }
                ],
                exports: [],
                functions: []
            },
            {
                filePath: "src/services/user.service.js",
                imports: [],
                exports: [],
                functions: []
            },
            {
                filePath: "src/utils/response.js",
                imports: [],
                exports: [],
                functions: []
            }
        ];

        const result = analyzeDependencies(parsedFiles);

        expect(result.dependencies[0].dependsOn).toEqual([
            "src/services/user.service.js",
            "src/utils/response.js"
        ]);
    });

    it("should ignore external packages", () => {
        const parsedFiles = [
            {
                filePath: "src/index.js",
                imports: [
                    {
                        source: "express",
                        imported: ["default"],
                        line: 1
                    }
                ],
                exports: [],
                functions: []
            }
        ];

        const result = analyzeDependencies(parsedFiles);

        expect(result.dependencies[0].dependsOn).toEqual([]);
    });

    it("should ignore unresolved relative imports", () => {
        const parsedFiles = [
            {
                filePath: "src/index.js",
                imports: [
                    {
                        source: "./missing.js",
                        imported: ["default"],
                        line: 1
                    }
                ],
                exports: [],
                functions: []
            }
        ];

        const result = analyzeDependencies(parsedFiles);

        expect(result.dependencies[0].dependsOn).toEqual([]);
    });

    it("should not duplicate dependencies", () => {
        const parsedFiles = [
            {
                filePath: "src/index.js",
                imports: [
                    {
                        source: "./user.js",
                        imported: ["default"],
                        line: 1
                    },
                    {
                        source: "./user.js",
                        imported: ["getUser"],
                        line: 2
                    }
                ],
                exports: [],
                functions: []
            },
            {
                filePath: "src/user.js",
                imports: [],
                exports: [],
                functions: []
            }
        ];

        const result = analyzeDependencies(parsedFiles);

        expect(result.dependencies[0].dependsOn).toEqual([
            "src/user.js"
        ]);
    });
});
