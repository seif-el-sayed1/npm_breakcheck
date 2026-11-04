
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

const getExportType = (node, scope) => {
    if (!node) {
        return "unknown";
    }

    if (node.type === "Identifier") {
        const binding = scope?.getBinding(node.name);

        if (!binding) {
            return "unknown";
        }

        const bindingNode = binding.path.node;

        if (
            bindingNode.type === "FunctionDeclaration" ||
            bindingNode.type === "ObjectMethod"
        ) {
            return "function";
        }

        if (bindingNode.type === "ClassDeclaration") {
            return "class";
        }

        if (bindingNode.type === "VariableDeclarator") {
            return getExportType(bindingNode.init, binding.path.scope);
        }

        return "unknown";
    }

    if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression"
    ) {
        return "function";
    }

    if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
        return "class";
    }

    if (node.type === "VariableDeclarator") {
        return getExportType(node.init, scope);
    }

    return "variable";
};

const getLocalName = (node) => {
    if (node?.type === "Identifier") {
        return node.name;
    }

    if (
        node?.type === "FunctionExpression" ||
        node?.type === "FunctionDeclaration" ||
        node?.type === "ClassExpression" ||
        node?.type === "ClassDeclaration"
    ) {
        return node.id?.name ?? null;
    }

    return null;
};

const createExport = (name, value, scope) => {
    return {
        name,
        localName: getLocalName(value),
        type: getExportType(value, scope)
    };
};

const getObjectPropertyName = (property) => {
    if (property.computed) {
        if (property.key.type === "StringLiteral") {
            return property.key.value;
        }

        return null;
    }

    if (property.key.type === "Identifier") {
        return property.key.name;
    }

    if (property.key.type === "StringLiteral") {
        return property.key.value;
    }

    return null;
};

const extractObjectExports = (objectExpression, scope) => {
    if (objectExpression?.type !== "ObjectExpression") {
        return [];
    }

    return objectExpression.properties.flatMap((property) => {
        if (property.type === "SpreadElement") {
            return [];
        }

        const name = getObjectPropertyName(property);

        if (!name) {
            return [];
        }

        if (property.type === "ObjectMethod") {
            return [{
                name,
                localName: null,
                type: "function"
            }];
        }

        return [
            createExport(name, property.value, scope)
        ];
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
                            result.exports.push(
                                createExport(
                                    declaration.id.name,
                                    {
                                        type: "Identifier",
                                        name: declaration.id.name
                                    },
                                    path.scope
                                )
                            );
                        }
                    });
                } else if (node.declaration.id) {
                    result.exports.push(
                        createExport(
                            node.declaration.id.name,
                            node.declaration,
                            path.scope
                        )
                    );
                }
            }

            node.specifiers.forEach((specifier) => {
                const name = specifier.exported.name ?? specifier.exported.value;
                const localName = specifier.local.name ?? specifier.local.value;

                if (node.source) {
                    result.exports.push({
                        name,
                        localName: null,
                        type: "unknown",
                        source: node.source.value,
                        importedName: localName
                    });

                    return;
                }

                const binding = path.scope.getBinding(localName);

                result.exports.push({
                    name,
                    localName,
                    type: binding
                        ? getExportType(
                            { type: "Identifier", name: localName },
                            path.scope
                        )
                        : "unknown"
                });
            });
        },

        ExportDefaultDeclaration(path) {
            const declaration = path.node.declaration;

            result.exports.push(
                createExport("default", declaration, path.scope)
            );
        },

        AssignmentExpression(path) {
            const node = path.node;

            if (node.operator !== "=") {
                return;
            }

            if (isModuleExports(node.left)) {
                if (node.right.type === "ObjectExpression") {
                    result.exports.push(
                        ...extractObjectExports(node.right, path.scope)
                    );

                    return;
                }

                result.exports.push(
                    createExport("default", node.right, path.scope)
                );

                return;
            }

            const exportName = getCommonJSExportName(node.left);

            if (exportName) {
                result.exports.push(
                    createExport(exportName, node.right, path.scope)
                );
            }
        }
    });

    const uniqueExports = new Map();

    result.exports.forEach((item) => {
        const key = JSON.stringify(item);

        uniqueExports.set(key, item);
    });

    result.exports = [...uniqueExports.values()];

    return result;
};
