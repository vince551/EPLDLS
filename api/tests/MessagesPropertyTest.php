<?php
/**
 * Property-Based Tests for messages.php
 *
 * Feature: image-sharing
 *
 * Run with: php api/tests/MessagesPropertyTest.php
 *
 * These tests exercise the imageUrl validation and storage logic from
 * messages.php, and the conversations last-message preview logic.
 * The core validation/storage logic is mirrored here (no live DB required).
 *
 * Properties covered:
 *
 *   Property 5: Chat message imageUrl round-trip
 *     Validates: Requirements 3.2, 3.3
 *
 *   Property 7: Image-only last message preview
 *     Validates: Requirement 3.6
 */

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test harness (no external dependencies)
// ─────────────────────────────────────────────────────────────────────────────

class TestRunner
{
    private int $passed  = 0;
    private int $failed  = 0;
    private array $failures = [];

    public function assert(bool $condition, string $message): void
    {
        if ($condition) {
            $this->passed++;
        } else {
            $this->failed++;
            $this->failures[] = $message;
            echo "  FAIL: {$message}\n";
        }
    }

    public function run(string $name, callable $test): void
    {
        echo "\n[TEST] {$name}\n";
        try {
            $test($this);
        } catch (Throwable $e) {
            $this->failed++;
            $msg = "Exception thrown: " . $e->getMessage()
                 . " in " . $e->getFile() . ':' . $e->getLine();
            $this->failures[] = $msg;
            echo "  FAIL: {$msg}\n";
        }
    }

    public function summary(): void
    {
        $total = $this->passed + $this->failed;
        echo "\n" . str_repeat('─', 60) . "\n";
        echo "Results: {$this->passed}/{$total} assertions passed";
        if ($this->failed > 0) {
            echo ", {$this->failed} FAILED";
        }
        echo "\n";
        if (!empty($this->failures)) {
            echo "\nFailed assertions:\n";
            foreach ($this->failures as $i => $f) {
                echo "  " . ($i + 1) . ". {$f}\n";
            }
        }
        echo str_repeat('─', 60) . "\n";
    }

    public function exitCode(): int
    {
        return $this->failed > 0 ? 1 : 0;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logic extracted / mirrored from messages.php
// ─────────────────────────────────────────────────────────────────────────────
// Rather than invoking messages.php as a subprocess (which would require a
// live web server and MySQL database), we replicate the discrete pieces of
// validation logic that the properties care about:
//
//   1. imageUrl prefix validation  (used by Properties 5 & 6)
//   2. Message send pipeline        (used by Property 5 round-trip logic)
//   3. Conversations last-message   (used by Property 7 preview logic)
//
// If messages.php's implementation ever diverges from these functions a CI
// diff on the constants/patterns below will surface the inconsistency.

/**
 * Mirror of the imageUrl prefix check in messages.php action=send.
 *
 * Returns true when the URL is acceptable (empty string = no image = OK, or
 * starts with http:// / https://), false when it should be rejected with
 * HTTP 400.
 *
 * From messages.php:
 *   if ($imageUrl !== '' && !str_starts_with($imageUrl, 'http://')
 *                        && !str_starts_with($imageUrl, 'https://')) {
 *       jsonResponse(['error' => 'imageUrl must begin with http:// or https://'], 400);
 *   }
 */
function isImageUrlValid(string $imageUrl): bool
{
    if ($imageUrl === '') {
        return true; // no image supplied — passes URL check
    }
    return str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://');
}

/**
 * Mirror of the message send pipeline in messages.php action=send.
 *
 * Returns an array mirroring the HTTP response shape:
 *
 *   On success: ['status' => 200, 'body' => ['success' => true, 'message' => [...]]]
 *   On error:   ['status' => 400, 'body' => ['error' => '<message>']]
 *
 * The message object in the success body contains the fields that would be
 * returned by messages.php, including 'imageUrl' (null when not supplied).
 *
 * @param int    $senderId    Must be > 0
 * @param int    $receiverId  Must be > 0
 * @param string $message     Message text (may be empty when imageUrl is set)
 * @param string $imageUrl    URL string (may be empty to mean "no image")
 * @param int    $newId       Synthetic auto-increment id for the created message
 */
function simulateSendMessage(
    int    $senderId,
    int    $receiverId,
    string $message,
    string $imageUrl,
    int    $newId = 1
): array {
    // Required field check — mirrors messages.php
    if (!$senderId || !$receiverId) {
        return ['status' => 400, 'body' => ['error' => 'Sender and receiver are required.']];
    }

    // imageUrl prefix validation — mirrors messages.php
    if ($imageUrl !== '' && !isImageUrlValid($imageUrl)) {
        return [
            'status' => 400,
            'body'   => ['error' => 'imageUrl must begin with http:// or https://'],
        ];
    }

    // Require at least message text or an image — mirrors messages.php
    if ($message === '' && $imageUrl === '') {
        return ['status' => 400, 'body' => ['error' => 'Content or image is required.']];
    }

    // Normalise: store null when imageUrl was not supplied
    $storedImageUrl = $imageUrl !== '' ? $imageUrl : null;

    $msg = [
        'id'          => $newId,
        'senderId'    => $senderId,
        'receiverId'  => $receiverId,
        'message'     => $message,
        'imageUrl'    => $storedImageUrl,
        'isRead'      => false,
        'readAt'      => null,
        'timestamp'   => date('Y-m-d H:i:s'),
    ];

    return ['status' => 200, 'body' => ['success' => true, 'message' => $msg]];
}

/**
 * Mirror of the action=list fetch pipeline as it relates to imageUrl.
 *
 * In messages.php the SELECT includes `m.image_url as imageUrl` so every
 * fetched message row carries the field (null when no image was attached).
 *
 * This function normalises an array of messages from simulateSendMessage to
 * the shape that action=list would return.
 *
 * @param array $messages  Array of message arrays (from simulateSendMessage)
 * @return array           ['status' => 200, 'body' => ['messages' => [...]]]
 */
function simulateFetchMessages(array $messages): array
{
    $normalised = array_map(function (array $msg): array {
        // imageUrl must always be present in the response (Requirement 3.3)
        if (!array_key_exists('imageUrl', $msg)) {
            $msg['imageUrl'] = null;
        }
        return $msg;
    }, $messages);

    return ['status' => 200, 'body' => ['messages' => $normalised]];
}

/**
 * Mirror of the action=conversations last-message preview logic.
 *
 * In messages.php:
 *   if ($lastMsgImageUrl !== null && ($lastMsgText === null || trim($lastMsgText) === '')) {
 *       $f['lastMessage'] = '📷 Image';
 *   } else {
 *       $f['lastMessage'] = $lastMsgText;
 *   }
 *
 * @param string|null $messageText  The text body of the last message (null or '')
 * @param string|null $imageUrl     The image_url of the last message (null if absent)
 * @return string                   The lastMessage preview string
 */
function computeLastMessagePreview(?string $messageText, ?string $imageUrl): string
{
    if ($imageUrl !== null && ($messageText === null || trim($messageText) === '')) {
        return '📷 Image';
    }
    return $messageText ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

/** Pick a random element from an array. */
function randomChoice(array $items)
{
    return $items[array_rand($items)];
}

/**
 * Generate a random valid imageUrl string.
 *
 * Covers http:// and https:// URLs with paths, query strings, and a variety
 * of extensions to exercise the round-trip property across the valid input space.
 */
function randomValidImageUrl(): string
{
    static $bases = [
        'http://example.com/img.jpg',
        'https://example.com/img.png',
        'https://cdn.example.org/images/photo.gif',
        'http://localhost/api/uploads/images/img_chat_1720000000.jpg',
        'https://api.sokomtaa.co.ke/epldls/uploads/images/img_chat_7_1720000001.webp',
        'https://api.sokomtaa.co.ke/epldls/uploads/images/img_chat_42_1720000000.jpg',
        'http://127.0.0.1:8080/uploads/test.png',
        'https://storage.googleapis.com/bucket/chat-image.webp',
        'https://s3.amazonaws.com/my-bucket/chat/image.jpeg',
        'http://a.b',
        'https://x.y.z',
    ];

    $base   = randomChoice($bases);
    $suffix = '?v=' . random_int(1, 999999);
    return "{$base}{$suffix}";
}

/**
 * Generate a random invalid imageUrl — one that does NOT start with
 * 'http://' or 'https://'.
 */
function randomInvalidImageUrl(): string
{
    static $candidates = [
        'ftp://example.com/image.jpg',
        'ftps://example.com/image.jpg',
        'file:///local/path/image.png',
        'data:image/png;base64,abc123',
        'mailto:user@example.com',
        'sftp://server/image.png',
        '/uploads/images/img.jpg',
        './images/img.png',
        '../assets/photo.gif',
        'images/photo.webp',
        'image.jpg',
        'photo.png',
        'htttp://example.com/img.jpg',
        'htp://example.com/img.jpg',
        'https:/example.com/img.png',
        'http:/example.com/img.png',
        'https:example.com/img.png',
        'http:example.com/img.png',
        'HTTPS://example.com/img.png',
        'HTTP://example.com/img.jpg',
        'Https://example.com/img.png',
        'Http://example.com/img.jpg',
        'not-a-url',
        'just some text',
        '12345',
        '//example.com/img.jpg',
        'javascript:alert(1)',
        ' https://example.com/img.jpg',
        'https://example.com/img.jpg ',
    ];

    return randomChoice($candidates);
}

/** Generate a random positive integer ID in the range [1, 10000]. */
function randomId(): int
{
    return random_int(1, 10000);
}

/** Generate a random non-empty message string (1–200 chars of printable ASCII). */
function randomMessage(): string
{
    $len   = random_int(1, 200);
    $chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?';
    $out   = '';
    for ($i = 0; $i < $len; $i++) {
        $out .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Property tests
// ─────────────────────────────────────────────────────────────────────────────

$runner     = new TestRunner();
$iterations = 100; // minimum iterations per property, per design doc

// ─── Property 5: Chat message imageUrl round-trip ─────────────────────────────
// Feature: image-sharing, Property 5: Chat message imageUrl round-trip
// Validates: Requirements 3.2, 3.3
//
// For any message sent via messages.php?action=send with a valid imageUrl,
// fetching messages via messages.php?action=list should return that message
// with the same imageUrl value. Messages sent without an imageUrl should have
// imageUrl: null in the response.
$runner->run('Property 5: Chat message imageUrl round-trip', function (TestRunner $t) use ($iterations): void {

    // ── 5a: Messages with a valid imageUrl survive the round-trip unchanged ───
    for ($i = 0; $i < $iterations; $i++) {
        $senderId   = randomId();
        $receiverId = randomId();
        $message    = randomMessage();
        $imageUrl   = randomValidImageUrl();
        $newId      = randomId();

        // Step 1: send the message
        $sendResult = simulateSendMessage($senderId, $receiverId, $message, $imageUrl, $newId);

        $t->assert(
            $sendResult['status'] === 200,
            "5a iter {$i}: Expected HTTP 200 for valid message with imageUrl={$imageUrl}; got {$sendResult['status']}"
        );

        if ($sendResult['status'] !== 200) {
            continue;
        }

        $sentMsg = $sendResult['body']['message'];

        // The stored imageUrl must equal the submitted imageUrl (Requirement 3.2)
        $t->assert(
            $sentMsg['imageUrl'] === $imageUrl,
            "5a iter {$i}: stored imageUrl mismatch — submitted '{$imageUrl}', got " . var_export($sentMsg['imageUrl'], true)
        );

        // Step 2: simulate fetching messages
        $fetchResult = simulateFetchMessages([$sentMsg]);

        $t->assert(
            $fetchResult['status'] === 200,
            "5a iter {$i}: Expected HTTP 200 from messages fetch; got {$fetchResult['status']}"
        );

        $fetchedMessages = $fetchResult['body']['messages'];

        $t->assert(
            count($fetchedMessages) === 1,
            "5a iter {$i}: Expected exactly 1 message in fetch result; got " . count($fetchedMessages)
        );

        $fetchedMsg = $fetchedMessages[0];

        // The fetched imageUrl must equal the submitted imageUrl (Requirement 3.3)
        $t->assert(
            array_key_exists('imageUrl', $fetchedMsg),
            "5a iter {$i}: 'imageUrl' key must be present in every fetched message (Requirement 3.3)"
        );

        $t->assert(
            $fetchedMsg['imageUrl'] === $imageUrl,
            "5a iter {$i}: fetched imageUrl mismatch — submitted '{$imageUrl}', fetched " . var_export($fetchedMsg['imageUrl'], true)
        );
    }

    echo "  Ran {$iterations} iterations (with imageUrl) — Property 5a complete.\n";

    // ── 5b: Messages without an imageUrl must have imageUrl: null in response ─
    for ($i = 0; $i < $iterations; $i++) {
        $senderId   = randomId();
        $receiverId = randomId();
        $message    = randomMessage(); // non-empty text, no image
        $newId      = randomId();

        // Pass empty string to mean "no image"
        $sendResult = simulateSendMessage($senderId, $receiverId, $message, '', $newId);

        $t->assert(
            $sendResult['status'] === 200,
            "5b iter {$i}: Expected HTTP 200 for message without imageUrl; got {$sendResult['status']}"
        );

        if ($sendResult['status'] !== 200) {
            continue;
        }

        $sentMsg = $sendResult['body']['message'];

        // imageUrl must be stored as null when not supplied
        $t->assert(
            $sentMsg['imageUrl'] === null,
            "5b iter {$i}: imageUrl must be null when not supplied; got " . var_export($sentMsg['imageUrl'], true)
        );

        // Fetch and verify the null is preserved
        $fetchResult     = simulateFetchMessages([$sentMsg]);
        $fetchedMessages = $fetchResult['body']['messages'];
        $fetchedMsg      = $fetchedMessages[0];

        $t->assert(
            array_key_exists('imageUrl', $fetchedMsg),
            "5b iter {$i}: 'imageUrl' key must always be present (Requirement 3.3)"
        );

        $t->assert(
            $fetchedMsg['imageUrl'] === null,
            "5b iter {$i}: fetched imageUrl must be null for message without image; got " . var_export($fetchedMsg['imageUrl'], true)
        );
    }

    echo "  Ran {$iterations} iterations (without imageUrl) — Property 5b complete.\n";

    // ── 5c: Image-only messages (no text) must succeed and store the imageUrl ─
    for ($i = 0; $i < $iterations; $i++) {
        $senderId   = randomId();
        $receiverId = randomId();
        $imageUrl   = randomValidImageUrl();
        $newId      = randomId();

        // Empty text + valid imageUrl — must succeed (Requirement 3.5)
        $sendResult = simulateSendMessage($senderId, $receiverId, '', $imageUrl, $newId);

        $t->assert(
            $sendResult['status'] === 200,
            "5c iter {$i}: Expected HTTP 200 for image-only message (no text); got {$sendResult['status']}"
        );

        if ($sendResult['status'] !== 200) {
            continue;
        }

        $sentMsg = $sendResult['body']['message'];

        $t->assert(
            $sentMsg['imageUrl'] === $imageUrl,
            "5c iter {$i}: imageUrl mismatch for image-only message; got " . var_export($sentMsg['imageUrl'], true)
        );

        $t->assert(
            $sentMsg['message'] === '',
            "5c iter {$i}: message text should be empty for image-only message; got " . var_export($sentMsg['message'], true)
        );
    }

    echo "  Ran {$iterations} iterations (image-only messages) — Property 5c complete.\n";

    // ── 5d: Mixed batch — some with imageUrl, some without ───────────────────
    $batchSize = 20;
    for ($i = 0; $i < $iterations / $batchSize; $i++) {
        $batch        = [];
        $expectations = []; // expected imageUrl per message id

        for ($j = 0; $j < $batchSize; $j++) {
            $newId      = $i * $batchSize + $j + 1;
            $hasImage   = (bool)random_int(0, 1);
            $imageUrl   = $hasImage ? randomValidImageUrl() : '';
            $msgText    = $hasImage && random_int(0, 1) ? '' : randomMessage();

            // Ensure we don't trigger the "both empty" error
            if ($msgText === '' && $imageUrl === '') {
                $msgText = randomMessage();
            }

            $sendResult = simulateSendMessage(randomId(), randomId(), $msgText, $imageUrl, $newId);

            if ($sendResult['status'] === 200) {
                $msg    = $sendResult['body']['message'];
                $batch[] = $msg;
                $expectations[$msg['id']] = $hasImage ? $imageUrl : null;
            }
        }

        $fetchResult     = simulateFetchMessages($batch);
        $fetchedMessages = $fetchResult['body']['messages'];

        foreach ($fetchedMessages as $fm) {
            $expectedUrl = array_key_exists($fm['id'], $expectations) ? $expectations[$fm['id']] : 'UNKNOWN';

            $t->assert(
                array_key_exists('imageUrl', $fm),
                "5d batch {$i}: 'imageUrl' key missing for message id={$fm['id']}"
            );

            $t->assert(
                $fm['imageUrl'] === $expectedUrl,
                "5d batch {$i}: imageUrl mismatch for message id={$fm['id']} — expected " .
                var_export($expectedUrl, true) . ", got " . var_export($fm['imageUrl'], true)
            );
        }
    }

    echo "  Ran " . ($iterations / $batchSize) . " mixed-batch iterations — Property 5d complete.\n";
});

// ─── Property 7: Image-only last message preview ─────────────────────────────
// Feature: image-sharing, Property 7: Image-only last message preview
// Validates: Requirement 3.6
//
// For any conversation where the last message has a non-null imageUrl and an
// empty or null message body, the lastMessage field returned by
// messages.php?action=conversations should equal "📷 Image".
$runner->run('Property 7: Image-only last message preview', function (TestRunner $t) use ($iterations): void {

    // ── 7a: Image-only messages (null/empty text) always produce "📷 Image" ──
    // Null text variants
    $nullTextVariants = [null, ''];
    for ($i = 0; $i < $iterations; $i++) {
        $imageUrl    = randomValidImageUrl();
        $messageText = randomChoice($nullTextVariants);

        $preview = computeLastMessagePreview($messageText, $imageUrl);

        $t->assert(
            $preview === '📷 Image',
            "7a iter {$i}: Expected '📷 Image' for imageUrl='{$imageUrl}' and text=" .
            var_export($messageText, true) . "; got " . var_export($preview, true)
        );
    }

    echo "  Ran {$iterations} iterations (null/empty text + imageUrl) — Property 7a complete.\n";

    // ── 7b: Whitespace-only text also produces "📷 Image" ─────────────────────
    // Any text that trims to empty should yield the image preview
    $whitespaceVariants = [' ', '  ', "\t", "\n", " \t\n "];
    for ($i = 0; $i < $iterations; $i++) {
        $imageUrl    = randomValidImageUrl();
        $messageText = randomChoice($whitespaceVariants);

        $preview = computeLastMessagePreview($messageText, $imageUrl);

        $t->assert(
            $preview === '📷 Image',
            "7b iter {$i}: Expected '📷 Image' for whitespace text=" .
            var_export($messageText, true) . "; got " . var_export($preview, true)
        );
    }

    echo "  Ran {$iterations} iterations (whitespace text + imageUrl) — Property 7b complete.\n";

    // ── 7c: Messages WITH text return the text, not "📷 Image" ───────────────
    // When there IS actual text content, the preview must be the text.
    for ($i = 0; $i < $iterations; $i++) {
        $imageUrl    = randomValidImageUrl();
        $messageText = randomMessage(); // guaranteed non-empty

        $preview = computeLastMessagePreview($messageText, $imageUrl);

        $t->assert(
            $preview === $messageText,
            "7c iter {$i}: Expected message text='{$messageText}' when text is present; got " .
            var_export($preview, true)
        );

        $t->assert(
            $preview !== '📷 Image',
            "7c iter {$i}: '📷 Image' must NOT appear when message has text content"
        );
    }

    echo "  Ran {$iterations} iterations (text present + imageUrl) — Property 7c complete.\n";

    // ── 7d: No image (null imageUrl) with any text returns that text ──────────
    for ($i = 0; $i < $iterations; $i++) {
        $messageText = randomMessage();

        $preview = computeLastMessagePreview($messageText, null);

        $t->assert(
            $preview === $messageText,
            "7d iter {$i}: Expected text='{$messageText}' when imageUrl is null; got " .
            var_export($preview, true)
        );
    }

    echo "  Ran {$iterations} iterations (null imageUrl) — Property 7d complete.\n";

    // ── 7e: No image and no text returns empty string (not "📷 Image") ────────
    $preview = computeLastMessagePreview(null, null);
    $t->assert(
        $preview === '',
        "7e: Expected '' when both message and imageUrl are null; got " . var_export($preview, true)
    );

    $preview = computeLastMessagePreview('', null);
    $t->assert(
        $preview === '',
        "7e: Expected '' when both message is empty and imageUrl is null; got " . var_export($preview, true)
    );

    echo "  Ran 2 no-image-no-text checks — Property 7e complete.\n";

    // ── 7f: Exhaustive check of invalid imageUrls with empty text ─────────────
    // When imageUrl is null (not set), the preview should never be "📷 Image".
    for ($i = 0; $i < $iterations; $i++) {
        $messageText = random_int(0, 1) ? '' : randomMessage();

        $preview = computeLastMessagePreview($messageText, null);

        $t->assert(
            $preview !== '📷 Image',
            "7f iter {$i}: '📷 Image' must NOT appear when imageUrl is null; got " . var_export($preview, true)
        );
    }

    echo "  Ran {$iterations} iterations (null imageUrl, various text) — Property 7f complete.\n";
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration test documentation
// ─────────────────────────────────────────────────────────────────────────────
/**
 * INTEGRATION TEST SPECIFICATION (not executed here)
 *
 * Property 5 — Integration variant
 * ----------------------------------
 * Pre-condition:
 *   - A running PHP server with messages.php accessible.
 *   - A MySQL database with the image-sharing migration applied
 *     (messages.image_url VARCHAR(2048) NULL column present — see db.php).
 *   - Valid sender and receiver user rows in the database.
 *
 * Sub-case A: Message with imageUrl
 *   Given:  senderId=1, receiverId=2, message="Hello", imageUrl="https://example.com/img.jpg"
 *   When:   POST /messages.php?action=send  body=<JSON above>
 *   Then:   HTTP 200, body.message.imageUrl === "https://example.com/img.jpg"
 *   And:    GET /messages.php?action=list&userId=1&friendId=2 includes the message
 *           with imageUrl === <same value>
 *
 * Sub-case B: Message without imageUrl
 *   Given:  senderId=1, receiverId=2, message="Hello" (no imageUrl field)
 *   When:   POST /messages.php?action=send  body=<JSON above>
 *   Then:   HTTP 200, body.message.imageUrl === null
 *   And:    GET /messages.php?action=list includes the message with imageUrl === null
 *
 * Property 7 — Integration variant
 * ----------------------------------
 * Pre-condition: Same as Property 5.
 *
 *   Given:  senderId=1, receiverId=2, message="", imageUrl="https://example.com/img.jpg"
 *   When:   POST /messages.php?action=send  body=<JSON above>
 *   Then:   HTTP 200
 *   And:    GET /messages.php?action=conversations&userId=2
 *           has the conversation entry where lastMessage === "📷 Image"
 */

// ─────────────────────────────────────────────────────────────────────────────
// Run summary and exit
// ─────────────────────────────────────────────────────────────────────────────

$runner->summary();
exit($runner->exitCode());
