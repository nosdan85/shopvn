import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { createSuccessEmbed } from '../services/embedService';

export const data = new SlashCommandBuilder()
  .setName('done')
  .setDescription('Mark order as completed and close ticket');

export async function execute(interaction: CommandInteraction) {
  try {
    const user = interaction.user;
    const channel = interaction.channel;

    const embed = createSuccessEmbed('Order completed! Thank you for your purchase.');

    try {
      await user.send({ embeds: [embed] });
    } catch (error) {
      console.error('Could not send DM:', error);
    }

    await interaction.reply({ content: 'Order marked as completed. Closing ticket...' });

    setTimeout(async () => {
      try {
        if (channel && !channel.isDMBased()) {
          await channel.delete();
        }
      } catch (error) {
        console.error('Error deleting channel:', error);
      }
    }, 2000);
  } catch (error) {
    console.error('Done command error:', error);
    await interaction.reply({
      content: 'Failed to complete order.',
      ephemeral: true
    });
  }
}
