
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

const extractParameterNames = (param) => {
    if (!param) {
        return [];
    }

    switch (param.type) {
        case "Identifier":
            return [param.name];

        case "RestElement":
            return extractParameterNames(param.argument);

        case "AssignmentPattern":
            return extractParameterNames(param.left);

        case "ObjectPattern":
            return param.properties.flatMap((property) => {
                if (property.type === "RestElement") {
                    return extractParameterNames(property.argument);
                }

                return extractParameterNames(property.value);
            });

        case "ArrayPattern":
            return param.elements.flatMap((element) => {
                return extractParameterNames(element);
            });

        default:
            return [];
    }
};

const extractRequiredNames = (declarator) => {
    if (declarator?.type !== "VariableDeclarator") {
        return ["default"];
    }

    if (declarator.id.type === "ObjectPattern") {
        return declarator.id.properties.flatMap((property) => {
            if (property.type === "RestElement") {
                return [];
            }

            if (property.key.type === "Identifier") {
                return [property.key.name];
            }

            if (property.key.type === "StringLiteral") {
                return [property.key.value];
            }

            return [];
        });
    }

    return ["default"];
};

const getMemberName = (node) => {
    if (node.computed && node.property.type === "StringLiteral") {
        return node.property.value;
    }

    if (!node.computed && node.property.type === "Identifier") {
        return node.property.name;
    }

    return null;
};

const isModuleExports = (node) => {
    return (
        node?.type === "MemberExpression" &&
        node.object.type === "Identifier" &&
        node.object.name === "module" &&
        getMemberName(node) === "exports"
    );
};

const isExportsObject = (node) => {
    return node?.type === "Identifier" && node.name === "exports";
};


const extractObjectExportNames = (objectExpression) => {
    if (objectExpression?.type !== "ObjectExpression") {
        return [];
    }

    return objectExpression.properties.flatMap((property) => {
        if (property.type === "SpreadElement") {
            return [];
        }

        if (property.computed) {
            if (property.key.type === "StringLiteral") {
                return [property.key.value];
            }

            return [];
        }

        if (property.key.type === "Identifier") {
            return [property.key.name];
        }

        if (property.key.type === "StringLiteral") {
            return [property.key.value];
        }

        return [];
    });
};


const getCommonJSExportName = (node) => {
    if (isModuleExports(node)) {
        return "default";
    }

    if (isExportsObject(node)) {
        return "default";
    }

    if (
        node?.type === "MemberExpression" &&
        (
            isModuleExports(node.object) ||
            isExportsObject(node.object)
        )
    ) {
        return getMemberName(node);
    }

    return null;
};


export const parseJavaScript = (sourceCode) => {
    const ast = parse(sourceCode, {
        sourceType: "unambiguous",
        plugins: ["jsx"]
    });

    const result = {
        functions: [],
        imports: [],
        exports: []
    };

    traverse(ast, {
        FunctionDeclaration(path) {
            const node = path.node;

            result.functions.push({
                name: node.id?.name ?? null,
                parameters: node.params.flatMap(extractParameterNames),
                line: node.loc.start.line
            });
        },

        VariableDeclarator(path) {
            const node = path.node;

            if (
                node.init?.type !== "ArrowFunctionExpression" &&
                node.init?.type !== "FunctionExpression"
            ) {
                return;
            }

            result.functions.push({
                name: node.id?.name ?? null,
                parameters: node.init.params.flatMap(extractParameterNames),
                line: node.loc.start.line
            });
        },

        ImportDeclaration(path) {
            const node = path.node;

            result.imports.push({
                source: node.source.value,
                imported: node.specifiers.map((specifier) => {
                    if (specifier.type === "ImportDefaultSpecifier") {
                        return "default";
                    }

                    if (specifier.type === "ImportNamespaceSpecifier") {
                        return "*";
                    }

                    return specifier.imported.name;
                }),
                line: node.loc.start.line
            });
        },

        CallExpression(path) {
            const node = path.node;

            if (
                node.callee.type !== "Identifier" ||
                node.callee.name !== "require" ||
                node.arguments.length !== 1 ||
                node.arguments[0].type !== "StringLiteral"
            ) {
                return;
            }

            const declarator = path.findParent((parentPath) => {
                return parentPath.isVariableDeclarator();
            });

            result.imports.push({
                source: node.arguments[0].value,
                imported: extractRequiredNames(declarator?.node),
                line: node.loc.start.line
            });
        },

        ExportNamedDeclaration(path) {
            const node = path.node;

            if (node.declaration) {
                if (node.declaration.type === "VariableDeclaration") {
                    node.declaration.declarations.forEach((declaration) => {
                        if (declaration.id.type === "Identifier") {
                            result.exports.push(declaration.id.name);
                        }
                    });
                } else if (node.declaration.id) {
                    result.exports.push(node.declaration.id.name);
                }
            }

            node.specifiers.forEach((specifier) => {
                result.exports.push(specifier.exported.name);
            });
        },

        ExportDefaultDeclaration() {
            result.exports.push("default");
        },

        
        
        AssignmentExpression(path) {
            const node = path.node;

            if (node.operator !== "=") {
                return;
            }

            if (isModuleExports(node.left)) {
                if (node.right.type === "ObjectExpression") {
                    result.exports.push(
                        ...extractObjectExportNames(node.right)
                    );

                    return;
                }

                result.exports.push("default");
                return;
            }

            const exportName = getCommonJSExportName(node.left);

            if (exportName) {
                result.exports.push(exportName);
            }
        }



    });

    result.exports = [...new Set(result.exports)];

    return result;
};
