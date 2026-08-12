# Design Document: Image Sharing

## Overview

This feature extends the existing forum and chat systems to support optional image attachments on posts and messages. Users select an image via an icon button in the composer/input bar; the image is uploaded immediately to the server and the returned URL is stored alongside the text when the post or message is submitted. Attached images render inline in forum threads and chat bubbles, with a lightbox for full-size viewing.

The design deliberately reuses the existing `upload.php` infrastructure, `apiFetch`/`uploadAvatar` patterns from `api.js`, and the `db.php` auto-migration pattern so that no new architectural patterns are introduced.

---

## Architecture

The feature spans three layers:

```mermaid
flowchart TD
    subgraph Frontend
        FP[ForumDetailPage.jsx\nreply composer]
        CP[ChatPage.jsx\nchat input bar]
        IL[ImageLightbox component]
        AU[api.js\nuploadImage()]
    end

    subgraph Backend
        UP[upload.php\nextended for forum/chat context]
        PP[posts.php\nextended with imageUrl]
        MP[messages.php\nextended with imageUrl]
        DB[(MySQL\nforum_posts.image_url\nmessages.image_url)]
    end

    FP -- "1. pick file" --> AU
    CP -- "1. pick file" --> AU
    AU -- "POST multipart/form-data\ncontext=forum|chat" --> UP
    UP -- "returns {url}" --> AU
    AU -- "stores URL in state" --> FP
    AU -- "stores URL in state" --> CP
    FP -- "POST body + imageUrl" --> PP
    CP -- "POST body + imageUrl" --> MP
    PP --> DB
    MP --> DB
    DB -- "imageUrl in response" --> FP
    DB -- "imageUrl in response" --> CP
    FP -- "click inline image" --> IL
    CP -- "click inline image" --> IL
```

Upload happens eagerly on file selection (before submit), matching the existing `uploadAvatar` pattern. This keeps the submit path simple: it only sends a URL, not a file.

---

## Components and Interfaces

### Backend

#### `upload.php` — extended

Accepts an additional `context` POST field (`forum` | `chat`). When context is `forum` or `chat`:
- Saves to `/api/uploads/images/` instead of `/api/uploads/avatars/`
- Does **not** require `userId` (Requirement 1.6)
- Existing avatar path is unchanged

New helper added internally:

```
POST /upload.php
Form fields:
  context  = "forum" | "chat"        (new)
  image    = <file>                   (new field name for non-avatar uploads)
  userId   = <int>                    (optional for forum/chat context)

Response (success):
  { "success": true, "url": "https://..." }

Response (error):
  { "error": "<message>" }  HTTP 400
```

#### `posts.php` — extended

`action=create` now accepts an optional `imageUrl` string in the JSON body. Validated to start with `http://` or `https://` if non-empty. Stored in `forum_posts.image_url`. Returned in the post object.

The `content` field validation is relaxed: empty `content` is permitted when `imageUrl` is present (Requirement 4.9).

#### `messages.php` — extended

`action=send` now accepts an optional `imageUrl` string. Same URL validation. Stored in `messages.image_url`. Returned in message objects from `action=list`. 

`action=conversations` last-message preview: when the last message has an image and no text, `lastMessage` is set to `"📷 Image"` (Requirement 3.6).

Empty `message` is permitted when `imageUrl` is present (Requirement 3.5).

#### `db.php` — migration additions

Two new `ALTER TABLE` blocks follow the existing pattern:

```php
// forum_posts
if (!in_array('image_url', $fpCols)) {
    $pdo->exec("ALTER TABLE `forum_posts` ADD COLUMN `image_url` VARCHAR(2048) NULL DEFAULT NULL");
}

// messages
if (!in_array('image_url', $msgCols)) {
    $pdo->exec("ALTER TABLE `messages` ADD COLUMN `image_url` VARCHAR(2048) NULL DEFAULT NULL");
}
```

### Frontend

#### `api.js` — new `uploadImage()` export

```js
export async function uploadImage(file, context) {
  // context: "forum" | "chat"
  // Returns { url: "https://..." }
}
```

Mirrors `uploadAvatar`: builds a `FormData` with the file under the key `image` plus `context`, POSTs to `/upload.php`, throws on failure.

#### `ForumDetailPage.jsx` — composer additions

New state:
- `imageFile` — selected `File` object (pre-upload, for preview)
- `imageUrl` — uploaded URL string (post-upload, included in submit body)
- `imageUploading` — boolean
- `imageError` — string | null

New UI elements (hidden when forum is locked):
- `<ImagePlus>` icon button triggers a hidden `<input type="file" accept="image/*">`
- Thumbnail preview with `<X>` remove button, shown after selection
- Inline error display below the thumbnail if upload fails
- Submit button and picker button disabled while `imageUploading === true`

`handleReplySubmit` includes `imageUrl` in POST body when set. Validation: allows empty `replyContent` if `imageUrl` is set.

Reply quote text: when quoting a post that has `imageUrl` and no `content`, display `"📷 Image"` (Requirement 8.1).

#### `ChatPage.jsx` — input bar additions

New state:
- `chatImageFile`, `chatImageUrl`, `chatImageUploading`, `chatImageError`

New UI:
- `<ImagePlus>` button in the chat input bar
- Preview strip above the input bar with `<X>` dismiss
- Send button disabled while uploading

`handleSendMessage` includes `chatImageUrl` in POST body. Allows sending with empty `inputText` if `chatImageUrl` is set (Requirement 5.6).

Reply quote text: same `"📷 Image"` fallback as forum (Requirement 8.1).

#### `ImageLightbox` — new shared component

```
frontend/src/components/ImageLightbox.jsx
```

Props: `src: string | null`, `onClose: () => void`

Renders a full-screen overlay with:
- The image centered, max 90vw / 90vh
- A close button (`X` icon, top-right)
- Click on backdrop also closes
- `aria-modal="true"`, `role="dialog"`, focus trap on open
- `ZoomIn` icon on inline images to hint they are clickable

Used in both `ForumDetailPage` and `ChatPage`.

#### Inline image rendering

Forum post card (below text):
```jsx
{p.imageUrl && (
  <img
    src={p.imageUrl}
    alt="Attached image"
    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', cursor: 'zoom-in' }}
    onClick={() => setLightboxSrc(p.imageUrl)}
    onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('span'), { textContent: 'Image unavailable', className: 'img-fallback' })); }}
  />
)}
```

Chat bubble (below text):
```jsx
{m.imageUrl && (
  <img
    src={m.imageUrl}
    alt="Attached image"
    style={{ maxWidth: '240px', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', cursor: 'zoom-in', display: 'block' }}
    onClick={() => setLightboxSrc(m.imageUrl)}
    onError={...}
  />
)}
```

---

## Data Models

### `forum_posts` table (addition)

| Column      | Type            | Nullable | Default | Notes                              |
|-------------|-----------------|----------|---------|------------------------------------|
| `image_url` | VARCHAR(2048)   | YES      | NULL    | Public URL of attached image       |

Migration: added via `db.php` `ensureSchema()` using `SHOW COLUMNS` + `ALTER TABLE IF NOT EXISTS` pattern.

### `messages` table (addition)

| Column      | Type            | Nullable | Default | Notes                              |
|-------------|-----------------|----------|---------|------------------------------------|
| `image_url` | VARCHAR(2048)   | YES      | NULL    | Public URL of attached image       |

### Upload directory

`/api/uploads/images/` — created by `upload.php` if absent (mirrors existing avatars directory creation).

### API shapes (additions)

**Forum post object** (existing fields omitted):
```json
{
  "imageUrl": "https://api.sokomtaa.co.ke/epldls/uploads/images/img_42_1720000000.jpg"
}
```
`imageUrl` is `null` when no image is attached.

**Chat message object** (existing fields omitted):
```json
{
  "imageUrl": "https://api.sokomtaa.co.ke/epldls/uploads/images/img_chat_7_1720000001.webp"
}
```

**Upload response:**
```json
{ "success": true, "url": "https://..." }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Valid context upload returns a URL

*For any* valid image file (JPEG, PNG, GIF, or WEBP under 5 MB) submitted to `upload.php` with `context` set to `forum` or `chat`, the response should be HTTP 200 with a `url` field containing a non-empty string, regardless of whether `userId` is provided.

**Validates: Requirements 1.1, 1.6**

---

### Property 2: Invalid MIME type is rejected

*For any* file whose MIME type is not one of `image/jpeg`, `image/png`, `image/gif`, or `image/webp`, a POST to `upload.php` should return HTTP 400.

**Validates: Requirements 1.2**

---

### Property 3: Uploaded filenames are unique

*For any* two upload requests (even with identical file content and name), the `url` values in their responses should differ from each other.

**Validates: Requirements 1.5**

---

### Property 4: Forum post imageUrl round-trip

*For any* forum post created via `posts.php?action=create` with a valid `imageUrl`, fetching the forum via `forums.php?action=get` should return that post with the same `imageUrl` value. Posts created without an `imageUrl` should have `imageUrl: null` in the response.

**Validates: Requirements 2.2, 2.3**

---

### Property 5: Chat message imageUrl round-trip

*For any* message sent via `messages.php?action=send` with a valid `imageUrl`, fetching messages via `messages.php?action=list` should return that message with the same `imageUrl` value. Messages sent without an `imageUrl` should have `imageUrl: null` in the response.

**Validates: Requirements 3.2, 3.3**

---

### Property 6: Invalid imageUrl prefix is rejected

*For any* string that does not begin with `http://` or `https://` supplied as `imageUrl` in a `posts.php?action=create` or `messages.php?action=send` request, the system should return HTTP 400.

**Validates: Requirements 2.4, 3.4**

---

### Property 7: Image-only last message preview

*For any* conversation where the last message has a non-null `imageUrl` and an empty or null `message` body, the `lastMessage` field returned by `messages.php?action=conversations` should equal `"📷 Image"`.

**Validates: Requirements 3.6**

---

### Property 8: Posts and messages with imageUrl render an img element

*For any* rendered forum post or chat message with a non-null `imageUrl`, the rendered output should contain an `<img>` element whose `src` attribute equals the `imageUrl`.

**Validates: Requirements 6.1, 7.1**

---

### Property 9: Failed inline images show fallback text

*For any* inline image element whose `onError` event fires (simulating a broken URL), the element should be replaced with the text `"Image unavailable"`.

**Validates: Requirements 6.5, 7.4**

---

### Property 10: Composer imageUrl is included in POST body

*For any* forum reply or chat message submitted when `imageUrl` is present in component state, the POST body sent to the server should include an `imageUrl` field equal to that value.

**Validates: Requirements 4.5, 5.5**

---

### Property 11: Attachment picker hidden when forum is locked

*For any* forum thread in the locked state (`forum.isLocked === true`), the `<ImagePlus>` attachment button should not appear in the rendered composer.

**Validates: Requirements 4.8**

---

### Property 12: Quote preview for image-only items

*For any* forum post or chat message that has a non-null `imageUrl` and empty/null `content`/`message`, when it is referenced as the quote target in a reply composer or reply quote, the preview text should be `"📷 Image"`.

**Validates: Requirements 8.1**

---

### Property 13: Quote preview uses text content when text is present

*For any* forum post or chat message that has both a non-empty `content`/`message` and a non-null `imageUrl`, when it is used as a reply quote, the preview text should be the text content truncated to 80 characters (not `"📷 Image"`).

**Validates: Requirements 8.2**

---

## Error Handling

### Upload errors

- File too large (>5 MB): `upload.php` returns `{ "error": "Image must be under 5 MB." }` with HTTP 400.
- Invalid type: `{ "error": "Invalid image format. Allowed: JPG, PNG, GIF, WEBP" }` with HTTP 400.
- Directory creation failure: HTTP 500 with a generic server error.
- Frontend: `uploadImage()` throws with the server's error message. The composer catches it, sets `imageError` state, and renders the message inline. The submit/send button remains disabled while `imageUploading` is true; on error, `imageUploading` is reset to false.

### Post/message validation errors

- `imageUrl` without valid prefix: HTTP 400 `{ "error": "imageUrl must begin with http:// or https://" }`.
- Neither `content` nor `imageUrl` provided: HTTP 400 `{ "error": "Content or image is required." }`.
- Frontend: catches the thrown error from `apiFetch` and displays it with `alert()` (consistent with existing code) or inline if the error is image-specific.

### Inline image load failures

- `onError` on `<img>` replaces the element with a `<span className="img-fallback">Image unavailable</span>`.

### Lightbox

- Opening the lightbox with `src=null` renders nothing (guard in the component).

---

## Testing Strategy

### Unit tests (Vitest + React Testing Library)

Focus on specific examples, edge cases, and error conditions:

- `ImageLightbox` renders with a given src, closes on button click and backdrop click.
- Forum composer: thumbnail appears after file selection; remove button clears the preview; submit button is disabled during upload; error message displays when upload fails; submission includes `imageUrl` in POST body.
- Chat input bar: same set for chat context.
- Inline image fallback: `onError` triggers the "Image unavailable" text.
- Quote text: `"📷 Image"` shown for image-only items; text shown for mixed items.
- `uploadImage()` function: builds correct `FormData`, calls correct URL, throws on non-OK response.
- `posts.php` + `messages.php` (PHP unit or integration tests): `imageUrl` is stored and returned; invalid URL prefix returns 400; empty text + image creates successfully.
- `upload.php`: invalid MIME returns 400; missing file returns 400; valid file with `context=forum` returns `{url}`.

### Property-based tests (fast-check for JS / PhpUnit + custom generators for PHP)

Each property test runs a minimum of 100 iterations.

Tag format: **Feature: image-sharing, Property N: <property text>**

| Property | Test description |
|----------|-----------------|
| P1 | Generate random valid image files + random context (forum/chat), verify response has `url` |
| P2 | Generate arbitrary non-image MIME types, verify HTTP 400 |
| P3 | Upload the same file twice, verify URLs differ |
| P4 | Generate random valid post payloads with random valid `imageUrl` strings, create then fetch, verify round-trip |
| P5 | Same as P4 for messages |
| P6 | Generate random strings that don't start with `http://` or `https://`, send as `imageUrl`, verify HTTP 400 |
| P7 | Generate random messages with `imageUrl` and no text, call conversations, verify `lastMessage === "📷 Image"` |
| P8 | Generate random post/message objects with non-null `imageUrl`, render component, verify `<img src={imageUrl}>` present |
| P9 | Render any `<img>`, fire `onError`, verify fallback text appears |
| P10 | Generate random `imageUrl` values, simulate submit, intercept fetch call, verify body contains `imageUrl` |
| P11 | Generate random forum objects with `isLocked=true`, render composer, verify no `<ImagePlus>` button |
| P12 | Generate random items with `imageUrl` and empty text, render quote preview, verify `"📷 Image"` |
| P13 | Generate random items with non-empty text and any `imageUrl`, render quote preview, verify text (truncated) is shown |

### Integration

- End-to-end flow: select image → upload → post/send → fetch → inline render → lightbox open/close. Run against a test database with the migration applied.
