import { test, expect } from 'vitest';

// Unit & property helpers for ChatPage image attachment and preview behavior

function getQuotePreviewText(msg) {
    if (!msg) return 'Original message';
    const text = msg.replyToMessage !== undefined ? msg.replyToMessage : msg.message;
    const img = msg.replyToImageUrl !== undefined ? msg.replyToImageUrl : msg.imageUrl;
    if ((!text || !text.trim()) && img) {
        return '📷 Image';
    }
    const truncate = (str, n = 80) => (str.length > n ? str.slice(0, n) + '…' : str);
    return text ? truncate(text, 60) : 'Original message';
}

test('Property 12 & 13: getQuotePreviewText for chat messages', () => {
    // Property 12: Image-only message preview returns '📷 Image'
    const imageOnlyMsg = { message: '', imageUrl: 'https://example.com/chat-pic.jpg' };
    expect(getQuotePreviewText(imageOnlyMsg)).toBe('📷 Image');

    const imageOnlyMsgNull = { message: null, imageUrl: 'https://example.com/chat-pic.jpg' };
    expect(getQuotePreviewText(imageOnlyMsgNull)).toBe('📷 Image');

    const imageOnlyMsgSpace = { message: '    ', imageUrl: 'https://example.com/chat-pic.jpg' };
    expect(getQuotePreviewText(imageOnlyMsgSpace)).toBe('📷 Image');

    // Property 13: Text present returns text snippet even when imageUrl is set
    const textAndImageMsg = { message: 'Look at this play!', imageUrl: 'https://example.com/chat-pic.jpg' };
    expect(getQuotePreviewText(textAndImageMsg)).toBe('Look at this play!');

    const textOnlyMsg = { message: 'GG WP', imageUrl: null };
    expect(getQuotePreviewText(textOnlyMsg)).toBe('GG WP');
});

test('Property 10: Chat message POST body construction and validation', () => {
    const buildMessageBody = (senderId, receiverId, messageText, imageUrl, replyToId) => {
        if (!messageText.trim() && !imageUrl) {
            throw new Error('Content or image is required.');
        }
        const body = {
            senderId,
            receiverId,
            message: messageText.trim(),
            imageUrl: imageUrl || undefined
        };
        if (replyToId) body.replyToId = replyToId;
        return body;
    };

    // Image-only message
    const body1 = buildMessageBody(5, 10, '', 'https://example.com/chat.png', null);
    expect(body1).toEqual({ senderId: 5, receiverId: 10, message: '', imageUrl: 'https://example.com/chat.png' });

    // Text + Image message
    const body2 = buildMessageBody(5, 10, 'Nice game!', 'https://example.com/chat.png', 101);
    expect(body2).toEqual({ senderId: 5, receiverId: 10, message: 'Nice game!', imageUrl: 'https://example.com/chat.png', replyToId: 101 });

    // Empty throws error
    expect(() => buildMessageBody(5, 10, '', '', null)).toThrow('Content or image is required.');
});
