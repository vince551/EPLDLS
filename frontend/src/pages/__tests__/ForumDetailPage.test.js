import { test, expect } from 'vitest';

// Unit & property helpers for ForumDetailPage image attachment and preview behavior

function getQuotePreviewText(p) {
    if (!p) return 'Original post';
    const content = p.replyToContent !== undefined ? p.replyToContent : p.content;
    const img = p.replyToImageUrl !== undefined ? p.replyToImageUrl : p.imageUrl;
    if ((!content || !content.trim()) && img) {
        return '📷 Image';
    }
    const truncate = (text, n = 80) => (text.length > n ? text.slice(0, n) + '…' : text);
    return content ? truncate(content, 60) : 'Original post';
}

test('Property 12 & 13: getQuotePreviewText for forum posts', () => {
    // Property 12: Image-only post preview returns '📷 Image'
    const imageOnlyPost = { content: '', imageUrl: 'https://example.com/photo.jpg' };
    expect(getQuotePreviewText(imageOnlyPost)).toBe('📷 Image');

    const imageOnlyPostNullContent = { content: null, imageUrl: 'https://example.com/photo.jpg' };
    expect(getQuotePreviewText(imageOnlyPostNullContent)).toBe('📷 Image');

    const imageOnlyPostWhitespace = { content: '   ', imageUrl: 'https://example.com/photo.jpg' };
    expect(getQuotePreviewText(imageOnlyPostWhitespace)).toBe('📷 Image');

    // Property 13: Text present returns text snippet even when imageUrl is present
    const textAndImagePost = { content: 'Check out this screenshot!', imageUrl: 'https://example.com/photo.jpg' };
    expect(getQuotePreviewText(textAndImagePost)).toBe('Check out this screenshot!');

    const textOnlyPost = { content: 'Hello world', imageUrl: null };
    expect(getQuotePreviewText(textOnlyPost)).toBe('Hello world');
});

test('Property 10: POST body construction includes imageUrl and relaxes empty text guard', () => {
    const buildPostBody = (forumId, userId, content, imageUrl, replyToId) => {
        if (!content.trim() && !imageUrl) {
            throw new Error('Content or image is required.');
        }
        const body = {
            forumId: parseInt(forumId),
            userId,
            content: content.trim(),
            imageUrl: imageUrl || undefined
        };
        if (replyToId) body.replyToId = replyToId;
        return body;
    };

    // Valid image-only post
    const body1 = buildPostBody(1, 42, '', 'https://example.com/img.jpg', null);
    expect(body1).toEqual({ forumId: 1, userId: 42, content: '', imageUrl: 'https://example.com/img.jpg' });

    // Valid text + image post
    const body2 = buildPostBody(1, 42, 'Hello', 'https://example.com/img.jpg', 5);
    expect(body2).toEqual({ forumId: 1, userId: 42, content: 'Hello', imageUrl: 'https://example.com/img.jpg', replyToId: 5 });

    // Both empty throws error
    expect(() => buildPostBody(1, 42, '', '', null)).toThrow('Content or image is required.');
});

test('Property 11: File picker visibility when forum is locked', () => {
    const isFilePickerVisible = (forum, currentUser) => {
        if (!currentUser) return false;
        return !forum?.isLocked;
    };

    expect(isFilePickerVisible({ isLocked: true }, { id: 1 })).toBe(false);
    expect(isFilePickerVisible({ isLocked: false }, { id: 1 })).toBe(true);
    expect(isFilePickerVisible({ isLocked: false }, null)).toBe(false);
});
