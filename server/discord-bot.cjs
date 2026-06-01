const { Client, GatewayIntentBits, ActivityType, AttachmentBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log('Discord bot is online.');
  client.user?.setActivity(process.env.DISCORD_ACTIVITY || 'Nos Roblox Shop', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const vouchChannelId = process.env.VOUCH_CHANNEL_ID || '';
  const ownerRoleId = process.env.OWNER_ROLE_ID || '';
  const isTicketChannel = message.channel?.type === 0 && String(message.channel?.name || '').startsWith('ticket-');

  if (isTicketChannel && vouchChannelId && message.attachments.size > 0) {
    const isStaff = Boolean(
      message.member?.permissions?.has('Administrator') ||
      (ownerRoleId && message.member?.roles?.cache?.has(ownerRoleId))
    );
    if (isStaff) {
      const vouchChannel = message.guild?.channels.cache.get(vouchChannelId);
      if (vouchChannel?.isTextBased()) {
        for (const [, attachment] of message.attachments) {
          await vouchChannel.send({
            content: `New delivery proof from <@${message.author.id}> in <#${message.channel.id}>:`,
            files: [new AttachmentBuilder(attachment.url)],
          }).catch((error) => console.error('Failed to forward vouch:', error.message));
        }
      }
    }
  }

  if (!message.content.startsWith('!')) return;
  const [command] = message.content.slice(1).trim().split(/ +/);

  if (command === 'close') {
    await message.reply('Closing ticket in 3 seconds...').catch(() => undefined);
    setTimeout(() => message.channel.delete().catch((error) => console.error('Error deleting channel:', error.message)), 3000);
  }

  if (command === 'done') {
    await message.reply('Order completed. Closing channel...').catch(() => undefined);
    setTimeout(() => message.channel.delete().catch((error) => console.error('Error deleting channel:', error.message)), 2000);
  }

  if (command === 'confirm') {
    await message.reply('Delivery confirmation requested.').catch(() => undefined);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'confirm_received') {
    await interaction.reply({ content: 'Delivery confirmed.' });
    return;
  }
  if (interaction.customId === 'confirm_not_received') {
    await interaction.reply({ content: 'Delivery reported as not received. Support will follow up.', ephemeral: true });
  }
});

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN or DISCORD_BOT_TOKEN.');
  process.exit(1);
}
client.login(token);
