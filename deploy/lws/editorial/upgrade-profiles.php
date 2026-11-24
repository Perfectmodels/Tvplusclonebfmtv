<?php
declare(strict_types=1);
/** Enrichissement des profils + correction des pays. À supprimer après usage. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function uprespond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) {
    uprespond(403, ['error' => 'Jeton invalide.']);
}
$ini = dirname(__DIR__) . '/.db_config.ini';
if (!is_file($ini)) $ini = dirname(__DIR__, 2) . '/.db_config.ini';
$oldConfig = parse_ini_file($ini);

$countryMap = [
    'gabon' => 'GA', 'autres' => 'AF', 'cameroun' => 'CM', 'senegal' => 'SN',
    'congo_democratique' => 'CD', 'congo_democratique' => 'CD', 'cote_d_ivoire' => 'CI',
    'guinee_equatoriale' => 'GQ', 'congo' => 'CG', 'mali' => 'ML', 'burkina_faso' => 'BF',
    'ghana' => 'GH', 'republique_centrafricaine' => 'CF', 'niger' => 'NE', 'tchad' => 'TD',
    'nigeria' => 'NG', 'maroc' => 'MA', 'guinee' => 'GN', 'benin' => 'BJ',
    'afrique_du_sud' => 'ZA', 'angola' => 'AO', 'rwanda' => 'RW', 'togo' => 'TG',
    'guinee_bissau' => 'GW', 'algerie' => 'DZ', 'ouganda' => 'UG', 'madagascar' => 'MG',
    'mozambique' => 'MZ', 'kenya' => 'KE', 'burundi' => 'BI', 'ethiopie' => 'ET',
    'tanzanie' => 'TZ', 'sierra_leone' => 'SL', 'lybie' => 'LY', 'sao_tome_et_principe' => 'ST',
    'botswana' => 'BW', 'tunisie' => 'TN', 'liberia' => 'LR', 'zimbabwe' => 'ZW',
    'maurice' => 'MU', 'zambie' => 'ZM', 'soudan' => 'SD', 'mauritanie' => 'MR',
    'cap_vert' => 'CV', 'eswatini' => 'SZ', 'somalie' => 'SO', 'egypte' => 'EG',
    'soudan_du_sud' => 'SS', 'seychelles' => 'SC', 'gambie' => 'GM', 'namibie' => 'NA',
];
function upcountry(string $name, array $map): string {
    $key = strtolower(trim($name));
    $key = preg_replace('/[^a-z0-9]+/', '_', $key) ?? '';
    $key = trim($key, '_');
    return $map[$key] ?? 'GA';
}

try {
    $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4', 'cp1779864p23_tvplus_rw', $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $old = new PDO('mysql:host=' . $oldConfig['host'] . ';dbname=' . $oldConfig['dbname'] . ';charset=utf8mb4', $oldConfig['user'], $oldConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $step = (string)($_GET['step'] ?? 'status');

    if ($step === 'status') {
        uprespond(200, [
            'profile_columns' => array_column($v3->query('SHOW COLUMNS FROM tvp_profiles')->fetchAll(), 'Field'),
            'legacy_countries' => $v3->query("SELECT country_code,COUNT(*) n FROM tvp_articles WHERE legacy_source='site' GROUP BY country_code ORDER BY n DESC")->fetchAll(),
            'temporary_profiles' => (int)$v3->query('SELECT COUNT(*) FROM tvp_profiles WHERE is_temporary=1')->fetchColumn(),
        ]);
    }

    if ($step === 'ddl') {
        $existing = array_column($v3->query('SHOW COLUMNS FROM tvp_profiles')->fetchAll(), 'Field');
        $wanted = [
            'first_name' => 'VARCHAR(80) NULL', 'last_name' => 'VARCHAR(80) NULL',
            'photo_url' => 'VARCHAR(1300) NULL', 'birth_date' => 'DATE NULL',
            'phone' => 'VARCHAR(40) NULL', 'city' => 'VARCHAR(120) NULL',
            'bio' => 'TEXT NULL', 'is_temporary' => 'TINYINT(1) NOT NULL DEFAULT 0',
        ];
        $added = [];
        foreach ($wanted as $column => $definition) {
            if (!in_array($column, $existing, true)) {
                $v3->exec("ALTER TABLE tvp_profiles ADD COLUMN `$column` $definition");
                $added[] = $column;
            }
        }
        uprespond(200, ['added' => $added]);
    }

    if ($step === 'countries') {
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $limit = min(2000, max(1, (int)($_GET['limit'] ?? 1000)));
        $rows = $old->query("SELECT idpost,pays FROM post_pays GROUP BY idpost ORDER BY MIN(idpays) ASC LIMIT $limit OFFSET $offset")->fetchAll();
        if (!$rows) uprespond(200, ['processed' => 0, 'done' => true]);
        $update = $v3->prepare("UPDATE tvp_articles SET country_code=? WHERE legacy_source='site' AND legacy_id=?");
        $updated = 0;
        $v3->beginTransaction();
        foreach ($rows as $row) {
            $code = upcountry((string)$row['pays'], $countryMap);
            $update->execute([$code, (string)$row['idpost']]);
            $updated += $update->rowCount();
        }
        $v3->commit();
        uprespond(200, ['processed' => count($rows), 'updated' => $updated, 'offset' => $offset]);
    }

    if ($step === 'profiles') {
        $users = $old->query('SELECT idUsers,nameUser,emailUser,phoneUser,description,residence FROM users')->fetchAll();
        $find = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='author' AND legacy_id=?");
        $update = $v3->prepare('UPDATE tvp_profiles SET first_name=?,last_name=?,phone=?,city=?,bio=?,is_temporary=1,updated_at=UTC_TIMESTAMP(6) WHERE id=?');
        $updated = 0;
        $v3->beginTransaction();
        foreach ($users as $user) {
            $find->execute([(string)$user['idUsers']]);
            $id = $find->fetchColumn();
            if (!$id) continue;
            $name = trim((string)$user['nameUser']);
            $parts = preg_split('/\s+/', $name, 2);
            $first = $parts[0] ?? $name;
            $last = $parts[1] ?? '';
            $update->execute([
                mb_substr($first, 0, 80), mb_substr($last, 0, 80),
                mb_substr((string)($user['phoneUser'] ?? ''), 0, 40),
                mb_substr((string)($user['residence'] ?? ''), 0, 120),
                mb_substr((string)($user['description'] ?? ''), 0, 2000),
                $id,
            ]);
            $updated += $update->rowCount();
        }
        $v3->commit();
        uprespond(200, ['users' => count($users), 'profiles_updated' => $updated]);
    }

    uprespond(400, ['error' => 'Étape inconnue.']);
} catch (Throwable $e) {
    uprespond(503, ['error' => $e->getMessage()]);
}
