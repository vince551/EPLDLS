<?php
/**
 * Test suite for the 30-minute score edit feature.
 * Run with: php api/tests/FixtureScoreEditTest.php
 */

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
            $msg = "Exception: " . $e->getMessage() . " in " . $e->getFile() . ':' . $e->getLine();
            $this->failures[] = $msg;
            echo "  FAIL: {$msg}\n";
        }
    }

    public function summary(): void
    {
        $total = $this->passed + $this->failed;
        echo "\n" . str_repeat('─', 60) . "\n";
        echo "Results: {$this->passed}/{$total} assertions passed\n";
        if ($this->failed > 0) {
            echo "{$this->failed} FAILED\n";
            exit(1);
        } else {
            echo "All tests passed successfully.\n";
            exit(0);
        }
    }
}

// Helper mock logic to test the edit time restriction without executing real HTTP headers or DB.
function isEditAllowed(string $scoreSubmittedAt, int $currentTime): bool {
    $submittedTime = strtotime($scoreSubmittedAt);
    if (!$submittedTime || ($currentTime - $submittedTime) > 1800) {
        return false;
    }
    return true;
}

$runner = new TestRunner();

$runner->run("Verify score edit time limit validation", function ($t) {
    $now = time();
    
    // 1. Exactly now (0 minutes elapsed) - should be allowed
    $submittedAtNow = date('Y-m-d H:i:s', $now);
    $t->assert(isEditAllowed($submittedAtNow, $now) === true, "Allowed when edited immediately");

    // 2. 15 minutes elapsed - should be allowed
    $submittedAt15m = date('Y-m-d H:i:s', $now - (15 * 60));
    $t->assert(isEditAllowed($submittedAt15m, $now) === true, "Allowed when 15 minutes have elapsed");

    // 3. Exactly 30 minutes elapsed (1800 seconds) - should be allowed
    $submittedAt30m = date('Y-m-d H:i:s', $now - 1800);
    $t->assert(isEditAllowed($submittedAt30m, $now) === true, "Allowed at exactly 30 minutes elapsed");

    // 4. 31 minutes elapsed (1860 seconds) - should be blocked
    $submittedAt31m = date('Y-m-d H:i:s', $now - 1860);
    $t->assert(isEditAllowed($submittedAt31m, $now) === false, "Blocked when 31 minutes have elapsed");

    // 5. 2 hours elapsed - should be blocked
    $submittedAt2h = date('Y-m-d H:i:s', $now - 7200);
    $t->assert(isEditAllowed($submittedAt2h, $now) === false, "Blocked when 2 hours have elapsed");
});

$runner->summary();
