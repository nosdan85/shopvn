import { SlashCommandBuilder, CommandInteraction, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('close')
  .setDescription('Close the current ticket channel');

export async function execute(interaction: CommandInteraction) {
  try {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: 'This command can only be used in a server text channel.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: 'Closing ticket...' });

    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        console.error('Error deleting channel:', error);
      }
    }, 3000);
  } catch (error) {
    console.error('Close command error:', error);
    await interaction.reply({
      content: 'Failed to close ticket.',
      ephemeral: true
    });
  }
}
