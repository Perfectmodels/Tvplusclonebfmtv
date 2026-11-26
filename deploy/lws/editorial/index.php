<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

require_once __DIR__.'/api-health.php';
try {
    if (($_GET['resource'] ?? '') !== 'newsroom' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        respond(405, ['error' => 'Méthode non autorisée']);
    }

    $config = tvplusApiConfig(dirname(__DIR__, 2).'/tvplus-v3-private.php');
    $pdo = tvplusApiPdo($config);
    $resource = $_GET['resource'] ?? 'health';
    if ($resource === 'newsroom') {
        require_once __DIR__ . '/newsroom.php';
        newsroom($pdo, $config);
    }
    if ($resource === 'premium_plans') {
        require_once __DIR__.'/payments.php';
        respond(200,premiumCatalog($pdo));
    }
    if ($resource === 'health') {
        $pdo->query('SELECT id FROM tvp_articles LIMIT 1');
        respond(200, ['status' => 'ok','version'=>TVPLUS_API_RELEASE]);
    }
    if (in_array($resource,['schedule','ads','media_catalog','media_detail','home_layout'],true)) {
        require_once __DIR__.'/extras.php'; publicExtras($pdo,$resource);
    }
    if ($resource === 'categories') {
        $rows = $pdo->query('SELECT id, name, slug FROM tvp_categories ORDER BY position, name')->fetchAll();
        respond(200, ['items' => $rows]);
    }
    if ($resource === 'programs' || $resource === 'episodes') {
        try {
            if ($resource==='programs') {
                $rows=$pdo->query("SELECT s.id,s.slug,s.title AS name,s.host_name AS host,s.schedule_label AS slot,COALESCE(c.name,'Émission') AS category,COALESCE(m.media_url,'') AS image,COALESCE(NULLIF(s.description,''),s.tagline) AS description,s.intro_video_url AS introVideoUrl FROM tvp_shows s LEFT JOIN tvp_categories c ON c.id=s.category_id LEFT JOIN tvp_media m ON m.id=s.cover_media_id WHERE s.is_active=1 ORDER BY s.position,s.title")->fetchAll();
            } else {
                $limit=max(1,min(500,(int)($_GET['limit']??24)));
                $episodeId=$_GET['id']??null;
                if($episodeId!==null&&!preg_match('/^[0-9a-f-]{36}$/i',(string)$episodeId))respond(400,['error'=>'Identifiant invalide']);
                $query=$pdo->prepare("SELECT e.id,e.show_id,e.title,e.description,e.platform,e.external_id,e.source_url,e.thumbnail_url,e.duration_seconds,e.aired_at FROM tvp_episodes e JOIN tvp_shows s ON s.id=e.show_id WHERE s.is_active=1 AND (e.status='published' OR (e.status='draft' AND e.publish_at IS NOT NULL AND e.publish_at<=UTC_TIMESTAMP(6))) AND (e.publish_at IS NULL OR e.publish_at<=UTC_TIMESTAMP(6)) ".($episodeId!==null?" AND e.id=?":"")." ORDER BY e.aired_at DESC LIMIT $limit");$query->execute($episodeId!==null?[$episodeId]:[]);$rows=$query->fetchAll();
            }
            respond(200,['items'=>$rows]);
        } catch(PDOException $e) {
            if(in_array(($e->errorInfo[1]??0),[1054,1146],true))respond(503,['error'=>'Catalogue émissions/replays en cours de configuration.']);
            throw $e;
        }
    }
    if ($resource === 'live') { respond(403,['error'=>'Direct Premium : accès privé uniquement']); }
    if (false && $resource === 'live') {
        try {
            $row = $pdo->query('SELECT title,description,standby_message,player_platform,playback_url,hls_url,enabled,starts_at,ends_at FROM tvp_live_settings WHERE id=1')->fetch();
            if (!$row) respond(503, ['error' => 'Réglages du direct à initialiser dans la V3.']);
            $row['enabled'] = (bool)$row['enabled'];
            respond(200, $row);
        } catch (PDOException $e) {
            if (in_array(($e->errorInfo[1] ?? 0), [1054, 1146], true)) respond(503, ['error' => 'Réglages du direct en cours de configuration.']);
            throw $e;
        }
    }
    if ($resource !== 'articles') {
        respond(404, ['error' => 'Ressource inconnue']);
    }
    $criteria = ["a.status = 'published'", 'a.published_at <= UTC_TIMESTAMP()'];
    $params = [];
    if (($_GET['video']??'')==='1') $criteria[]='a.is_video_article=1';
    if (($_GET['highlights']??'')==='1') $criteria[]='(a.featured=1 OR a.is_alert=1)';
    foreach (['code' => 'a.short_code', 'slug' => 'a.slug', 'category' => 'c.slug', 'country' => 'a.country_code', 'province' => 'a.province_slug'] as $key => $column) {
        if (isset($_GET[$key])) {
            if (!is_string($_GET[$key]) || strlen($_GET[$key]) > 255) respond(400, ['error' => 'Filtre invalide']);
            $criteria[] = $column . ' = ?';
            $params[] = $_GET[$key];
        }
    }
    if (isset($_GET['exclude'])) {
        $slugs = array_slice(explode(',', (string)$_GET['exclude']),0,2);
        foreach($slugs as $slug) {
            if (!preg_match('/^[a-z0-9-]{1,120}$/i',$slug)) respond(400,['error'=>'Exclusion invalide']);
            $criteria[]='a.slug <> ?'; $params[]=$slug;
        }
    }
    if (isset($_GET['search'])) {
        if (!is_string($_GET['search']) || strlen($_GET['search']) > 500) respond(400, ['error' => 'Recherche invalide']);
        $criteria[] = '(LOCATE(?, a.title) > 0 OR LOCATE(?, a.excerpt) > 0)';
        $params[] = $_GET['search'];
        $params[] = $_GET['search'];
    }
    $limit = max(1, min(200, (int)($_GET['limit'] ?? 20)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $from = ' FROM tvp_articles a LEFT JOIN tvp_categories c ON c.id = a.category_id LEFT JOIN tvp_media m ON m.id = a.cover_media_id LEFT JOIN tvp_profiles p ON p.id = a.author_id LEFT JOIN tvp_article_read_stats rs ON rs.article_id = a.id WHERE ' . implode(' AND ', $criteria);
    $count = $pdo->prepare('SELECT COUNT(*)' . $from);
    $count->execute($params);
    $fields = 'a.id, a.title, a.slug, a.short_code, a.excerpt, a.published_at, a.created_at, a.updated_at, a.is_video_article, a.tags_json, a.seo_title, a.seo_description, a.country_code, a.province_slug, a.featured, a.is_alert, c.name AS category, c.slug AS category_slug, m.media_url AS cover_url, m.alt_text AS cover_alt, p.full_name AS author_name, COALESCE(rs.read_count,0) AS article_reads';
    if (isset($_GET['code']) || isset($_GET['slug'])) {
        $fields .= ', a.content_html, a.video_source_url, m.caption AS cover_caption, m.credit AS cover_credit';
    }
    $query = $pdo->prepare("SELECT $fields $from ORDER BY a.published_at DESC, a.id ASC LIMIT $limit OFFSET $offset");
    $query->execute($params);
    respond(200, ['items' => $query->fetchAll(), 'total' => (int)$count->fetchColumn()]);
} catch (Throwable $e) {
    // No credentials, SQL statements or exception messages are written to logs.
    error_log('TVPLUS API failure ['.get_class($e).'] code='.(string)$e->getCode());
    respond(503, ['error' => 'Service éditorial indisponible']);
}
