import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prevent re-introducing legacy flows imports
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/flows',
              message: 'Use components/workflows instead (legacy flows removed).',
            },
          ],
          patterns: [
            {
              group: ['@/components/flows/*', './src/components/flows/*', '../components/flows/*'],
              message: 'Use components/workflows instead (legacy flows removed).',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
