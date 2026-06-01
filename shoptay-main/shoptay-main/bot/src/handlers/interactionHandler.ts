import { Interaction } from 'discord.js';

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;
    try {
      const command = require(`../commands/${commandName}`);
      if (command && typeof command.execute === 'function') {
        await command.execute(interaction);
      }
    } catch (error) {
      console.error(`Error executing slash command ${commandName}:`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
      }
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    try {
      // Payment details copy button helpers
      if (customId.startsWith('copy_')) {
        const type = customId.replace('copy_', '');
        let copyText = '';
        if (type === 'paypal') copyText = process.env.PAYPAL_EMAIL || 'paypal@example.com';
        else if (type === 'ltc') copyText = process.env.LTC_ADDRESS || 'ltc_address_here';
        else if (type === 'cashapp') copyText = process.env.CASHAPP_TAG || '$cashapptag';
        else if (type === 'paypal_note') copyText = `Order Payment`;

        await interaction.reply({
          content: `📋 Copyable text: \`${copyText}\``,
          ephemeral: true
        });
        return;
      }

      // Confirmation buttons
      if (customId === 'confirm_received') {
        await interaction.reply({
          content: '✅ Thank you! Delivery confirmed.',
        });
        return;
      }

      if (customId === 'confirm_not_received') {
        await interaction.reply({
          content: '❌ Delivery reported as not received. Support will be with you shortly.',
        });
        return;
      }
    } catch (error) {
      console.error('Interaction error:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Could not process interaction.', ephemeral: true });
      }
    }
  }
}
