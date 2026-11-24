<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) {
    http_response_code(403); echo '{}'; exit;
}
$result = [];
foreach (['index.php', 'newsroom.php', 'programming.php', 'admin.php'] as $file) {
    $result[$file] = function_exists('opcache_invalidate') ? opcache_invalidate(__DIR__ . '/' . $file, true) : 'no-opcache';
}
echo json_encode($result);
