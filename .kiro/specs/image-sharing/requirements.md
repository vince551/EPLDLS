# Requirements Document

## Introduction

This feature adds image sharing to forum threads and direct chat messages. Users can attach one image per reply or message, which is uploaded to the server and displayed inline. The feature reuses the existing upload infrastructure (`api/upload.php`, `/api/uploads/`) and extends the `forum_posts` and `messages` tables with an `image_url` column. Both the forum reply composer in `ForumDetailPage.jsx` and the chat input bar in `ChatPage.jsx` gain an image attachment button. Images are uploaded immediately on selection; the resulting URL is included in the post/message submission.

## Glossary

- **Image_Uploader**: The PHP endpoint (`upload.php`) responsible for receiving image files, validating them, saving them to the server, and returning a public URL.
- **Forum_Post**: A single reply in a forum thread, stored in the `forum_posts` table with a `content` TEXT column and a new nullable `image_url` VARCHAR column.
- **Chat_Message**: A single direct message between two users, stored in the `messages` table with a `message` TEXT column and a new nullable `image_url` VARCHAR column.
- **Attachment_Picker**: The UI control (an icon button triggering a hidden file input) that lets users select a local image file before submitting a forum reply or chat message.
- **Inline_Image**: An `<img>` element rendered inside a Forum_Post or Chat_Message displaying the attached image at a constrained size within the thread or chat pane.
- **Image_Lightbox**: A full-screen overlay that displays an Inline_Image at a larger size when the user clicks it.
- **System**: The combined PHP backend and React frontend application.

---

## Requirements

### Requirement 1: Image upload endpoint supports forum and chat contexts

**User Story:** As a developer, I want the image upload endpoint to accept uploads for forum posts and chat messages (not just avatars), so that image URLs can be stored alongside post or message content.

#### Acceptance Criteria

1. WHEN a POST request is made to `upload.php` with a `context` parameter of `forum` or `chat`, THE Image_Uploader SHALL save the file to `/api/uploads/images/` and return a JSON response containing a `url` field with the publicly accessible image URL.
2. WHEN a POST request is made to `upload.php` with a file whose MIME type is not one of `image/jpeg`, `image/png`, `image/gif`, or `image/webp`, THE Image_Uploader SHALL return a 400 error with a descriptive message.
3. WHEN a POST request is made to `upload.php` with an image file exceeding 5 MB, THE Image_Uploader SHALL return a 400 error indicating the size limit.
4. IF the upload directory `/api/uploads/images/` does not exist, THEN THE Image_Uploader SHALL create it before saving the file.
5. THE Image_Uploader SHALL generate a unique filename for each uploaded image to prevent filename collisions.
6. WHEN a POST request is made to `upload.php` with `context` of `forum` or `chat`, THE Image_Uploader SHALL NOT require a valid `userId` for the upload to succeed.

---

### Requirement 2: Forum posts store and return image attachments

**User Story:** As a developer, I want forum posts to carry an optional image URL, so that the frontend can render attached images inline in a thread.

#### Acceptance Criteria

1. THE `forum_posts` table SHALL have a nullable `image_url` VARCHAR(2048) column.
2. WHEN a forum post is created via `posts.php?action=create` with a non-empty `imageUrl` field in the JSON request body, THE System SHALL persist that value in the `image_url` column of the new row.
3. WHEN forum posts are fetched via `forums.php?action=get`, THE System SHALL include the `imageUrl` field for every post in the response (null when no image is attached).
4. IF a `create` request is received with an `imageUrl` value that does not begin with `http://` or `https://`, THEN THE System SHALL reject the request with a 400 error.
5. WHEN a forum post is created via `posts.php?action=create` with no `imageUrl` field or an empty `imageUrl`, THE System SHALL store `null` in the `image_url` column and still create the post successfully provided `content` is non-empty.

---

### Requirement 3: Chat messages store and return image attachments

**User Story:** As a developer, I want direct messages to carry an optional image URL, so that the frontend can render attached images inline in a chat thread.

#### Acceptance Criteria

1. THE `messages` table SHALL have a nullable `image_url` VARCHAR(2048) column.
2. WHEN a message is sent via `messages.php?action=send` with a non-empty `imageUrl` field in the JSON request body, THE System SHALL persist that value in the `image_url` column of the new row.
3. WHEN messages are fetched via `messages.php?action=list`, THE System SHALL include the `imageUrl` field for every message in the response (null when no image is attached).
4. IF a `send` request is received with an `imageUrl` value that does not begin with `http://` or `https://`, THEN THE System SHALL reject the request with a 400 error.
5. WHEN a message is sent via `messages.php?action=send` with a non-empty `imageUrl` and an empty or absent `message` field, THE System SHALL store the message successfully with a null or empty text body.
6. WHEN the `conversations` action returns the last message preview for an inbox item whose last message has an image and no text, THE System SHALL set `lastMessage` to the string `"📷 Image"`.

---

### Requirement 4: Forum reply composer supports image attachment

**User Story:** As a user, I want to attach an image when writing a forum reply, so that I can share screenshots or photos in a thread.

#### Acceptance Criteria

1. THE Attachment_Picker SHALL be visible in the forum reply composer on `ForumDetailPage` as an icon button adjacent to the submit button.
2. WHEN a user selects a file via the Attachment_Picker, THE System SHALL display a thumbnail preview of the selected image above the text area before the reply is submitted.
3. WHEN a user selects a file via the Attachment_Picker, THE System SHALL immediately upload the image to `upload.php` with `context=forum` and store the returned URL in component state.
4. WHEN a user clicks the remove control on the image preview, THE System SHALL clear the stored image URL from component state and allow a new image to be selected.
5. WHEN the user submits the reply form with an image URL in component state, THE System SHALL include `imageUrl` in the POST body sent to `posts.php?action=create`.
6. IF the image upload to `upload.php` fails, THEN THE System SHALL display an inline error message near the composer and SHALL NOT submit the reply form.
7. WHILE an image is uploading, THE System SHALL disable the submit button and Attachment_Picker button.
8. WHERE the forum thread is locked, THE Attachment_Picker SHALL NOT be rendered.
9. WHEN a user submits the reply form with no text content and an image URL in component state, THE System SHALL allow the submission to proceed.

---

### Requirement 5: Chat input bar supports image attachment

**User Story:** As a user, I want to attach an image in a direct message, so that I can share images with friends in chat.

#### Acceptance Criteria

1. THE Attachment_Picker SHALL be visible in the chat input bar on `ChatPage` as an icon button.
2. WHEN a user selects a file via the Attachment_Picker in chat, THE System SHALL display a small thumbnail preview above the input bar before the message is sent.
3. WHEN a user selects a file via the Attachment_Picker in chat, THE System SHALL immediately upload the image to `upload.php` with `context=chat` and store the returned URL in component state.
4. WHEN a user removes the image preview before sending, THE System SHALL clear the stored image URL from component state.
5. WHEN the user sends a message with an image URL in component state, THE System SHALL include `imageUrl` in the POST body sent to `messages.php?action=send`.
6. WHEN a user presses Send with no input text and an image URL in component state, THE System SHALL send the message with an empty text body and the image URL.
7. IF the image upload to `upload.php` fails, THEN THE System SHALL display an inline error message near the input bar and SHALL NOT send the message.
8. WHILE an image is uploading, THE System SHALL disable the send button.

---

### Requirement 6: Images display inline in forum threads

**User Story:** As a user, I want to see attached images rendered inside forum replies, so that I can view shared images without leaving the thread.

#### Acceptance Criteria

1. WHEN a Forum_Post with a non-null `imageUrl` is rendered in `ForumDetailPage`, THE System SHALL render an Inline_Image within the post card, below any text content.
2. THE Inline_Image SHALL have a maximum width of 100% of its container and a maximum height of 400px, with `object-fit: contain` to preserve aspect ratio.
3. WHEN a user clicks an Inline_Image, THE System SHALL open an Image_Lightbox displaying the full image.
4. WHEN the Image_Lightbox is open, THE System SHALL provide a visible close control that dismisses the lightbox when activated.
5. IF an Inline_Image fails to load, THEN THE System SHALL display a text fallback reading "Image unavailable" in place of the broken image.

---

### Requirement 7: Images display inline in chat messages

**User Story:** As a user, I want to see attached images rendered inside chat bubbles, so that I can view shared images inline in a conversation.

#### Acceptance Criteria

1. WHEN a Chat_Message with a non-null `imageUrl` is rendered in `ChatPage`, THE System SHALL render an Inline_Image inside the chat bubble, below any text content.
2. THE Inline_Image in a chat bubble SHALL have a maximum width of 240px and a maximum height of 240px, with `object-fit: cover` to preserve aspect ratio within the constrained dimensions.
3. WHEN a user clicks an Inline_Image in a chat bubble, THE System SHALL open an Image_Lightbox displaying the full image.
4. IF an Inline_Image fails to load, THEN THE System SHALL display a text fallback reading "Image unavailable" within the bubble.
5. WHEN a Chat_Message contains an image URL and no text content, THE System SHALL render only the Inline_Image inside the bubble without an empty text node.

---

### Requirement 8: Image context preserved in reply quotes

**User Story:** As a user, when I reply to a message or post that contains an image, I want the quoted preview to indicate an image was attached, so that the context of my reply is clear.

#### Acceptance Criteria

1. WHEN a Forum_Post or Chat_Message that has a non-null `imageUrl` and no text content is quoted in a reply, THE System SHALL display the string `"📷 Image"` as the reply quote preview text.
2. WHEN a Forum_Post or Chat_Message that has both text content and a non-null `imageUrl` is quoted in a reply, THE System SHALL display the text content (truncated to 80 characters) in the reply quote preview.
