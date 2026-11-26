<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) {
    http_response_code(403); echo '{}'; exit;
}
$iniFile = dirname(__DIR__) . '/.db_config.ini';
if (!is_file($iniFile)) $iniFile = dirname(__DIR__, 2) . '/.db_config.ini';
$oldConfig = parse_ini_file($iniFile);
try {
    $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4', 'cp1779864p23_tvplus_rw', $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $old = new PDO('mysql:host=' . $oldConfig['host'] . ';dbname=' . $oldConfig['dbname'] . ';charset=utf8mb4', $oldConfig['user'], $oldConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $out = [
        'v3' => [
            'legacy_total' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles WHERE legacy_source='site'")->fetchColumn(),
            'legacy_no_category' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles WHERE legacy_source='site' AND category_id IS NULL")->fetchColumn(),
            'legacy_no_author_name' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles a LEFT JOIN tvp_profiles p ON p.id=a.author_id WHERE a.legacy_source='site' AND p.full_name IS NULL")->fetchColumn(),
            'distinct_authors' => (int)$v3->query("SELECT COUNT(DISTINCT author_id) FROM tvp_articles WHERE legacy_source='site'")->fetchColumn(),
            'categories' => $v3->query("SELECT c.name, COUNT(*) n FROM tvp_articles a LEFT JOIN tvp_categories c ON c.id=a.category_id WHERE a.legacy_source='site' GROUP BY c.name ORDER BY n DESC")->fetchAll(),
        ],
        'old_users_used' => $old->query("SELECT u.idUsers,u.nameUser,COUNT(*) n FROM post p LEFT JOIN users u ON u.idUsers=p.iduser WHERE p.etat_post=1 AND p.poubelle=0 GROUP BY u.idUsers,u.nameUser ORDER BY n DESC")->fetchAll(),
        'old_categories' => $old->query('SELECT idcategorie,nomcategorie,etat,corbeille FROM categorie')->fetchAll(),
        'old_subcategories' => $old->query('SELECT idsousCate,nomSouscate,idCategorie,corbeille FROM souscategorie')->fetchAll(),
        'unmapped_subcategories' => (function() use ($old, $v3) {
            $mapped = array_column($v3->query("SELECT legacy_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='subcategory'")->fetchAll(PDO::FETCH_ASSOC), 'legacy_id');
            $ids = array_values(array_filter(array_map('strval', $mapped)));
            $sql = "SELECT s.idsousCate,s.nomSouscate,COUNT(*) n FROM post p LEFT JOIN souscategorie s ON s.idsousCate=p.idsouscate WHERE p.etat_post=1 AND p.poubelle=0 AND s.idsousCate IS NOT NULL";
            if ($ids) $sql .= ' AND s.idsousCate NOT IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
            $sql .= ' GROUP BY s.idsousCate,s.nomSouscate';
            $q = $old->prepare($sql);
            $q->execute($ids);
            return $q->fetchAll();
        })(),
    ];
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(503); echo json_encode(['error' => $e->getMessage()]);
}
