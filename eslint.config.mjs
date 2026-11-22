import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const supabaseClientFactories = {
  paths: [
    {
      name: "@supabase/ssr",
      importNames: ["createServerClient", "createBrowserClient"],
      message:
        "Create Supabase clients only via @/lib/supabase/{server,client,proxy}.",
      allowTypeImports: true,
    },
    {
      name: "@supabase/supabase-js",
      importNames: ["createClient"],
      message:
        "Create Supabase clients only via @/lib/supabase/{server,client,proxy}.",
      allowTypeImports: true,
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        supabaseClientFactories,
      ],
    },
  },

  {
    files: ["lib/supabase/**"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    files: ["app/api/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            ...supabaseClientFactories.paths,
            {
              name: "@/lib/supabase/client",
              message:
                "API routes must use the cookie-bound server client (@/lib/supabase/server).",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },

  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/.temp/**",
    "lib/supabase/database.types.ts",
  ]),
]);
