import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import dotenv from "dotenv";
import { handleInteraction } from "./handlers/interactionHandler";
import { handleMessage } from "./handlers/messageHandler";
import http from "http";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log("✅ Bot is online!");
  client.user?.setActivity("NosMarket", { type: ActivityType.Watching });
});

client.on("interactionCreate", async (interaction) => {
  await handleInteraction(interaction);
});

client.on("messageCreate", async (message) => {
  await handleMessage(message);
});

client.login(process.env.DISCORD_TOKEN);

// HTTP server cho Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
});

server.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});