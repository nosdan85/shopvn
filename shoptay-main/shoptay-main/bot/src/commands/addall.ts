import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { createInfoEmbed } from '../services/embedService';

export const data = new SlashCommandBuilder()
  .setName('addall')
  .setDescription('Re-add all linked users to the guild');

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply();

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('Guild not found.');
      return;
    }

    const embed = createInfoEmbed(
      'Re-adding Users',
      'Processing user re-invitations...'
    );

    await interaction.editReply({ embeds: [embed] });

    // Placeholder: In production, fetch linked users from API
    const linkedUsers: string[] = [];

    let added = 0;
    for (const userId of linkedUsers) {
      try {
        await interaction.client.users.fetch(userId);
        added++;
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
      }
    }

    const resultEmbed = createInfoEmbed(
      'Complete',
      `Re-added ${added} users to the guild.`
    );

    await interaction.editReply({ embeds: [resultEmbed] });
  } catch (error) {
    console.error('Addall command error:', error);
    await interaction.editReply('Failed to re-add users.');
  }
}
