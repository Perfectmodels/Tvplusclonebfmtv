<?php
declare(strict_types=1);
/** Inspection READ-ONLY de l'ancienne base et de la V3. À supprimer après usage. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) {
    http_response_code(403); echo '{}'; exit;
}

function columnsOf(PDO $pdo, string $table): array {
    try { return array_column($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_ASSOC), 'Field'); }
    catch (Throwable $e) { return ['error' => $e->getMessage()]; }
}

try {
    $out = [];
    $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4',
        'cp1779864p23_tvplus_rw', $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $out['v3'] = [];
    foreach (['tvp_articles', 'tvp_categories', 'tvp_media', 'tvp_legacy_posts', 'tvp_legacy_categories', 'tvp_legacy_news24', 'tvp_category_mapping', 'tvp_import_audit'] as $t) {
        $count = columnsOf($v3, $t);
        if (isset($count['error'])) { $out['v3'][$t] = ['missing' => true]; continue; }
        $total = (int)$v3->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        $sample = $v3->query("SELECT * FROM `$t` LIMIT 1")->fetch();
        $out['v3'][$t] = ['count' => $total, 'columns' => $count, 'sample' => $sample];
    }

    $iniFile = null;
    foreach ([dirname(__DIR__) . '/.db_config.ini', dirname(__DIR__, 2) . '/.db_config.ini'] as $candidate) {
        if (is_file($candidate)) { $iniFile = $candidate; break; }
    }
    if (!$iniFile) { $out['old_error'] = 'Fichier .db_config.ini introuvable'; echo json_encode($out); exit; }
    $oldConfig = parse_ini_file($iniFile);
    $out['old_db'] = $oldConfig['dbname'] ?? null;
    $old = new PDO('mysql:host=' . $oldConfig['host'] . ';dbname=' . $oldConfig['dbname'] . ';charset=utf8mb4',
        $oldConfig['user'], $oldConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $tables = array_column($old->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM), 0);
    $out['old_tables'] = $tables;
    $out['old_counts'] = [
        'post_total' => (int)$old->query('SELECT COUNT(*) FROM post')->fetchColumn(),
        'post_published' => (int)$old->query('SELECT COUNT(*) FROM post WHERE etat_post=1 AND poubelle=0')->fetchColumn(),
        'post_trash' => (int)$old->query('SELECT COUNT(*) FROM post WHERE poubelle=1')->fetchColumn(),
        'news24_published' => (int)$old->query('SELECT COUNT(*) FROM news24 WHERE state=1 AND trash=0')->fetchColumn(),
        'emission_published' => (int)$old->query('SELECT COUNT(*) FROM emission WHERE etat=1 AND poubelle=0')->fetchColumn(),
        'souscategorie_total' => (int)$old->query('SELECT COUNT(*) FROM souscategorie')->fetchColumn(),
    ];
    $out['v3_counts'] = [
        'articles_total' => (int)$v3->query('SELECT COUNT(*) FROM tvp_articles')->fetchColumn(),
        'articles_legacy' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles WHERE legacy_source IS NOT NULL")->fetchColumn(),
        'legacy_posts_staged' => (int)$v3->query('SELECT COUNT(*) FROM tvp_legacy_posts')->fetchColumn(),
        'legacy_posts_publishable' => (int)$v3->query("SELECT COUNT(*) FROM tvp_legacy_posts WHERE original_state=1 AND original_trash=0")->fetchColumn(),
        'media_total' => (int)$v3->query('SELECT COUNT(*) FROM tvp_media')->fetchColumn(),
    ];
    $out['old'] = [];
    foreach ($tables as $table) {
        $count = columnsOf($old, $table);
        if (isset($count['error'])) continue;
        $total = (int)$old->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        if ($total === 0) continue;
        $sample = $old->query("SELECT * FROM `$table` LIMIT 1")->fetch();
        $out['old'][$table] = ['count' => $total, 'columns' => $count, 'sample' => $sample];
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
