import { Message, AttachmentBuilder, Client } from 'discord.js';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function getMongooseConnection() {
    if (mongoose.connection.readyState === 1) return mongoose.connection.asPromise();
    await mongoose.connect(MONGO_URI);
    return mongoose.connection;
}

export async function handleMessage(message: Message) {
  if (message.author.bot) return;

  // Auto-vouch helper logic
  const vouchChannelId = process.env.VOUCH_CHANNEL_ID;
  const ownerRoleId = process.env.OWNER_ROLE_ID;

  if (message.channel.type === 0 && message.channel.name.startsWith('ticket-')) { // GuildText
    const isStaff = message.member?.roles.cache.has(ownerRoleId || '') || message.member?.permissions.has('Administrator');
    if (isStaff && message.attachments.size > 0 && vouchChannelId) {
      const vouchChannel = message.guild?.channels.cache.get(vouchChannelId);
      if (vouchChannel && vouchChannel.isTextBased()) {
        for (const [key, attachment] of message.attachments) {
          const file = new AttachmentBuilder(attachment.url);
          await vouchChannel.send({
            content: `⭐ New vouch delivery receipt from <@${message.author.id}> in <#${message.channel.id}>:`,
            files: [file]
          });
        }
      }
    }
  }

  // Handle message commands: !close, !done, !confirm
  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command === 'close') {
      try {
        await message.reply('⏳ Closing ticket...');
        setTimeout(async () => {
          try {
            await message.channel.delete();
          } catch (e) {
            console.error('Error deleting channel:', e);
          }
        }, 3000);
      } catch (error) {
        console.error(error);
      }
    }

    if (command === 'done') {
      try {
        // Tìm order từ channel và gửi mã 50% cho referrer
        await sendReferrer50Reward(message);
        
        await message.reply('✅ Order completed. Closing channel...');
        setTimeout(async () => {
          try {
            await message.channel.delete();
          } catch (e) {
            console.error('Error deleting channel:', e);
          }
        }, 2000);
      } catch (error) {
        console.error('Done command error:', error);
        await message.reply('❌ An error occurred while completing the order.');
      }
    }

    if (command === 'confirm') {
      try {
        await message.reply('📦 Requesting delivery confirmation...');
      } catch (error) {
        console.error(error);
      }
    }
  }
}

// === Gửi mã 50% cho referrer khi !done ===
async function sendReferrer50Reward(message: Message) {
    try {
        const channelName = message.channel.name;
        // Channel name format: ticket-{orderId}
        const orderId = channelName.replace('ticket-', '');
        if (!orderId) return;
        
        await getMongooseConnection();
        const Order = mongoose.model('Order');
        const Referral = mongoose.model('Referral');
        
        const order = await Order.findOne({ orderId }).lean();
        if (!order?.referredByDiscordId) {
            console.log('[DONE] No referrer for order:', orderId);
            return;
        }
        
        // Tìm referral record để lấy mã 50%
        const referral = await Referral.findOne({ 
            refereeDiscordId: order.discordId,
            referrerDiscordId: order.referredByDiscordId
        }).lean();
        
        if (!referral?.rewardCouponCode) {
            console.log('[DONE] No reward coupon for referrer:', order.referredByDiscordId);
            return;
        }
        
        // Gửi DM cho referrer
        const referrerUser = await message.client.users.fetch(order.referredByDiscordId).catch(() => null);
        if (!referrerUser) {
            console.log('[DONE] Cannot find referrer user:', order.referredByDiscordId);
            return;
        }
        
        const dmMessage = `🎉 **Chuc mung! Ban nhan duoc ma giam gia 50%!**\n\n` +
            `Nguoi ban A (${order.discordUsername || order.discordId}) da su dung ma gioi thieu cua ban va hoan thanh don hang.\n\n` +
            `📌 **Ma giam gia cua ban: ${referral.rewardCouponCode}**\n` +
            `🎁 Giam 50% cho don hang tiep theo!\n\n` +
            `Cam on ban da gioi thieu! Chuc ban mua sam vui ve! 🛒`;
        
        await referrerUser.send(dmMessage);
        console.log('[DONE] Da gui ma 50% cho referrer:', order.referredByDiscordId, referral.rewardCouponCode);
        
        // Cap nhat trang thai referral thanh rewarded
        await Referral.updateOne(
            { _id: referral._id },
            { $set: { status: 'rewarded' } }
        );
        
    } catch (err) {
        console.error('[DONE] Loi gui ma 50% cho referrer:', err);
    }
}