import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  // scripts/ holds the vendored palette validator — not our source.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
