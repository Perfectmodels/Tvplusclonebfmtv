<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$config = require dirname(__DIR__, 2) . '/tvplus-v3-private.php';
if (!hash_equals((string)($config['migration_token'] ?? ''), (string)($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? ''))) { http_response_code(403); echo '{}'; exit; }
$ini = dirname(__DIR__) . '/.db_config.ini';
if (!is_file($ini)) $ini = dirname(__DIR__, 2) . '/.db_config.ini';
$c = parse_ini_file($ini);
try {
  $old = new PDO('mysql:host='.$c['host'].';dbname='.$c['dbname'].';charset=utf8mb4', $c['user'], $c['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  $v3 = new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4', 'cp1779864p23_tvplus_rw', $config['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
  echo json_encode([
    'pays' => $old->query('SELECT pays,COUNT(*) n FROM post_pays GROUP BY pays ORDER BY n DESC')->fetchAll(),
    'posts_with_country' => (int)$old->query('SELECT COUNT(DISTINCT idpost) FROM post_pays')->fetchColumn(),
    'posts_published' => (int)$old->query('SELECT COUNT(*) FROM post WHERE etat_post=1 AND poubelle=0')->fetchColumn(),
    'v3_country_codes' => $v3->query("SELECT country_code,COUNT(*) n FROM tvp_articles WHERE legacy_source='site' GROUP BY country_code")->fetchAll(),
    'v3_profiles_columns' => array_column($v3->query('SHOW COLUMNS FROM tvp_profiles')->fetchAll(),'Field'),
  ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) { http_response_code(503); echo json_encode(['error'=>$e->getMessage()]); }
