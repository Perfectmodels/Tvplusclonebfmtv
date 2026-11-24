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

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        respond(405, ['error' => 'Méthode non autorisée']);
    }

    $config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
    $pdo = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4',
        'cp1779864p23_tvplus_rw', $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    $resource = $_GET['resource'] ?? 'health';
    if ($resource === 'health') {
        $pdo->query('SELECT id FROM tvp_articles LIMIT 1');
        respond(200, ['status' => 'ok']);
    }
    if ($resource === 'categories') {
        $rows = $pdo->query('SELECT id, name, slug FROM tvp_categories ORDER BY position, name')->fetchAll();
        respond(200, ['items' => $rows]);
    }
    if ($resource !== 'articles') {
        respond(404, ['error' => 'Ressource inconnue']);
    }
    $criteria = ["a.status = 'published'", 'a.published_at <= UTC_TIMESTAMP()'];
    $params = [];
    foreach (['code' => 'a.short_code', 'slug' => 'a.slug', 'category' => 'c.slug', 'country' => 'a.country_code'] as $key => $column) {
        if (isset($_GET[$key])) {
            if (!is_string($_GET[$key]) || strlen($_GET[$key]) > 255) respond(400, ['error' => 'Filtre invalide']);
            $criteria[] = $column . ' = ?';
            $params[] = $_GET[$key];
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
    $from = ' FROM tvp_articles a LEFT JOIN tvp_categories c ON c.id = a.category_id LEFT JOIN tvp_media m ON m.id = a.cover_media_id WHERE ' . implode(' AND ', $criteria);
    $count = $pdo->prepare('SELECT COUNT(*)' . $from);
    $count->execute($params);
    $fields = 'a.id, a.title, a.slug, a.short_code, a.excerpt, a.published_at, a.country_code, a.featured, a.is_alert, c.name AS category, c.slug AS category_slug, m.media_url AS cover_url, m.alt_text AS cover_alt';
    if (isset($_GET['code']) || isset($_GET['slug'])) {
        $fields .= ', a.content_html, a.seo_title, a.seo_description, a.tags_json, m.caption AS cover_caption, m.credit AS cover_credit';
    }
    $query = $pdo->prepare("SELECT $fields $from ORDER BY a.published_at DESC, a.id ASC LIMIT $limit OFFSET $offset");
    $query->execute($params);
    respond(200, ['items' => $query->fetchAll(), 'total' => (int)$count->fetchColumn()]);
} catch (Throwable $e) {
    respond(503, ['error' => 'Service éditorial indisponible']);
}
