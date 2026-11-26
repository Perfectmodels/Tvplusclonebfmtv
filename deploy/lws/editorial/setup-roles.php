<?php
declare(strict_types=1);
/** Amorçage des 6 rôles et attribution initiale. À supprimer après usage. */
header('Content-Type: application/json; charset=utf-8');
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) { http_response_code(403); echo '{}'; exit; }
try {
    $pdo = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4', 'cp1779864p23_tvplus_rw', $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $base = ['articles.read','articles.read_all','articles.create','articles.edit_own'];
    $editorial = array_merge($base, ['articles.review','articles.publish_scheduled','categories.manage','shows.manage','media.upload','media.delete','audit.read']);
    $web = array_merge($editorial, ['schedule.manage','settings.manage']);
    $admin = array_merge($web, ['users.manage','roles.manage']);
    $roles = [
        'lecteur' => ['Lecteur', []],
        'journaliste' => ['Journaliste', $base],
        'redacteur_en_chef' => ['Rédacteur en chef', $editorial],
        'chef_web' => ['Chef du web', $web],
        'admin' => ['Administrateur', $admin],
        'super_admin' => ['Super administrateur', $admin],
    ];
    $q = $pdo->prepare("INSERT INTO tvp_roles (role_key,label,permissions) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE label=VALUES(label),permissions=VALUES(permissions)");
    foreach ($roles as $key => list($label, $permissions)) {
        $q->execute([$key, $label, json_encode($permissions, JSON_UNESCAPED_UNICODE)]);
    }
    $journalists = $pdo->exec("UPDATE tvp_profiles SET role='journaliste' WHERE is_temporary=1 AND role='reader'");
    $admins = $pdo->exec("UPDATE tvp_profiles SET role='admin',is_temporary=0 WHERE id='e172c05c-4b70-4fa8-94ef-632bf8facf9e'");
    echo json_encode(['roles' => count($roles), 'journalists' => $journalists, 'admins' => $admins], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) { http_response_code(503); echo json_encode(['error' => $e->getMessage()]); }
