import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import testingLibrary from "eslint-plugin-testing-library";
import react from "eslint-plugin-react";
import prettier from "eslint-plugin-prettier";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "**/*.d.ts",
        "packages/**/dist/**/*",
        "packages/**/public/**/*",
        "packages/**/coverage/**/*",
        "packages/**/fixtures/**/*",
        "**/node_modules",
        "public/**/*",
        "examples/**/static/**/*",
        "examples/**/dist/**/*",
        "examples/**/OidcTrustedDomains.js",
        "examples/**/OidcServiceWorker.js",
        "examples/**/nextjs-demo/**",
        "scripts/**/*",
        "**/.github",
        "**/.changeset",
        "**/vite.config.js",
        "**/webpack-runtime.js",
        "**/.prettierrc.cjs",
    ],
}, ...fixupConfigRules(compat.extends(
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
    "plugin:jsx-a11y/recommended",
    "prettier",
)), {
    plugins: {
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        "simple-import-sort": simpleImportSort,
        //"testing-library": testingLibrary,  //Not compatible with ESLint9 yet https://github.com/jsx-eslint/eslint-plugin-react/issues/3699
        react: fixupPluginRules(react),
        prettier,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",

        parserOptions: {
            project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.eslint.json"],

            ecmaFeatures: {
                jsx: true,
            },

            warnOnUnsupportedTypeScriptVersion: true,
        },
    },

    settings: {
        react: {
            version: "18",
        },

        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },

    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "no-unused-vars": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_|req|res|next|err|ctx|args|context|info|index|data",
            ignoreRestSiblings: true,
        }],

        "no-array-constructor": "off",
        "@typescript-eslint/no-array-constructor": "warn",
        "no-redeclare": "off",
        "@typescript-eslint/no-redeclare": "warn",
        "no-use-before-define": "off",

        "@typescript-eslint/no-use-before-define": ["warn", {
            functions: false,
            classes: false,
            variables: false,
            typedefs: false,
        }],

        "no-unused-expressions": "off",

        "@typescript-eslint/no-unused-expressions": ["error", {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
        }],

        "@typescript-eslint/triple-slash-reference": "off",

        "@typescript-eslint/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "semi",
                requireLast: true,
            },

            singleline: {
                delimiter: "semi",
                requireLast: false,
            },
        }],

        camelcase: "off",

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "always-multiline",
        }],

        "array-callback-return": "warn",
        "jsx-quotes": ["error", "prefer-double"],
        indent: "off",
        semi: ["error", "always"],
        "space-before-function-paren": "off",
        "import/no-named-as-default": "off",
        "import/no-named-as-default-member": "off",
        "import/default": "off",
        "import/named": "off",
        "import/namespace": "off",
        "import/no-unresolved": "off",
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        "react/prop-types": "off",
        "react/jsx-wrap-multilines": "error",
        "react/react-in-jsx-scope": "off",
        "react/display-name": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "off",
    },
}, {
    files: ["**/*.js", "**/*.jsx"],

    rules: {
        "@typescript-eslint/no-var-requires": "off",

        "react/no-unknown-property": [2, {
            ignore: ["jsx", "global"],
        }],
    },
}, 
//Not compatible with ESLint9 yet https://github.com/jsx-eslint/eslint-plugin-react/issues/3699
// ...compat.extends("plugin:testing-library/react").map(config => ({
//     ...config,
//     files: ["**/?(*.)+(spec|test).[jt]s?(x)"],
// })), {
//     files: ["**/?(*.)+(spec|test).[jt]s?(x)"],

//     rules: {
//         "testing-library/no-container": "off"
//         "testing-library/await-async-query": "error",
//         "testing-library/no-await-sync-query": "error",
//         testing-library/no-debugging-utils": "off",
//         "testing-library/no-dom-import": "off",
//         "testing-library/no-unnecessary-act": "off",
//     },
// }
];