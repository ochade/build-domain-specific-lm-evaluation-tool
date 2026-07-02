import nextConfig from "eslint-config-next"

const config = [
  ...nextConfig,
  {
    ignores: ["drizzle/**", ".next/**", "node_modules/**"],
  },
]

export default config
