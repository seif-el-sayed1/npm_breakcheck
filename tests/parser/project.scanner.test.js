
import { describe, it, expect, afterEach } from "vitest";
import { scanProject } from "../../src/scanner/project.scanner.js";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("Project Scanner", () => {
    let projectPath;

    afterEach(async () => {
        if (projectPath) {
            await rm(projectPath, {
                recursive: true,
                force: true
            });
        }
    });

    it("should detect JavaScript files", async () => {
        projectPath = await mkdtemp(
            path.join(os.tmpdir(), "breakcheck-")
        );

        await mkdir(path.join(projectPath, "src"));

        await writeFile(
            path.join(projectPath, "src", "index.js"),
            "console.log('Hello');"
        );

        await writeFile(
            path.join(projectPath, "src", "app.jsx"),
            "const App = () => <div>Hello</div>;"
        );

        const files = await scanProject(projectPath);

        expect(files).toHaveLength(2);

        expect(
            files.map((file) => path.basename(file.filePath))
        ).toEqual(expect.arrayContaining(["index.js", "app.jsx"]));
    });

    it("should read file contents", async () => {
        projectPath = await mkdtemp(
            path.join(os.tmpdir(), "breakcheck-")
        );

        const content = "export const getUser = () => {};";

        await writeFile(
            path.join(projectPath, "user.js"),
            content
        );

        const files = await scanProject(projectPath);

        expect(files[0].content).toBe(content);
    });

    it("should ignore node_modules and build folders", async () => {
        projectPath = await mkdtemp(
            path.join(os.tmpdir(), "breakcheck-")
        );

        await mkdir(path.join(projectPath, "node_modules"), {
            recursive: true
        });

        await mkdir(path.join(projectPath, "dist"), {
            recursive: true
        });

        await writeFile(
            path.join(projectPath, "index.js"),
            "console.log('app');"
        );

        await writeFile(
            path.join(projectPath, "node_modules", "package.js"),
            "console.log('package');"
        );

        await writeFile(
            path.join(projectPath, "dist", "bundle.js"),
            "console.log('bundle');"
        );

        const files = await scanProject(projectPath);

        expect(files).toHaveLength(1);
        expect(path.basename(files[0].filePath)).toBe("index.js");
    });
});
