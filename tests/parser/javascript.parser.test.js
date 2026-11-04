
import { describe, it, expect } from "vitest";
import { parseJavaScript } from "../../src/parser/javascript.parser.js";

const getExportNames = (result) => {
    return result.exports.map((item) => item.name);
};

describe("JavaScript Parser", () => {
    it("should detect function declarations", () => {
        const sourceCode = `
            function getUser(id) {}
            function deleteUser(id) {}
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions).toHaveLength(2);
        expect(result.functions[0].name).toBe("getUser");
        expect(result.functions[1].name).toBe("deleteUser");
    });

    it("should detect arrow functions", () => {
        const sourceCode = `
            const getUser = (id) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions).toHaveLength(1);
        expect(result.functions[0].name).toBe("getUser");
        expect(result.functions[0].parameters).toEqual(["id"]);
    });

    it("should detect imports", () => {
        const sourceCode = `
            import User from "./user.model.js";
            import { getUser } from "./user.service.js";
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.imports).toHaveLength(2);
        expect(result.imports[0].source).toBe("./user.model.js");
        expect(result.imports[0].imported).toEqual(["default"]);
        expect(result.imports[1].imported).toEqual(["getUser"]);
    });

    it("should detect named exports", () => {
        const sourceCode = `
            export const getUser = () => {};
            export function deleteUser() {}
        `;

        const result = parseJavaScript(sourceCode);

        expect(getExportNames(result)).toEqual([
            "getUser",
            "deleteUser"
        ]);

        expect(result.exports[0]).toEqual({
            name: "getUser",
            localName: "getUser",
            type: "function"
        });

        expect(result.exports[1]).toEqual({
            name: "deleteUser",
            localName: "deleteUser",
            type: "function"
        });
    });

    it("should detect default exports", () => {
        const sourceCode = `
            const User = {};
            export default User;
        `;

        const result = parseJavaScript(sourceCode);

        expect(getExportNames(result)).toContain("default");
        expect(result.exports[0]).toEqual({
            name: "default",
            localName: "User",
            type: "variable"
        });
    });

    it("should detect destructured parameters", () => {
        const sourceCode = `
            const createUser = ({ name, email }) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions[0].parameters).toEqual([
            "name",
            "email"
        ]);
    });

    it("should detect rest parameters", () => {
        const sourceCode = `
            const getUsers = (...ids) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions[0].parameters).toEqual(["ids"]);
    });

    it("should detect function expressions", () => {
        const sourceCode = `
            const getUser = function(id) {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions).toHaveLength(1);
        expect(result.functions[0].name).toBe("getUser");
    });

    it("should detect re-exports", () => {
        const sourceCode = `
            export { getUser } from "./user.service.js";
        `;

        const result = parseJavaScript(sourceCode);

        expect(getExportNames(result)).toContain("getUser");

        expect(result.exports[0]).toEqual({
            name: "getUser",
            localName: null,
            type: "unknown",
            source: "./user.service.js",
            importedName: "getUser"
        });
    });

    it("should detect nested destructured parameters", () => {
        const sourceCode = `
            const createUser = ({ profile: { name, email } }) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions[0].parameters).toEqual([
            "name",
            "email"
        ]);
    });

    it("should detect default parameters", () => {
        const sourceCode = `
            const getUser = (id = 10, role = "user") => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions[0].parameters).toEqual([
            "id",
            "role"
        ]);
    });

    it("should detect array destructured parameters", () => {
        const sourceCode = `
            const processUser = ([first, second]) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions[0].parameters).toEqual([
            "first",
            "second"
        ]);
    });

    it("should detect exported arrow functions without duplication", () => {
        const sourceCode = `
            export const getUser = (id) => {};
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.functions).toHaveLength(1);
        expect(result.functions[0].name).toBe("getUser");

        expect(result.exports).toEqual([
            {
                name: "getUser",
                localName: "getUser",
                type: "function"
            }
        ]);
    });

    it("should detect CommonJS require", () => {
        const sourceCode = `
            const User = require("./user.model");
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].source).toBe("./user.model");
        expect(result.imports[0].imported).toEqual(["default"]);
    });

    it("should detect destructured CommonJS require", () => {
        const sourceCode = `
            const { getUser, deleteUser } = require("./user.service");
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.imports).toHaveLength(1);
        expect(result.imports[0].source).toBe("./user.service");
        expect(result.imports[0].imported).toEqual([
            "getUser",
            "deleteUser"
        ]);
    });

    it("should detect multiple CommonJS requires", () => {
        const sourceCode = `
            const User = require("./user.model");
            const Auth = require("./auth.service");
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.imports).toHaveLength(2);
        expect(result.imports[0].source).toBe("./user.model");
        expect(result.imports[1].source).toBe("./auth.service");
    });

    it("should detect module.exports", () => {
        const code = `
            const getUser = () => {};
            module.exports = getUser;
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "default",
                localName: "getUser",
                type: "function"
            }
        ]);
    });

    it("should detect exports properties", () => {
        const code = `
            exports.getUser = () => {};
            exports.deleteUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(getExportNames(result)).toEqual([
            "getUser",
            "deleteUser"
        ]);

        expect(result.exports[0].type).toBe("function");
        expect(result.exports[1].type).toBe("function");
    });

    it("should detect module.exports properties", () => {
        const code = `
            module.exports.getUser = () => {};
            module.exports.deleteUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(getExportNames(result)).toEqual([
            "getUser",
            "deleteUser"
        ]);
    });

    it("should detect multiple CommonJS export styles", () => {
        const code = `
            exports.getUser = () => {};
            module.exports.updateUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(getExportNames(result)).toEqual([
            "getUser",
            "updateUser"
        ]);
    });

    it("should not duplicate CommonJS exports", () => {
        const code = `
            exports.getUser = () => {};
            exports.getUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(getExportNames(result)).toEqual(["getUser"]);
    });

    it("should detect properties inside module.exports object", () => {
        const code = `
            const getUser = () => {};
            const deleteUser = () => {};

            module.exports = {
                getUser,
                deleteUser
            };
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "getUser",
                localName: "getUser",
                type: "function"
            },
            {
                name: "deleteUser",
                localName: "deleteUser",
                type: "function"
            }
        ]);
    });

    it("should detect aliased properties inside module.exports object", () => {
        const code = `
            const fetchUser = () => {};

            module.exports = {
                getUser: fetchUser
            };
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "getUser",
                localName: "fetchUser",
                type: "function"
            }
        ]);
    });

    it("should detect string keys inside module.exports object", () => {
        const code = `
            module.exports = {
                "get-user": () => {},
                "delete-user": () => {}
            };
        `;

        const result = parseJavaScript(code);

        expect(getExportNames(result)).toEqual([
            "get-user",
            "delete-user"
        ]);

        expect(result.exports[0].type).toBe("function");
        expect(result.exports[1].type).toBe("function");
    });

    it("should map ES module export aliases to local functions", () => {
        const code = `
            const getUser = () => {};

            export {
                getUser as fetchUser
            };
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "fetchUser",
                localName: "getUser",
                type: "function"
            }
        ]);
    });

    it("should map CommonJS export aliases to local functions", () => {
        const code = `
            const getUser = () => {};

            module.exports = {
                fetchUser: getUser
            };
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "fetchUser",
                localName: "getUser",
                type: "function"
            }
        ]);
    });

    it("should map default exports to local functions", () => {
        const code = `
            const getUser = () => {};

            export default getUser;
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual([
            {
                name: "default",
                localName: "getUser",
                type: "function"
            }
        ]);
    });
});
