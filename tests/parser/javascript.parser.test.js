
import { describe, it, expect } from "vitest";
import { parseJavaScript } from "../../src/parser/javascript.parser.js";

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

        expect(result.exports).toContain("getUser");
        expect(result.exports).toContain("deleteUser");
    });

    it("should detect default exports", () => {
        const sourceCode = `
            const User = {};
            export default User;
        `;

        const result = parseJavaScript(sourceCode);

        expect(result.exports).toContain("default");
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

        expect(result.exports).toContain("getUser");
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
        expect(result.exports).toEqual(["getUser"]);
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

        expect(result.exports).toContain("default");
    });

    it("should detect exports properties", () => {
        const code = `
            exports.getUser = () => {};
            exports.deleteUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toContain("getUser");
        expect(result.exports).toContain("deleteUser");
    });

    it("should detect module.exports properties", () => {
        const code = `
            module.exports.getUser = () => {};
            module.exports.deleteUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toContain("getUser");
        expect(result.exports).toContain("deleteUser");
    });

    it("should detect multiple CommonJS export styles", () => {
        const code = `
            exports.getUser = () => {};
            module.exports.updateUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toContain("getUser");
        expect(result.exports).toContain("updateUser");
    });

    it("should not duplicate CommonJS exports", () => {
        const code = `
            exports.getUser = () => {};
            exports.getUser = () => {};
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toEqual(["getUser"]);
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
            "getUser",
            "deleteUser"
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

        expect(result.exports).toContain("getUser");
        expect(result.exports).not.toContain("fetchUser");
    });

    it("should detect string keys inside module.exports object", () => {
        const code = `
            module.exports = {
                "get-user": () => {},
                "delete-user": () => {}
            };
        `;

        const result = parseJavaScript(code);

        expect(result.exports).toContain("get-user");
        expect(result.exports).toContain("delete-user");
    });


});
