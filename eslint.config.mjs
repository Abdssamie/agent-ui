import nextPlugin from "@next/eslint-plugin-next";
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextConfig from "eslint-config-next";

const eslintConfig = [
    ...nextVitals,
  ...nextConfig,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Disable strict TypeScript rules that cause build failures
        ...nextPlugin.configs.recommended.rules,
    },
  },
];

export default eslintConfig;
