import createConfig from '@vue/eslint-config-typescript';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '**/*.min.js'] },
  ...createConfig({ extends: ['recommended'] }),
  {
    languageOptions: {
      globals: {
        ...globals.node
      },
      ecmaVersion: 2020
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^(Component|Vue|Prop|Watch|Emit|Inject|Model|Provide|Ref)$|^[A-Z]',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  {
    files: ['**/*.{j,t}s?(x)', '**/*.vue'],
    rules: {
      'comma-dangle': 'off'
    }
  }
];
