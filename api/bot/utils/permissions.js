const { getOwnerRoleId } = require('../config');
const { isSnowflake } = require('./validation');

// Admin Discord IDs
const ADMIN_DISCORD_IDS = new Set([
  '1146730730060271736',
  '1005326332001009784'
]);

const checkUserHasOwnerRole = async (discordId, guild) => {
  if (ADMIN_DISCORD_IDS.has(discordId)) return true;
  if (!isSnowflake(discordId) || !guild) return false;

  const ownerRoleId = getOwnerRoleId();
  if (!isSnowflake(ownerRoleId)) return false;

  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return false;
    const roleIds = member.roles?.cache ? [...member.roles.cache.keys()] : [];
    return roleIds.includes(ownerRoleId);
  } catch {
    return false;
  }
};

const checkUserInGuild = async (discordId, guild) => {
  if (!isSnowflake(discordId) || !guild) return false;
  try {
    await guild.members.fetch(discordId);
    return true;
  } catch {
    return false;
  }
};

const isStaffUser = async (discordId) => {
  if (ADMIN_DISCORD_IDS.has(discordId)) return true;
  return false;
};

module.exports = { checkUserHasOwnerRole, checkUserInGuild, isStaffUser, ADMIN_DISCORD_IDS };
