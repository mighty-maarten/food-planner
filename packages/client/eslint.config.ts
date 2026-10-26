import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import skipFormatting from 'eslint-config-prettier/flat';

export default defineConfigWithVueTs(
    {
        name: 'app/files-to-lint',
        files: ['**/*.{vue,ts,mts,tsx}'],
    },

    globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'src/api/generated/**']),

    ...pluginVue.configs['flat/recommended'],
    vueTsConfigs.strictTypeChecked,
    vueTsConfigs.stylisticTypeChecked,

    {
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            // API services and helpers are classes with static methods (e.g. AuthApi.login)
            '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true }],
            // Formatting is handled by Prettier
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-indent': 'off',
            'vue/multiline-html-element-content-newline': 'off',
        },
    },

    {
        ...pluginVitest.configs.recommended,
        files: ['src/**/__tests__/*'],
        rules: {
            ...pluginVitest.configs.recommended.rules,
            // vi.mocked(SomeApi.method) passes static methods around on purpose
            '@typescript-eslint/unbound-method': 'off',
        },
    },

    skipFormatting,
);
