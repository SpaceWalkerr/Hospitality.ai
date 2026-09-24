import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  // The palette validator is vendored — not our source.
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "scripts/validate_palette.js",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Playwright fixtures receive a callback named `use`, which the React
  // hooks rule mistakes for React's use() hook.
  { files: ["e2e/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
];

export default config;
