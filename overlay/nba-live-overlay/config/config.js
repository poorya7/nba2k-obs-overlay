// API Configuration
// NOTE: Do NOT commit real keys. Set them via environment variables.
// This file reads from env vars so secrets never live in the repo.
module.exports = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || ''
};
