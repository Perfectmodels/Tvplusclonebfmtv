<?php
declare(strict_types=1);
/**
 * Migration READ-ONLY depuis l'ancienne base tvplusafrique vers tvplus_v3.
 * Étapes : ?step=categories | ?step=articles&offset=N&limit=M | ?step=status
 * À supprimer du serveur une fois terminé.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function mrespond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function mslug(string $value): string {
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $value) ?? '');
    return trim((string)$value, '-');
}
function muuid(PDO $pdo): string { return (string)$pdo->query('SELECT UUID()')->fetchColumn(); }
function mcode(): string { return substr(strtr(base64_encode(random_bytes(6)), '+/', '-_'), 0, 8); }

$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) {
    mrespond(403, ['error' => 'Jeton invalide.']);
}
$iniFile = dirname(__DIR__) . '/.db_config.ini';
if (!is_file($iniFile)) $iniFile = dirname(__DIR__, 2) . '/.db_config.ini';
if (!is_file($iniFile)) mrespond(503, ['error' => 'Config ancienne base introuvable.']);
$oldConfig = parse_ini_file($iniFile);

try {
    $old = new PDO('mysql:host=' . $oldConfig['host'] . ';dbname=' . $oldConfig['dbname'] . ';charset=utf8mb4',
        $oldConfig['user'], $oldConfig['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4',
        'cp1779864p23_tvplus_rw', $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $v3->exec("CREATE TABLE IF NOT EXISTS tvp_legacy_map (
        source VARCHAR(20) NOT NULL, legacy_kind VARCHAR(20) NOT NULL, legacy_id VARCHAR(50) NOT NULL,
        destination_id CHAR(36) NOT NULL, PRIMARY KEY (source,legacy_kind,legacy_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $actorId = (string)($_GET['actor'] ?? 'e172c05c-4b70-4fa8-94ef-632bf8facf9e');
    if (!preg_match('/^[a-f0-9-]{36}$/iD', $actorId)) mrespond(400, ['error' => 'Acteur invalide.']);
    $step = (string)($_GET['step'] ?? 'status');

    if ($step === 'status') {
        mrespond(200, [
            'categories' => (int)$v3->query("SELECT COUNT(*) FROM tvp_legacy_map WHERE source='site' AND legacy_kind IN ('category','subcategory')")->fetchColumn(),
            'posts' => (int)$v3->query("SELECT COUNT(*) FROM tvp_legacy_map WHERE source='site' AND legacy_kind='post'")->fetchColumn(),
            'articles_legacy' => (int)$v3->query("SELECT COUNT(*) FROM tvp_articles WHERE legacy_source='site'")->fetchColumn(),
            'posts_source' => (int)$old->query('SELECT COUNT(*) FROM post WHERE etat_post=1 AND poubelle=0')->fetchColumn(),
        ]);
    }

    if ($step === 'categories') {
        $categories = $old->query('SELECT idcategorie,nomcategorie,date_create FROM categorie WHERE etat=1 AND corbeille=0')->fetchAll();
        $subs = $old->query('SELECT idsousCate,nomSouscate,idCategorie,date_creat FROM souscategorie WHERE corbeille=0')->fetchAll();
        $existingSlugs = array_column($v3->query('SELECT slug FROM tvp_categories')->fetchAll(PDO::FETCH_ASSOC), 'slug');
        $used = array_flip($existingSlugs);
        $find = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind=? AND legacy_id=?");
        $save = $v3->prepare("INSERT IGNORE INTO tvp_legacy_map (source,legacy_kind,legacy_id,destination_id) VALUES ('site',?,?,?)");
        $insert = $v3->prepare('INSERT INTO tvp_categories (id,slug,name,description,position,parent_id,hue,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
        $created = 0;
        $map = [];
        foreach ([['category', $categories, 'idcategorie', 'nomcategorie', 'date_create', null],
                  ['subcategory', $subs, 'idsousCate', 'nomSouscate', 'date_creat', 'idCategorie']] as $group) {
            list($kind, $rows, $idField, $nameField, $dateField, $parentField) = $group;
            foreach ($rows as $row) {
                $legacyId = (string)$row[$idField];
                $find->execute([$kind, $legacyId]);
                $mappedId = $find->fetchColumn();
                if ($mappedId) { $map[$kind][$legacyId] = $mappedId; continue; }
                $base = mslug((string)$row[$nameField]);
                if ($base === '') $base = $kind . '-' . $legacyId;
                $slug = $base; $n = 2;
                while (isset($used[$slug])) $slug = $base . '-' . ($n++);
                $used[$slug] = true;
                $id = muuid($v3);
                $parentId = null;
                if ($parentField !== null) $parentId = $map['category'][(string)$row[$parentField]] ?? null;
                $date = !empty($row[$dateField]) ? str_replace('T', ' ', substr((string)$row[$dateField], 0, 19)) : null;
                $insert->execute([$id, $slug, mb_substr((string)$row[$nameField], 0, 85), '', 0, $parentId, 216, $date, $date]);
                $save->execute([$kind, $legacyId, $id]);
                $map[$kind][$legacyId] = $id;
                $created++;
            }
        }
        mrespond(200, ['created' => $created, 'categories' => count($categories), 'subcategories' => count($subs)]);
    }

    if ($step === 'articles') {
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 250)));
        $rows = $old->query("SELECT * FROM post WHERE etat_post=1 AND poubelle=0 ORDER BY idpost ASC LIMIT $limit OFFSET $offset")->fetchAll();
        if (!$rows) mrespond(200, ['processed' => 0, 'inserted' => 0, 'done' => true]);

        $ids = array_map('intval', array_column($rows, 'idpost'));
        $tags = [];
        if ($ids) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $tagQuery = $old->prepare("SELECT idpost,nomtag FROM post_tag WHERE idpost IN ($placeholders)");
            $tagQuery->execute($ids);
            foreach ($tagQuery->fetchAll() as $tag) {
                $key = (int)$tag['idpost'];
                if (!isset($tags[$key])) $tags[$key] = [];
                if (count($tags[$key]) >= 10) continue;
                $tags[$key][] = mb_substr((string)$tag['nomtag'], 0, 60);
            }
        }
        $known = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='post' AND legacy_id=?");
        $saveMap = $v3->prepare("INSERT IGNORE INTO tvp_legacy_map (source,legacy_kind,legacy_id,destination_id) VALUES ('site','post',?,?)");
        $catLookup = $v3->prepare("SELECT destination_id FROM tvp_legacy_map WHERE source='site' AND legacy_kind='subcategory' AND legacy_id=?");
        $mediaLookup = $v3->prepare('SELECT id FROM tvp_media WHERE original_path=?');
        $mediaInsert = $v3->prepare('INSERT INTO tvp_media (id,original_path,media_url,alt_text,caption,credit,mime_type,width_px,height_px,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $slugLookup = $v3->prepare('SELECT id FROM tvp_articles WHERE slug=?');
        $codeLookup = $v3->prepare('SELECT id FROM tvp_articles WHERE short_code=?');
        $insert = $v3->prepare('INSERT INTO tvp_articles
            (id,legacy_source,legacy_id,short_code,slug,title,excerpt,content_html,content_json,seo_title,seo_description,tags_json,
             category_id,cover_media_id,country_code,author_id,status,featured,is_alert,is_video_article,video_url,published_at,created_at,updated_at,province_slug,subcategory_id,reviewed_by,reviewed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

        $inserted = 0; $skipped = 0; $errors = [];
        $v3->beginTransaction();
        foreach ($rows as $row) {
            $legacyId = (string)$row['idpost'];
            $known->execute([$legacyId]);
            if ($known->fetchColumn()) { $skipped++; continue; }
            try {
                $title = trim(html_entity_decode((string)$row['titre'], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                if ($title === '') $title = 'Article ' . $legacyId;
                $base = mslug($title);
                if ($base === '') $base = 'article-' . $legacyId;
                $slug = mb_substr($base, 0, 110); $n = 2;
                $slugLookup->execute([$slug]);
                while ($slugLookup->fetchColumn()) $slug = mb_substr($base, 0, 100) . '-' . $legacyId . '-' . ($n++);
                $code = mcode();
                $codeLookup->execute([$code]);
                while ($codeLookup->fetchColumn()) $code = mcode();

                $categoryId = null;
                if (!empty($row['idsouscate'])) {
                    $catLookup->execute([(string)$row['idsouscate']]);
                    $categoryId = $catLookup->fetchColumn() ?: null;
                }
                $coverId = null;
                if (!empty($row['imgpost'])) {
                    $path = 'https://www.tvplusafrique.com/admin/img/uploads/posts/' . rawurlencode((string)$row['imgpost']);
                    $mediaLookup->execute([$path]);
                    $coverId = $mediaLookup->fetchColumn() ?: null;
                    if (!$coverId) {
                        $coverId = muuid($v3);
                        $mediaInsert->execute([$coverId, $path, $path, mb_substr($title, 0, 240), '', '', 'image/jpeg', null, null, null]);
                    }
                }
                $date = !empty($row['datepost']) ? str_replace('T', ' ', substr((string)$row['datepost'], 0, 19)) : gmdate('Y-m-d H:i:s');
                $content = html_entity_decode((string)$row['contenu'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $tagsJson = json_encode(array_values(array_unique($tags[(int)$legacyId] ?? [])), JSON_UNESCAPED_UNICODE);
                $id = muuid($v3);
                $insert->execute([
                    $id, 'site', $legacyId, $code, $slug, mb_substr($title, 0, 200),
                    mb_substr(trim(html_entity_decode((string)($row['seo'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8')), 0, 500),
                    $content, null,
                    mb_substr((string)($row['seo'] ?? ''), 0, 200), '', $tagsJson,
                    $categoryId, $coverId, 'GA', $actorId, 'published', 0, 0,
                    (int)((string)($row['en_video'] ?? '0') === '1'),
                    !empty($row['liens']) ? mb_substr((string)$row['liens'], 0, 1300) : null,
                    $date, $date, $date, null, null, null, null,
                ]);
                $saveMap->execute([$legacyId, $id]);
                $inserted++;
            } catch (Throwable $e) {
                $errors[] = [$legacyId, $e->getMessage()];
            }
        }
        $v3->commit();
        mrespond(200, ['processed' => count($rows), 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10), 'offset' => $offset]);
    }

    mrespond(400, ['error' => 'Étape inconnue.']);
} catch (Throwable $e) {
    mrespond(503, ['error' => $e->getMessage()]);
}
