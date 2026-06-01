import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createInfoEmbed } from '../services/embedService';

export const data = new SlashCommandBuilder()
  .setName('confirm')
  .setDescription('Request delivery confirmation from customer');

export async function execute(interaction: CommandInteraction) {
  try {
    const embed = createInfoEmbed(
      'Delivery Confirmation',
      'Please confirm that you have received your order.'
    );

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_received')
          .setLabel('Received')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('confirm_not_received')
          .setLabel('Not Received')
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Confirm command error:', error);
    await interaction.reply({
      content: 'Failed to send confirmation request.',
      ephemeral: true
    });
  }
}
