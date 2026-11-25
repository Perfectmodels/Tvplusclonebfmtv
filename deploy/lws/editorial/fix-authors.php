<?php
declare(strict_types=1);
/** Rattache chaque article legacy à son rédacteur d'origine. À supprimer après usage. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function frespond(int $status, array $payload): void {
    http_response_code($status); echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit;
}
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) frespond(403, ['error' => 'Jeton invalide.']);
$iniFile = dirname(__DIR__) . '/.db_config.ini';
if (!is_file($iniFile)) $iniFile = dirname(__DIR__, 2) . '/.db_config.ini';
$oldConfig = parse_ini_file($iniFile);

try {
    $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4', 'cp1779864p23_tvplus_rw', $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $old = new PDO('mysql:host=' . $oldConfig['host'] . ';dbname=' . $oldConfig['dbname'] . ';charset=utf8mb4', $oldConfig['user'], $oldConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $step = (string)($_GET['step'] ?? 'status');

    if ($step === 'status') {
        frespond(200, [
            'legacy' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles WHERE legacy_source='site'")->fetchColumn(),
            'authors_mapped' => (int)$v3->query("SELECT COUNT(*) FROM tvp_legacy_map WHERE source='site' AND legacy_kind='author'")->fetchColumn(),
            'distinct_author_ids' => (int)$v3->query("SELECT COUNT(DISTINCT author_id) FROM tvp_articles WHERE legacy_source='site'")->fetchColumn(),
        ]);
    }

    if ($step === 'authors') {
        $users = $old->query('SELECT idUsers,nameUser,emailUser,date_creat_User FROM users')->fetchAll();
        $find = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='author' AND legacy_id=?");
        $save = $v3->prepare("INSERT IGNORE INTO tvp_legacy_map (source,legacy_kind,legacy_id,destination_id) VALUES ('site','author',?,?)");
        $insert = $v3->prepare('INSERT INTO tvp_profiles (id,email,full_name,role,is_active,created_at,updated_at) VALUES (?,?,?,"reader",1,?,?)');
        $created = 0;
        $v3->beginTransaction();
        $rows = array_merge($users, [['idUsers' => null, 'nameUser' => 'Rédaction TV+ AFRIQUE', 'emailUser' => '', 'date_creat_User' => null]]);
        foreach ($rows as $user) {
            $key = $user['idUsers'] === null ? 'unknown' : (string)$user['idUsers'];
            $find->execute([$key]);
            if ($find->fetchColumn()) continue;
            $id = $v3->query('SELECT UUID()')->fetchColumn();
            $name = trim((string)($user['nameUser'] ?? ''));
            if ($name === '') $name = 'Rédaction TV+ AFRIQUE';
            $email = trim((string)($user['emailUser'] ?? ''));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = 'redaction-' . preg_replace('/[^a-z0-9]+/', '-', strtolower($name)) . '@tvplus.local';
            $date = !empty($user['date_creat_User']) ? str_replace('T', ' ', substr((string)$user['date_creat_User'], 0, 19)) : null;
            $insert->execute([$id, $email, mb_substr($name, 0, 120), $date, $date]);
            $save->execute([$key, $id]);
            $created++;
        }
        $v3->commit();
        frespond(200, ['users' => count($users), 'profiles_created' => $created]);
    }

    if ($step === 'link') {
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $limit = min(1000, max(1, (int)($_GET['limit'] ?? 500)));
        $posts = $old->query("SELECT idpost,iduser FROM post WHERE etat_post=1 AND poubelle=0 ORDER BY idpost ASC LIMIT $limit OFFSET $offset")->fetchAll();
        if (!$posts) frespond(200, ['processed' => 0, 'done' => true]);
        $authorLookup = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='author' AND legacy_id=?");
        $authorLookup->execute(['unknown']);
        $fallback = $authorLookup->fetchColumn();
        $update = $v3->prepare("UPDATE tvp_articles SET author_id=? WHERE legacy_source='site' AND legacy_id=?");
        $updated = 0;
        $v3->beginTransaction();
        foreach ($posts as $post) {
            $key = $post['iduser'] === null ? 'unknown' : (string)$post['iduser'];
            $authorLookup->execute([$key]);
            $profileId = $authorLookup->fetchColumn() ?: $fallback;
            if (!$profileId) continue;
            $update->execute([$profileId, (string)$post['idpost']]);
            $updated += $update->rowCount();
        }
        $v3->commit();
        frespond(200, ['processed' => count($posts), 'updated' => $updated, 'offset' => $offset]);
    }

    frespond(400, ['error' => 'Étape inconnue.']);
} catch (Throwable $e) {
    frespond(503, ['error' => $e->getMessage()]);
}
