const { getOwnerRoleId, getGuildId } = require('../config');
const { isSnowflake } = require('./validation');

const checkUserHasOwnerRole = async (discordId, guild) => {
  if (!isSnowflake(discordId)) return false;
  if (!guild) return false;

  const ownerRoleId = getOwnerRoleId();

  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return false;

    // Check owner role
    if (isSnowflake(ownerRoleId)) {
      const roleIds = member.roles?.cache ? [...member.roles.cache.keys()] : [];
      if (roleIds.includes(ownerRoleId)) return true;
    }

    return false;
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

  // Check if this is the guild owner
  if (guild.ownerId === discordId) return true;

  // Check owner role from env
  const ownerRoleId = getOwnerRoleId();
  if (ownerRoleId && ownerRoleId === discordId) return true;

  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return false;

    // Check owner role
    if (isSnowflake(ownerRoleId)) {
      const roleIds = member.roles?.cache ? [...member.roles.cache.keys()] : [];
      if (roleIds.includes(ownerRoleId)) return true;
    }

    // Check Discord permission: ADMINISTRATOR or MANAGE_GUILD
    if (member.permissions) {
      if (member.permissions.has('Administrator')) return true;
      if (member.permissions.has('ManageGuild')) return true;
    }

    return false;
  } catch {
    return false;
  }
};

module.exports = { checkUserHasOwnerRole, checkUserInGuild, isStaffUser };
