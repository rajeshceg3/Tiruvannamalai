import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "test-results", "verification"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    }
  },
  {
      files: ["server/**/*.{ts,tsx}", "*.config.ts", "*.js"],
      languageOptions: {
          globals: globals.node
      }
  },
  {
      files: ["server/types.ts"],
      rules: {
          "@typescript-eslint/no-namespace": "off",
          "@typescript-eslint/no-empty-object-type": "off"
      }
  }
);
