const getVouchCommandValidationError = ({ content, imageCount, authorized, hasOrder } = {}) => {
    if (String(content || '').trim() !== '!') return '';
    if (Number(imageCount || 0) < 1) return 'Vui long gui lenh ! kem it nhat mot anh.';
    if (!authorized) return 'Ban khong co quyen gui vouch.';
    if (!hasOrder) return 'Khong tim thay don hang gan voi ticket nay.';
    return '';
};

const getMessageId = (message) => String(message?.id || '').trim();

const getAttachmentUrls = (message) => {
    if (!message?.attachments || typeof message.attachments.values !== 'function') return [];
    return Array.from(message.attachments.values())
        .map((attachment) => String(attachment?.url || '').trim())
        .filter(Boolean);
};

const sendVouchBatchWithFallback = async ({ channel, headerContent, headerEmbed, files, sourceUrls } = {}) => {
    const cleanHeader = String(headerContent || '').trim();
    const cleanUrls = (Array.isArray(sourceUrls) ? sourceUrls : [])
        .map((url) => String(url || '').trim())
        .filter(Boolean);

    const sendUrlFallback = async (uploadError = null) => {
        const sentMessages = [];
        if (cleanHeader || headerEmbed) {
            const payload = {};
            if (cleanHeader) payload.content = cleanHeader;
            if (headerEmbed) payload.embeds = [headerEmbed];
            sentMessages.push(await channel.send(payload));
        }
        for (const url of cleanUrls) {
            sentMessages.push(await channel.send({ content: url }));
        }
        return {
            usedFallback: true,
            uploadError,
            messageIds: sentMessages.map(getMessageId).filter(Boolean),
            imageUrls: cleanUrls
        };
    };

    if (!Array.isArray(files) || files.length === 0) {
        return sendUrlFallback();
    }

    try {
        const payload = { files };
        if (cleanHeader) payload.content = cleanHeader;
        if (headerEmbed) payload.embeds = [headerEmbed];
        const sent = await channel.send(payload);
        return {
            usedFallback: false,
            messageIds: [getMessageId(sent)].filter(Boolean),
            imageUrls: getAttachmentUrls(sent)
        };
    } catch (uploadError) {
        if (cleanUrls.length === 0) throw uploadError;
        return sendUrlFallback(uploadError);
    }
};

module.exports = {
    getVouchCommandValidationError,
    sendVouchBatchWithFallback
};
