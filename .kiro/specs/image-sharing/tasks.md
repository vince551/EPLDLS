# Implementation Plan: Image Sharing

## Overview

Extend the forum reply composer and chat input bar to support optional image attachments. Images are uploaded eagerly on selection via an extended `upload.php`, and the resulting URL is stored alongside post/message content in new `image_url` columns. Attached images render inline with a shared `ImageLightbox` component.

## Tasks

- [x] 1. Extend `db.php` with `image_url` column migrations
  - Add `ALTER TABLE` blocks to `ensureSchema()` for `forum_posts.image_url` (VARCHAR 2048, nullable) and `messages.image_url` (VARCHAR 2048, nullable), following the existing `SHOW COLUMNS` + `ALTER TABLE` pattern
  - _Requirements: 2.1, 3.1_

- [x] 2. Extend `upload.php` to handle forum/chat image uploads
  - [x] 2.1 Add context-aware upload path for `forum` and `chat` contexts
    - Read the `context` POST field; when `forum` or `chat`, save to `/api/uploads/images/` with filename `img_{context}_{time}.{ext}`
    - Remove the `userId` requirement for these contexts
    - Validate MIME type against `image/jpeg`, `image/png`, `image/gif`, `image/webp`; return HTTP 400 with `"Invalid image format. Allowed: JPG, PNG, GIF, WEBP"` on failure
    - Enforce 5 MB file size limit; return HTTP 400 with `"Image must be under 5 MB."` on failure
    - Create `/api/uploads/images/` directory if absent
    - Return `{ "success": true, "url": "https://..." }` on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write property test for valid context upload returns a URL (Property 1)
    - **Property 1: Valid context upload returns a URL**
    - **Validates: Requirements 1.1, 1.6**

  - [x] 2.3 Write property test for invalid MIME type rejection (Property 2)
    - **Property 2: Invalid MIME type is rejected**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for unique filenames on upload (Property 3)
    - **Property 3: Uploaded filenames are unique**
    - **Validates: Requirements 1.5**

- [x] 3. Extend `posts.php` to accept and return `imageUrl`
  - [x] 3.1 Accept optional `imageUrl` in `action=create`
    - Read `imageUrl` from POST JSON body; if non-empty, validate it begins with `http://` or `https://` — return HTTP 400 with `"imageUrl must begin with http:// or https://"` otherwise
    - Allow `content` to be empty when `imageUrl` is present; return HTTP 400 with `"Content or image is required."` when both are absent
    - Store `image_url` in the new column and return it as `imageUrl` in the post object response
    - _Requirements: 2.2, 2.4, 2.5, 4.9_

  - [x] 3.2 Write property test for forum post imageUrl round-trip (Property 4)
    - **Property 4: Forum post imageUrl round-trip**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 3.3 Write property test for invalid imageUrl prefix rejection (Property 6)
    - **Property 6: Invalid imageUrl prefix is rejected**
    - **Validates: Requirements 2.4**

- [x] 4. Extend `forums.php` to include `imageUrl` in fetched posts
  - In `action=get`, add `fp.image_url as imageUrl` to the SELECT query so posts include the field (null when absent)
  - _Requirements: 2.3_

- [x] 5. Extend `messages.php` to accept and return `imageUrl`
  - [x] 5.1 Accept optional `imageUrl` in `action=send`
    - Read `imageUrl` from POST JSON body; validate URL prefix if non-empty (HTTP 400 on failure)
    - Allow empty `message` when `imageUrl` is present; return HTTP 400 with `"Content or image is required."` when both are absent
    - Store `image_url` in the new column
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 5.2 Return `imageUrl` in `action=list` and `action=send` responses
    - Add `m.image_url as imageUrl` to the SELECT in `action=list`; cast to null when absent; include in the returned message object from `action=send`
    - _Requirements: 3.3_

  - [x] 5.3 Return `"📷 Image"` as last-message preview when image-only
    - In `action=conversations`, when the last message has a non-null `image_url` and empty/null `message`, set `lastMessage` to `"📷 Image"`
    - _Requirements: 3.6_

  - [x] 5.4 Write property test for chat message imageUrl round-trip (Property 5)
    - **Property 5: Chat message imageUrl round-trip**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.5 Write property test for image-only last message preview (Property 7)
    - **Property 7: Image-only last message preview**
    - **Validates: Requirements 3.6**

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add `uploadImage()` to `api.js`
  - Export a new `uploadImage(file, context)` function mirroring `uploadAvatar`: build a `FormData` with the file under key `image` and the `context` value, POST to `/upload.php`, throw on non-OK or `!data.success` response, return `{ url }`
  - _Requirements: 4.3, 5.3_

- [x] 8. Create `ImageLightbox` component
  - Create `frontend/src/components/ImageLightbox.jsx`
  - Props: `src` (string | null), `onClose` (function)
  - Render a full-screen overlay when `src` is non-null; center the image with `max-width: 90vw`, `max-height: 90vh`
  - Include a close button (X icon, top-right) and close on backdrop click
  - Add `aria-modal="true"`, `role="dialog"`, focus trap on open
  - Render nothing when `src` is null
  - _Requirements: 6.3, 6.4, 7.3_

  - [x] 8.1 Write unit tests for ImageLightbox
    - Test: renders with given src, closes on button click, closes on backdrop click, renders nothing when src is null
    - _Requirements: 6.3, 6.4_

- [x] 9. Add image attachment to `ForumDetailPage.jsx`
  - [x] 9.1 Add attachment state and file picker UI to the reply composer
    - Add state: `imageFile`, `imageUrl`, `imageUploading`, `imageError`
    - Add a hidden `<input type="file" accept="image/*">` and an `<ImagePlus>` icon button that triggers it, adjacent to the submit button, hidden when `forum.isLocked`
    - On file selection, set `imageFile` and show thumbnail preview with an `<X>` remove button; call `uploadImage(file, 'forum')`, set `imageUrl` on success or `imageError` on failure; disable submit and picker while `imageUploading`
    - Remove button clears both `imageFile` and `imageUrl`
    - Display `imageError` inline below the thumbnail
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8_

  - [x] 9.2 Include `imageUrl` in reply submission and relax empty-text guard
    - In `handleReplySubmit`, include `imageUrl` in the POST body when set; allow submission when `imageUrl` is present even if `replyContent` is empty
    - Clear `imageFile`, `imageUrl`, `imageError` after successful submission
    - _Requirements: 4.5, 4.9_

  - [x] 9.3 Render inline images and lightbox in forum posts
    - Import and use `ImageLightbox`; add `lightboxSrc` state
    - Below the `{p.content}` text in each post card, render `{p.imageUrl && <img ... onClick={() => setLightboxSrc(p.imageUrl)} />}` with `maxWidth: '100%'`, `maxHeight: '400px'`, `objectFit: 'contain'`, `cursor: 'zoom-in'`, and an `onError` handler replacing the element with `<span className="img-fallback">Image unavailable</span>`
    - Render `<ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />`
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 9.4 Update reply quote preview for image-only posts
    - In the reply-quoting logic (both the composer bar snippet and the `replyToContent` field), when a post has a non-null `imageUrl` and empty/null `content`, use `"📷 Image"` as the preview text; when both text and image are present, use the truncated text
    - _Requirements: 8.1, 8.2_

  - [x] 9.5 Write property tests for forum composer attachment behavior (Properties 8, 10, 11, 12, 13)
    - **Property 8: Posts with imageUrl render an img element** — Validates: Requirements 6.1
    - **Property 10: Composer imageUrl is included in POST body** — Validates: Requirements 4.5
    - **Property 11: Attachment picker hidden when forum is locked** — Validates: Requirements 4.8
    - **Property 12: Quote preview for image-only items** — Validates: Requirements 8.1
    - **Property 13: Quote preview uses text content when text is present** — Validates: Requirements 8.2

  - [x] 9.6 Write unit tests for forum inline image fallback (Property 9)
    - **Property 9: Failed inline images show fallback text**
    - **Validates: Requirements 6.5**

- [x] 10. Add image attachment to `ChatPage.jsx`
  - [x] 10.1 Add attachment state and file picker UI to the chat input bar
    - Add state: `chatImageFile`, `chatImageUrl`, `chatImageUploading`, `chatImageError`
    - Add an `<ImagePlus>` icon button in the chat input bar and a hidden `<input type="file" accept="image/*">`
    - On file selection, show a preview strip above the input bar with `<X>` dismiss; call `uploadImage(file, 'chat')`, set `chatImageUrl` on success or `chatImageError` on failure; disable send button while uploading
    - Dismiss clears `chatImageFile` and `chatImageUrl`
    - Display `chatImageError` inline near the input bar
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

  - [x] 10.2 Include `chatImageUrl` in message send and relax empty-text guard
    - In `handleSendMessage`, include `imageUrl: chatImageUrl` in the POST body when set; allow sending when `chatImageUrl` is present even if `inputText` is empty
    - Clear `chatImageFile`, `chatImageUrl`, `chatImageError` after send
    - Update the optimistic `tempMsg` to include `imageUrl`
    - _Requirements: 5.5, 5.6_

  - [x] 10.3 Render inline images and lightbox in chat bubbles
    - Import and use `ImageLightbox`; add `lightboxSrc` state
    - Inside each chat bubble, below `{m.message}`, render `{m.imageUrl && <img ... onClick={() => setLightboxSrc(m.imageUrl)} />}` with `maxWidth: '240px'`, `maxHeight: '240px'`, `objectFit: 'cover'`, `cursor: 'zoom-in'`, and an `onError` handler for "Image unavailable" fallback
    - Render `<ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.4 Update reply quote preview for image-only messages
    - In `handleSendMessage` and the reply quote rendering, when the quoted message has `imageUrl` and empty/null `message`, use `"📷 Image"` as the preview; when both present, use truncated text
    - _Requirements: 8.1, 8.2_

  - [x] 10.5 Write property tests for chat attachment behavior (Properties 8, 10, 12, 13)
    - **Property 8: Messages with imageUrl render an img element** — Validates: Requirements 7.1
    - **Property 10: Composer imageUrl is included in POST body** — Validates: Requirements 5.5
    - **Property 12: Quote preview for image-only messages** — Validates: Requirements 8.1
    - **Property 13: Quote preview uses text when text is present** — Validates: Requirements 8.2

  - [x] 10.6 Write unit tests for chat inline image fallback (Property 9)
    - **Property 9: Failed inline images show fallback text**
    - **Validates: Requirements 7.4**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Backend tasks (1–5) should be completed before frontend tasks (7–10) since the API shape drives component state
- Property tests use fast-check (JS frontend) and PHPUnit with custom generators (PHP backend)
- Each task references specific requirements for traceability
