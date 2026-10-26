// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    { ignores: ['dist', 'coverage', 'eslint.config.mjs'] },
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: { ...globals.node, ...globals.vitest },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            // Nest modules are empty classes carrying a @Module() decorator.
            '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        },
    },
    {
        // Test matchers such as expect.any() and supertest response bodies are typed as any.
        files: ['**/*.spec.ts', 'test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },
);
