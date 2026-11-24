<?php
declare(strict_types=1);
/**
 * Migrateur TEMPORAIRE V3 — à supprimer du serveur immédiatement après usage.
 * Ne modifie jamais les données existantes : CREATE TABLE IF NOT EXISTS et
 * ALTER TABLE ADD COLUMN uniquement. Aucune écriture dans tvp_articles,
 * tvp_media, tvp_categories, etc.
 *
 * Utilisation :
 *   GET  ?step=inspect&token=XXX  -> schéma réel + plan d'opérations (dry-run)
 *   POST ?step=apply&confirm=1&token=XXX  body {"operations":["id", ...]}
 *   GET  ?step=verify&token=XXX   -> contrôle que tout est appliqué
 *   GET  ?step=disable&token=XXX  -> écrit migrate.disabled (plus aucun accès)
 * Le jeton est lu dans $config['migration_token'] de tvplus-v3-private.php.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

if (file_exists(__DIR__ . '/migrate.disabled')) {
    respond(403, ['error' => 'Migration déjà désactivée. Supprimez ce fichier du serveur.']);
}

$configFile = null;
foreach ([dirname(__DIR__, 2) . '/tvplus-v3-private.php', dirname(__DIR__) . '/tvplus-v3-private.php', __DIR__ . '/tvplus-v3-private.php'] as $candidate) {
    if (is_file($candidate)) { $configFile = $candidate; break; }
}
if (!$configFile) respond(503, ['error' => 'Fichier de configuration privée introuvable.']);
$config = require $configFile;
$expected = (string)($config['migration_token'] ?? '');
$provided = (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? $_GET['token'] ?? '');
if ($expected === '') {
    respond(503, ['error' => 'Clé migration_token absente de la configuration privée.']);
}
if (!hash_equals($expected, $provided)) {
    respond(403, ['error' => 'Jeton de migration invalide.']);
}

try {
    $pdo = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4',
        'cp1779864p23_tvplus_rw', $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
} catch (Throwable $e) {
    respond(503, ['error' => 'Connexion MySQL impossible.']);
}

/** @return array<string>|null null = table absente */
function migrateColumns(PDO $pdo, string $table): ?array {
    try {
        return array_column($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(), 'Field');
    } catch (PDOException $e) {
        if ((int)($e->errorInfo[1] ?? 0) === 1146) return null;
        throw $e;
    }
}

$create = [
    'tvp_shows' => "CREATE TABLE IF NOT EXISTS tvp_shows (
 id CHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(100) NOT NULL UNIQUE,
 title VARCHAR(130) NOT NULL, tagline VARCHAR(200) NOT NULL DEFAULT '',
 description TEXT NOT NULL, schedule_label VARCHAR(150) NOT NULL DEFAULT '',
 host_name VARCHAR(130) NOT NULL DEFAULT '', frequency VARCHAR(130) NOT NULL DEFAULT '',
 category_id CHAR(36) NULL, cover_media_id CHAR(36) NULL, is_active TINYINT(1) NOT NULL DEFAULT 0,
 position SMALLINT UNSIGNED NOT NULL DEFAULT 0, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 INDEX idx_show_public(is_active,position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_episodes' => "CREATE TABLE IF NOT EXISTS tvp_episodes (
 id CHAR(36) NOT NULL PRIMARY KEY, show_id CHAR(36) NOT NULL, title VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 aired_at DATETIME(6) NOT NULL, duration_seconds INT UNSIGNED NULL, platform VARCHAR(20) NULL, external_id VARCHAR(1300) NULL,
 source_url VARCHAR(1300) NOT NULL DEFAULT '', thumbnail_url VARCHAR(1300) NOT NULL DEFAULT '',
 publish_at DATETIME(6) NULL, status ENUM('draft','published') NOT NULL DEFAULT 'draft',
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 INDEX idx_episode_public(status,publish_at,aired_at), INDEX idx_episode_show(show_id,aired_at),
 CONSTRAINT fk_tvp_episode_show FOREIGN KEY(show_id) REFERENCES tvp_shows(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_profiles' => "CREATE TABLE IF NOT EXISTS tvp_profiles (
 id CHAR(36) NOT NULL PRIMARY KEY,
 email VARCHAR(255) NOT NULL DEFAULT '',
 full_name VARCHAR(120) NULL,
 role VARCHAR(50) NOT NULL DEFAULT 'reader',
 is_active TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME(6) NULL,
 updated_at DATETIME(6) NULL,
 INDEX idx_tvp_profile_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_roles' => "CREATE TABLE IF NOT EXISTS tvp_roles (
 role_key VARCHAR(50) NOT NULL PRIMARY KEY,
 label VARCHAR(120) NOT NULL DEFAULT '',
 permissions JSON NOT NULL,
 INDEX idx_tvp_role_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_article_read_stats' => "CREATE TABLE IF NOT EXISTS tvp_article_read_stats (
 article_id CHAR(36) NOT NULL PRIMARY KEY,
 read_count INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME(6) NULL,
 INDEX idx_tvp_read_count (read_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_live_settings' => "CREATE TABLE IF NOT EXISTS tvp_live_settings (
 id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
 title VARCHAR(120) NOT NULL DEFAULT 'TV+ Afrique en direct',
 description TEXT NOT NULL,
 standby_message VARCHAR(350) NOT NULL DEFAULT 'Le direct reprendra prochainement.',
 player_platform VARCHAR(20) NOT NULL DEFAULT 'restream',
 playback_url VARCHAR(1300) NOT NULL DEFAULT '',
 hls_url VARCHAR(1300) NOT NULL DEFAULT '',
 enabled TINYINT(1) NOT NULL DEFAULT 0,
 starts_at DATETIME(6) NULL,
 ends_at DATETIME(6) NULL,
 updated_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    'tvp_audit_logs' => "CREATE TABLE IF NOT EXISTS tvp_audit_logs (
 id CHAR(36) NOT NULL PRIMARY KEY,
 actor_id CHAR(36) NULL,
 actor_email VARCHAR(255) NOT NULL DEFAULT '',
 action VARCHAR(80) NOT NULL,
 entity VARCHAR(80) NOT NULL DEFAULT '',
 entity_id CHAR(36) NULL,
 details JSON NULL,
 created_at DATETIME(6) NULL,
 INDEX idx_tvp_audit_created (created_at DESC),
 INDEX idx_tvp_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

$addColumns = [
    'tvp_media' => [
        'size_bytes' => 'INT UNSIGNED NULL',
        'uploaded_by' => 'CHAR(36) NULL',
        'created_at' => 'DATETIME(6) NULL',
    ],
    'tvp_categories' => [
        'hue' => 'SMALLINT UNSIGNED NOT NULL DEFAULT 216',
        'created_at' => 'DATETIME(6) NULL',
        'updated_at' => 'DATETIME(6) NULL',
    ],
];

function migratePlan(PDO $pdo, array $create, array $addColumns): array {
    $operations = [];
    foreach ($create as $table => $ddl) {
        $exists = migrateColumns($pdo, $table) !== null;
        $operations[] = [
            'id' => 'create_' . $table, 'kind' => 'ddl', 'table' => $table,
            'status' => $exists ? 'done' : 'todo', 'sql' => $ddl,
        ];
    }
    foreach ($addColumns as $table => $columns) {
        $existing = migrateColumns($pdo, $table);
        if ($existing === null) {
            $operations[] = [
                'id' => 'columns_' . $table, 'kind' => 'blocked', 'table' => $table,
                'status' => 'blocked', 'reason' => 'Table absente : elle doit être créée avant les colonnes.',
            ];
            continue;
        }
        foreach ($columns as $column => $definition) {
            $operations[] = [
                'id' => 'add_' . $table . '_' . $column, 'kind' => 'ddl', 'table' => $table,
                'status' => in_array($column, $existing, true) ? 'done' : 'todo',
                'sql' => "ALTER TABLE `$table` ADD COLUMN `$column` $definition",
            ];
        }
    }
    return $operations;
}

$step = (string)($_GET['step'] ?? 'inspect');

if ($step === 'inspect') {
    $tables = array_column($pdo->query("SHOW TABLES LIKE 'tvp_%'")->fetchAll(PDO::FETCH_NUM), 0);
    $schema = [];
    foreach (['tvp_articles', 'tvp_categories', 'tvp_media', 'tvp_shows', 'tvp_episodes', 'tvp_profiles', 'tvp_roles', 'tvp_article_read_stats', 'tvp_live_settings', 'tvp_audit_logs'] as $table) {
        $schema[$table] = migrateColumns($pdo, $table);
    }
    $plan = migratePlan($pdo, $create, $addColumns);
    respond(200, [
        'database' => 'tvplus_v3', 'tables' => $tables, 'schema' => $schema, 'plan' => $plan,
        'summary' => [
            'todo' => count(array_filter($plan, static fn(array $op): bool => $op['status'] === 'todo')),
            'done' => count(array_filter($plan, static fn(array $op): bool => $op['status'] === 'done')),
            'blocked' => count(array_filter($plan, static fn(array $op): bool => $op['status'] === 'blocked')),
        ],
        'manual_steps' => [
            'Renseigner tvp_profiles et tvp_roles (rôles + permissions) avant d’activer LWS_EDITORIAL_API_URL.',
            'Créer la ligne id=1 de tvp_live_settings si le direct doit être configurable (opération de données, volontairement exclue).',
            'Supprimer migrate.php et migrate.disabled du serveur aussitôt la migration validée.',
        ],
    ]);
}

if ($step === 'apply') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'POST requis.']);
    if (($_GET['confirm'] ?? '') !== '1') respond(400, ['error' => 'Confirmation absente (confirm=1).']);
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $requested = $body['operations'] ?? null;
    if (!is_array($requested) || !$requested) respond(400, ['error' => 'Liste d’opérations vide.']);
    $plan = migratePlan($pdo, $create, $addColumns);
    $byId = [];
    foreach ($plan as $op) $byId[$op['id']] = $op;
    $results = [];
    foreach ($requested as $id) {
        if (!is_string($id) || !isset($byId[$id])) respond(400, ['error' => 'Opération inconnue : ' . (string)$id]);
        $op = $byId[$id];
        if ($op['kind'] !== 'ddl') respond(400, ['error' => 'Opération non-DDL refusée : ' . $id]);
        if ($op['status'] === 'done') { $results[] = ['id' => $id, 'status' => 'skipped']; continue; }
        try {
            $pdo->exec($op['sql']);
            $results[] = ['id' => $id, 'status' => 'applied'];
        } catch (PDOException $e) {
            $results[] = ['id' => $id, 'status' => 'failed', 'error' => $e->getMessage()];
            respond(500, ['results' => $results]);
        }
    }
    respond(200, ['results' => $results, 'plan' => migratePlan($pdo, $create, $addColumns)]);
}

if ($step === 'verify') {
    $plan = migratePlan($pdo, $create, $addColumns);
    $pending = array_values(array_filter($plan, static fn(array $op): bool => $op['status'] !== 'done'));
    respond(200, ['ok' => !$pending, 'pending' => $pending]);
}

if ($step === 'disable') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'POST requis.']);
    file_put_contents(__DIR__ . '/migrate.disabled', date(DATE_ATOM) . PHP_EOL);
    respond(200, ['disabled' => true, 'note' => 'Supprimez maintenant migrate.php et migrate.disabled du serveur.']);
}

respond(400, ['error' => 'Étape inconnue.']);
