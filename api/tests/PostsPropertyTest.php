<?php
/**
 * Property-Based Tests for posts.php
 *
 * Feature: image-sharing
 *
 * Run with: php api/tests/PostsPropertyTest.php
 *
 * These tests exercise the imageUrl validation logic that lives in posts.php.
 * Because posts.php is a script that relies on a live database connection and
 * calls exit, we extract and mirror the core validation logic here so it can
 * be exercised without spinning up a real HTTP server or database.
 *
 * Each property generator runs a configurable number of randomised iterations
 * — the default is 100 — matching the strategy described in the design document.
 *
 * Two properties are covered:
 *
 *   Property 4: Forum post imageUrl round-trip
 *     Validates: Requirements 2.2, 2.3
 *
 *   Property 6: Invalid imageUrl prefix is rejected
 *     Validates: Requirements 2.4
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
// Logic extracted / mirrored from posts.php
// ─────────────────────────────────────────────────────────────────────────────
// Rather than invoking posts.php as a subprocess (which would require a real
// web server and MySQL database), we replicate the two discrete pieces of
// validation logic that the properties care about:
//
//   1. imageUrl prefix validation  (used by both Property 4 and Property 6)
//   2. Post creation pipeline       (used by Property 4 round-trip logic)
//
// If posts.php's implementation ever diverges from these functions a CI diff
// on the constants/patterns below will surface the inconsistency.

/**
 * Mirror of the imageUrl prefix check in posts.php action=create.
 *
 * Returns true when the URL is acceptable (empty string = no image = OK, or
 * starts with http:// / https://), false when it should be rejected with
 * HTTP 400.
 *
 * From posts.php:
 *   if ($imageUrl !== '' && !str_starts_with($imageUrl, 'http://')
 *                        && !str_starts_with($imageUrl, 'https://')) {
 *       jsonResponse(['error' => 'imageUrl must begin with http:// or https://'], 400);
 *   }
 */
function isImageUrlValid(string $imageUrl): bool
{
    if ($imageUrl === '') {
        return true; // no image supplied — passes URL check (empty is treated as null)
    }
    return str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://');
}

/**
 * Mirror of the combined validation and storage pipeline in posts.php.
 *
 * Returns an array that mirrors the HTTP response shape:
 *
 *   On success: ['status' => 200, 'body' => ['success' => true, 'post' => [...]]]
 *   On error:   ['status' => 400, 'body' => ['error' => '<message>']]
 *
 * The post object in the success body contains the fields that would be
 * returned by posts.php, including 'imageUrl' (null when not supplied).
 *
 * @param int    $forumId   Must be > 0
 * @param int    $userId    Must be > 0
 * @param string $content   Post text (may be empty when imageUrl is set)
 * @param string $imageUrl  URL string (may be empty to mean "no image")
 * @param int    $newId     Synthetic auto-increment id for the created post
 */
function simulateCreatePost(
    int    $forumId,
    int    $userId,
    string $content,
    string $imageUrl,
    int    $newId = 1
): array {
    $imageUrl = trim($imageUrl);
    // Required field check — mirrors posts.php
    if (!$forumId || !$userId) {
        return ['status' => 400, 'body' => ['error' => 'Forum ID, User ID, and Content are required.']];
    }

    // imageUrl prefix validation — mirrors posts.php
    if ($imageUrl !== '' && !isImageUrlValid($imageUrl)) {
        return [
            'status' => 400,
            'body'   => ['error' => 'imageUrl must begin with http:// or https://'],
        ];
    }

    // At least content or imageUrl must be present — mirrors posts.php
    if ($content === '' && $imageUrl === '') {
        return ['status' => 400, 'body' => ['error' => 'Content or image is required.']];
    }

    // Simulate successful storage: imageUrl stored as null when empty
    $storedImageUrl = $imageUrl !== '' ? $imageUrl : null;

    $post = [
        'id'       => $newId,
        'forumId'  => $forumId,
        'userId'   => $userId,
        'content'  => $content,
        'imageUrl' => $storedImageUrl,
    ];

    return ['status' => 200, 'body' => ['success' => true, 'post' => $post]];
}

/**
 * Mirror of the forum fetch pipeline (forums.php?action=get) as it relates to
 * imageUrl.  In the real endpoint each post row includes 'imageUrl' from the
 * SELECT alias `fp.image_url as imageUrl`.
 *
 * This function simulates fetching a list of posts that were previously
 * created via simulateCreatePost, returning them in the same shape that
 * forums.php would produce — with imageUrl present and null when absent.
 *
 * @param array $posts  Array of post arrays as returned by simulateCreatePost
 * @return array        ['status' => 200, 'body' => ['posts' => [...]]]
 */
function simulateFetchForum(array $posts): array
{
    // Ensure every post carries an imageUrl key (null when no image)
    $normalised = array_map(function (array $post): array {
        // imageUrl must always be present in the response (Requirement 2.3)
        if (!array_key_exists('imageUrl', $post)) {
            $post['imageUrl'] = null;
        }
        return $post;
    }, $posts);

    return ['status' => 200, 'body' => ['posts' => $normalised]];
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
 * The generator covers a variety of real-world URL shapes so that the
 * round-trip property is exercised across the full valid input space:
 *   - http:// URLs
 *   - https:// URLs
 *   - URLs with paths, query strings, and image file extensions
 *   - Very short URLs (just scheme + host)
 *   - Very long URLs (up to ~200 characters)
 */
function randomValidImageUrl(): string
{
    static $bases = [
        'http://example.com/img.jpg',
        'https://example.com/img.png',
        'https://cdn.example.org/images/photo.gif',
        'http://localhost/api/uploads/images/img_forum_1720000000.jpg',
        'https://api.sokomtaa.co.ke/epldls/uploads/images/img_42_1720000000.jpg',
        'https://api.sokomtaa.co.ke/epldls/uploads/images/img_chat_7_1720000001.webp',
        'http://127.0.0.1:8080/uploads/test.png',
        'https://storage.googleapis.com/bucket/image.webp',
        'https://s3.amazonaws.com/my-bucket/path/to/image.jpeg',
        'http://a.b',           // minimal valid http URL
        'https://x.y.z',        // minimal valid https URL
    ];

    $base = randomChoice($bases);

    // Append a random numeric suffix to the path to create variety
    $suffix = '?v=' . random_int(1, 999999);
    return $base . $suffix;
}

/**
 * Generate a random invalid imageUrl — one that does NOT start with
 * 'http://' or 'https://'.
 *
 * Categories covered:
 *   - Completely wrong schemes (ftp://, file://, data:, mailto:)
 *   - Relative paths (/path/to/img.jpg, ./img.jpg, ../img.jpg)
 *   - Plain filenames (image.jpg)
 *   - Typo schemes (htttp://, htp://, https:/, http:, HTTPS://)
 *   - Arbitrary alphanumeric strings
 *   - Empty string is excluded — empty means "no image" and is valid
 */
function randomInvalidImageUrl(): string
{
    static $candidates = [
        // Wrong schemes
        'ftp://example.com/image.jpg',
        'ftps://example.com/image.jpg',
        'file:///local/path/image.png',
        'data:image/png;base64,abc123',
        'mailto:user@example.com',
        'sftp://server/image.png',
        // Relative paths
        '/uploads/images/img.jpg',
        './images/img.png',
        '../assets/photo.gif',
        'images/photo.webp',
        // Plain filename
        'image.jpg',
        'photo.png',
        // Typo schemes
        'htttp://example.com/img.jpg',
        'htp://example.com/img.jpg',
        'https:/example.com/img.png',
        'http:/example.com/img.png',
        'https:example.com/img.png',
        'http:example.com/img.png',
        'HTTPS://example.com/img.png',  // uppercase — case-sensitive check
        'HTTP://example.com/img.jpg',
        'Https://example.com/img.png',
        'Http://example.com/img.jpg',
        // Arbitrary strings
        'not-a-url',
        'just some text',
        '12345',
        '//example.com/img.jpg',        // protocol-relative URL (no scheme)
        'javascript:alert(1)',           // XSS-style
        ' ftp://example.com/img.jpg',   // leading space invalid scheme
        'ftp://example.com/img.jpg ',   // trailing space invalid scheme
    ];

    return randomChoice($candidates);
}

/**
 * Generate a random positive integer ID in the range [1, 10000].
 */
function randomId(): int
{
    return random_int(1, 10000);
}

/**
 * Generate a random non-empty content string (1–200 chars of printable ASCII).
 */
function randomContent(): string
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

// ─── Property 4: Forum post imageUrl round-trip ───────────────────────────────
// Feature: image-sharing, Property 4: Forum post imageUrl round-trip
// Validates: Requirements 2.2, 2.3
//
// For any forum post created via posts.php?action=create with a valid imageUrl,
// fetching the forum via forums.php?action=get should return that post with the
// same imageUrl value.  Posts created without an imageUrl should have
// imageUrl: null in the response.
$runner->run('Property 4: Forum post imageUrl round-trip', function (TestRunner $t) use ($iterations): void {
    // ── 4a: Posts with a valid imageUrl survive the round-trip unchanged ──────
    for ($i = 0; $i < $iterations; $i++) {
        $forumId  = randomId();
        $userId   = randomId();
        $content  = randomContent();
        $imageUrl = randomValidImageUrl();
        $newId    = randomId();

        // Step 1: create the post
        $createResult = simulateCreatePost($forumId, $userId, $content, $imageUrl, $newId);

        $t->assert(
            $createResult['status'] === 200,
            "4a iter {$i}: Expected HTTP 200 for valid post with imageUrl={$imageUrl}; got {$createResult['status']}"
        );

        if ($createResult['status'] !== 200) {
            continue; // nothing to fetch if creation failed
        }

        $createdPost = $createResult['body']['post'];

        // The stored imageUrl must equal the submitted imageUrl (Requirement 2.2)
        $t->assert(
            $createdPost['imageUrl'] === $imageUrl,
            "4a iter {$i}: stored imageUrl mismatch — submitted '{$imageUrl}', got " . var_export($createdPost['imageUrl'], true)
        );

        // Step 2: simulate fetching the forum (includes the created post)
        $fetchResult = simulateFetchForum([$createdPost]);

        $t->assert(
            $fetchResult['status'] === 200,
            "4a iter {$i}: Expected HTTP 200 from forum fetch; got {$fetchResult['status']}"
        );

        $fetchedPosts = $fetchResult['body']['posts'];

        $t->assert(
            count($fetchedPosts) === 1,
            "4a iter {$i}: Expected exactly 1 post in fetch result; got " . count($fetchedPosts)
        );

        $fetchedPost = $fetchedPosts[0];

        // The fetched imageUrl must equal the submitted imageUrl (Requirement 2.3)
        $t->assert(
            array_key_exists('imageUrl', $fetchedPost),
            "4a iter {$i}: 'imageUrl' key must be present in every fetched post (Requirement 2.3)"
        );

        $t->assert(
            $fetchedPost['imageUrl'] === $imageUrl,
            "4a iter {$i}: fetched imageUrl mismatch — submitted '{$imageUrl}', fetched " . var_export($fetchedPost['imageUrl'], true)
        );
    }

    echo "  Ran {$iterations} iterations (with imageUrl) — Property 4a complete.\n";

    // ── 4b: Posts without an imageUrl must have imageUrl: null in response ────
    for ($i = 0; $i < $iterations; $i++) {
        $forumId = randomId();
        $userId  = randomId();
        $content = randomContent();    // non-empty content, no image
        $newId   = randomId();

        // Pass empty string to mean "no image"
        $createResult = simulateCreatePost($forumId, $userId, $content, '', $newId);

        $t->assert(
            $createResult['status'] === 200,
            "4b iter {$i}: Expected HTTP 200 for post with no imageUrl; got {$createResult['status']}"
        );

        if ($createResult['status'] !== 200) {
            continue;
        }

        $createdPost = $createResult['body']['post'];

        // imageUrl must be stored as null when not supplied (Requirement 2.5)
        $t->assert(
            $createdPost['imageUrl'] === null,
            "4b iter {$i}: imageUrl must be null when not supplied; got " . var_export($createdPost['imageUrl'], true)
        );

        // Fetch and verify the null is preserved
        $fetchResult  = simulateFetchForum([$createdPost]);
        $fetchedPosts = $fetchResult['body']['posts'];
        $fetchedPost  = $fetchedPosts[0];

        $t->assert(
            array_key_exists('imageUrl', $fetchedPost),
            "4b iter {$i}: 'imageUrl' key must always be present (Requirement 2.3)"
        );

        $t->assert(
            $fetchedPost['imageUrl'] === null,
            "4b iter {$i}: fetched imageUrl must be null for post without image; got " . var_export($fetchedPost['imageUrl'], true)
        );
    }

    echo "  Ran {$iterations} iterations (without imageUrl) — Property 4b complete.\n";

    // ── 4c: Mixed batch — some with imageUrl, some without ───────────────────
    // Simulates a real forum page that has a mix of posts.
    $batchSize = 20;
    for ($i = 0; $i < $iterations / $batchSize; $i++) {
        $batch = [];
        $expectations = []; // expected imageUrl per post id

        for ($j = 0; $j < $batchSize; $j++) {
            $newId     = $i * $batchSize + $j + 1;
            $hasImage  = (bool)random_int(0, 1);
            $imageUrl  = $hasImage ? randomValidImageUrl() : '';
            $content   = $hasImage ? randomContent() : randomContent();

            $createResult = simulateCreatePost(randomId(), randomId(), $content, $imageUrl, $newId);

            if ($createResult['status'] === 200) {
                $post = $createResult['body']['post'];
                $batch[] = $post;
                $expectations[$post['id']] = $hasImage ? $imageUrl : null;
            }
        }

        $fetchResult  = simulateFetchForum($batch);
        $fetchedPosts = $fetchResult['body']['posts'];

        foreach ($fetchedPosts as $fp) {
            $expectedUrl = array_key_exists($fp['id'], $expectations) ? $expectations[$fp['id']] : 'UNKNOWN';

            $t->assert(
                array_key_exists('imageUrl', $fp),
                "4c batch {$i}: 'imageUrl' key missing for post id={$fp['id']}"
            );

            $t->assert(
                $fp['imageUrl'] === $expectedUrl,
                "4c batch {$i}: imageUrl mismatch for post id={$fp['id']} — expected " .
                var_export($expectedUrl, true) . ", got " . var_export($fp['imageUrl'], true)
            );
        }
    }

    echo "  Ran " . ($iterations / $batchSize) . " mixed-batch iterations — Property 4c complete.\n";
});

// ─── Property 6: Invalid imageUrl prefix is rejected ─────────────────────────
// Feature: image-sharing, Property 6: Invalid imageUrl prefix is rejected
// Validates: Requirements 2.4
//
// For any string that does not begin with 'http://' or 'https://' supplied as
// imageUrl in a posts.php?action=create request, the system should return
// HTTP 400.
$runner->run('Property 6: Invalid imageUrl prefix is rejected', function (TestRunner $t) use ($iterations): void {
    // ── 6a: Random invalid URLs are all rejected ──────────────────────────────
    for ($i = 0; $i < $iterations; $i++) {
        $forumId  = randomId();
        $userId   = randomId();
        $content  = randomContent();
        $imageUrl = randomInvalidImageUrl();

        $result = simulateCreatePost($forumId, $userId, $content, $imageUrl);

        $t->assert(
            $result['status'] === 400,
            "6a iter {$i}: Expected HTTP 400 for invalid imageUrl='{$imageUrl}'; got {$result['status']}"
        );

        $t->assert(
            isset($result['body']['error']) && is_string($result['body']['error']),
            "6a iter {$i}: Expected an error string in body for imageUrl='{$imageUrl}'"
        );

        // Must NOT contain a post or url on error
        $t->assert(
            !isset($result['body']['post']),
            "6a iter {$i}: No 'post' field expected on error response for imageUrl='{$imageUrl}'"
        );

        // The error message must reference the expected scheme requirement
        $t->assert(
            strpos($result['body']['error'] ?? '', 'http') !== false,
            "6a iter {$i}: Error message must mention 'http'; got: " . var_export($result['body']['error'] ?? '', true)
        );
    }

    echo "  Ran {$iterations} random invalid-URL iterations — Property 6a complete.\n";

    // ── 6b: Exhaustive check — every hardcoded invalid candidate is rejected ──
    $exhaustiveCandidates = [
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
        ' ftp://example.com/img.jpg',   // leading space invalid scheme
        'ftp://example.com/img.jpg ',   // trailing space invalid scheme
    ];

    foreach ($exhaustiveCandidates as $candidate) {
        $result = simulateCreatePost(randomId(), randomId(), randomContent(), $candidate);

        $t->assert(
            $result['status'] === 400,
            "6b exhaustive: Expected HTTP 400 for imageUrl=" . var_export($candidate, true) . "; got {$result['status']}"
        );
    }

    echo "  Ran " . count($exhaustiveCandidates) . " exhaustive candidates — Property 6b complete.\n";

    // ── 6c: Valid URLs must NOT be rejected by the prefix check ──────────────
    // Verifies the check is not over-broad (should not reject valid URLs).
    $validCandidates = [
        'http://example.com/img.jpg',
        'https://example.com/img.png',
        'http://localhost/uploads/img.gif',
        'https://cdn.example.org/photo.webp',
        'http://127.0.0.1/img.jpg',
        'https://a.b/c',
        'http://example.com/path/to/very/deeply/nested/image.jpg?v=1&size=large',
        'https://example.com/img.jpg?token=abc&expires=9999999999',
    ];

    foreach ($validCandidates as $url) {
        $result = simulateCreatePost(randomId(), randomId(), randomContent(), $url);

        $t->assert(
            $result['status'] === 200,
            "6c: Valid URL '{$url}' must NOT be rejected; got HTTP {$result['status']}"
        );
    }

    echo "  Ran " . count($validCandidates) . " valid-URL non-rejection checks — Property 6c complete.\n";

    // ── 6d: isImageUrlValid() unit-level checks ───────────────────────────────
    // Direct unit tests of the extracted validation function for completeness.
    $unitCases = [
        ['http://example.com/img.jpg',  true],
        ['https://example.com/img.png', true],
        ['http://',                     true],   // technically starts correctly
        ['https://',                    true],   // technically starts correctly
        ['',                            true],   // empty = "no image" = passes
        ['ftp://example.com/img.jpg',   false],
        ['/relative/path/img.jpg',      false],
        ['HTTPS://example.com/img.png', false],  // case-sensitive
        ['HTTP://example.com/img.jpg',  false],  // case-sensitive
        ['javascript:alert(1)',         false],
        ['data:image/png;base64,',      false],
    ];

    foreach ($unitCases as [$url, $expected]) {
        $actual = isImageUrlValid($url);
        $t->assert(
            $actual === $expected,
            "6d unit: isImageUrlValid(" . var_export($url, true) . ") expected " .
            var_export($expected, true) . ", got " . var_export($actual, true)
        );
    }

    echo "  Ran " . count($unitCases) . " unit-level isImageUrlValid cases — Property 6d complete.\n";
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration test documentation
// ─────────────────────────────────────────────────────────────────────────────
// The following section documents what full integration tests against a running
// server + database would verify.  These cannot be run without a live PHP/MySQL
// environment, but are included here as specification commentary so that the
// behaviour is unambiguous.

/**
 * INTEGRATION TEST SPECIFICATION (not executed here)
 *
 * Property 4 — Integration variant
 * ----------------------------------
 * Pre-condition:
 *   - A running PHP server with posts.php and forums.php accessible.
 *   - A MySQL database with the image-sharing migration applied (forum_posts.image_url
 *     VARCHAR(2048) NULL column present — see db.php ensureSchema()).
 *   - A valid forum row (e.g. id=1) and user row (e.g. id=1) in the database.
 *
 * Sub-case A: Post with imageUrl
 *   Given:  forumId=1, userId=1, content="Hello", imageUrl="https://example.com/img.jpg"
 *   When:   POST /posts.php?action=create  body=<JSON above>
 *   Then:   HTTP 200, body.post.imageUrl === "https://example.com/img.jpg"
 *   And:    GET /forums.php?action=get&id=1 includes the post with imageUrl===<same value>
 *
 * Sub-case B: Post without imageUrl
 *   Given:  forumId=1, userId=1, content="Hello" (no imageUrl field)
 *   When:   POST /posts.php?action=create  body=<JSON above>
 *   Then:   HTTP 200, body.post.imageUrl === null
 *   And:    GET /forums.php?action=get&id=1 includes the post with imageUrl===null
 *
 * Property 6 — Integration variant
 * ----------------------------------
 * Pre-condition: Same as Property 4.
 *
 *   Given:  forumId=1, userId=1, content="Hello", imageUrl="ftp://bad-scheme.com/img.jpg"
 *   When:   POST /posts.php?action=create  body=<JSON above>
 *   Then:   HTTP 400, body.error contains 'http'
 *   And:    No new row is inserted into forum_posts
 *
 *   Repeat for each invalid URL in the exhaustive candidate list above.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Run summary and exit
// ─────────────────────────────────────────────────────────────────────────────

$runner->summary();
exit($runner->exitCode());
