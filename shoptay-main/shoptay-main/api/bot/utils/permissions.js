const { getOwnerRoleId, getGuildId } = require('../config');
const { isSnowflake } = require('./validation');

const checkUserHasOwnerRole = async (discordId, guild) => {
  if (!isSnowflake(discordId)) return false;
  if (!guild) return false;

  const ownerRoleId = getOwnerRoleId();
  if (!isSnowflake(ownerRoleId)) return false;

  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return false;
    const roleIds = Array.isArray(member.roles?.cache) ? member.roles.cache.map((r) => String(r.id)) : [];
    return roleIds.includes(ownerRoleId);
  } catch {
    return false;
  }
};

const checkUserInGuild = async (discordId, guild) => {
  if (!isSnowflake(discordId)) return false;
  if (!guild) return false;

  try {
    await guild.members.fetch(discordId);
    return true;
  } catch {
    return false;
  }
};

const isStaffUser = async (discordId, guild) => {
  if (!isSnowflake(discordId)) return false;
  if (!guild) return false;

  const ownerId = getOwnerRoleId();
  if (ownerId && ownerId === discordId) return true;

  return checkUserHasOwnerRole(discordId, guild);
};

module.exports = { checkUserHasOwnerRole, checkUserInGuild, isStaffUser };
