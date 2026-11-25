<?php
declare(strict_types=1);
/**
 * Amorçage TEMPORAIRE des données V3 (rôles, profil admin, réglage du direct).
 * À supprimer du serveur immédiatement après usage.
 * POST avec en-tête X-Migration-Token et body {"profile":{"id":...,"email":...,"full_name":...,"role":"admin"}}.
 * Le profil est optionnel : sans lui, seuls les rôles et le réglage live sont créés.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

$configFile = null;
foreach ([dirname(__DIR__, 2) . '/tvplus-v3-private.php', dirname(__DIR__) . '/tvplus-v3-private.php', __DIR__ . '/tvplus-v3-private.php'] as $candidate) {
    if (is_file($candidate)) { $configFile = $candidate; break; }
}
if (!$configFile) respond(503, ['error' => 'Configuration privée introuvable.']);
$config = require $configFile;
$expected = (string)($config['migration_token'] ?? '');
$provided = (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? '');
if ($expected === '' || !hash_equals($expected, $provided)) respond(403, ['error' => 'Jeton invalide.']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'POST requis.']);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$profile = $body['profile'] ?? null;
$isUuid = static fn(string $value): bool => (bool)preg_match('/^[a-f0-9-]{36}$/iD', $value);

try {
    $pdo = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4',
        'cp1779864p23_tvplus_rw', $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

    $adminPermissions = json_encode([
        'articles.read_all','articles.create','articles.review','articles.publish_scheduled',
        'shows.manage','categories.manage','media.upload','media.delete',
        'users.manage','schedule.manage','audit.read',
    ], JSON_UNESCAPED_UNICODE);
    $q = $pdo->prepare("INSERT INTO tvp_roles (role_key,label,permissions) VALUES
        ('admin','Administrateur',?),('reader','Lecteur','[]')
        ON DUPLICATE KEY UPDATE label=VALUES(label),permissions=VALUES(permissions)");
    $q->execute([$adminPermissions]);

    $q = $pdo->prepare("INSERT INTO tvp_live_settings
        (id,title,description,standby_message,player_platform,playback_url,hls_url,enabled)
        SELECT 1,'TV+ Afrique en direct','','Le direct reprendra prochainement.','restream','','',0
        WHERE NOT EXISTS (SELECT 1 FROM tvp_live_settings WHERE id=1)");
    $q->execute();

    $profileResult = null;
    if (is_array($profile)) {
        $email = (string)($profile['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'E-mail invalide.']);
        $id = (string)($profile['id'] ?? '');
        if ($id === '') {
            $lookup = $pdo->prepare('SELECT id FROM tvp_profiles WHERE email=?');
            $lookup->execute([$email]);
            $id = (string)$lookup->fetchColumn();
        }
        if (!$isUuid($id)) respond(404, ['error' => 'Profil introuvable pour cet e-mail. Inscris d’abord le compte.']);
        $role = (string)($profile['role'] ?? 'admin');
        if (!preg_match('/^[a-z_]{2,50}$/D', $role)) respond(400, ['error' => 'Rôle invalide.']);
        $q = $pdo->prepare("INSERT INTO tvp_profiles (id,email,full_name,role,is_active,created_at,updated_at)
            VALUES (?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
            ON DUPLICATE KEY UPDATE email=VALUES(email),full_name=VALUES(full_name),role=VALUES(role),is_active=1,updated_at=UTC_TIMESTAMP(6)");
        $q->execute([$id, $email, ($profile['full_name'] ?? null) ?: null, $role]);
        $profileResult = ['id' => $id, 'email' => $email, 'role' => $role];
    }

    respond(200, [
        'roles' => $pdo->query('SELECT COUNT(*) FROM tvp_roles')->fetchColumn(),
        'live_settings' => (int)$pdo->query('SELECT COUNT(*) FROM tvp_live_settings WHERE id=1')->fetchColumn(),
        'profile' => $profileResult,
    ]);
} catch (PDOException $e) {
    respond(503, ['error' => 'Amorçage impossible : ' . $e->getMessage()]);
}
