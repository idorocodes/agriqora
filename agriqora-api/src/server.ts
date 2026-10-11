import "dotenv/config";
import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`AgriQora Full-Stack Server running on port ${config.port}`);
});
