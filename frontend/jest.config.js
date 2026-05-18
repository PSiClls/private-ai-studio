/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFiles: [],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lucide-react": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js",
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.tsx",
    "^remark-gfm$": "<rootDir>/__mocks__/remark-gfm.ts",
    "^react-syntax-highlighter(/.*)?$": "<rootDir>/__mocks__/react-syntax-highlighter.tsx",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(lucide-react)/)",
  ],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
}

module.exports = config
