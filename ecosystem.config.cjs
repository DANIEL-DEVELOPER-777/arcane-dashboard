module.exports = {
  apps: [{
    name: "Arcane",
    script: "./dist/index.cjs", // Points to your compiled build
    env: {
      NODE_ENV: "production",
      // This is your Neon DB URL
      DATABASE_URL: "postgresql://neondb_owner:npg_FG7PYDR1cATg@ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
      PORT: 3000
    }
  }]
}