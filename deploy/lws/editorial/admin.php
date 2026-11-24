<?php
declare(strict_types=1);

/** Erreurs MySQL explicites : aucun basculement silencieux vers une autre source. */
function lwsAdminError(PDOException $e, string $schemaMessage): void {
    $code = (int)($e->errorInfo[1] ?? 0);
    if ($code === 1062) respond(409, ['error' => 'Identifiant ou lien déjà utilisé.']);
    if (in_array($code, [1054, 1146, 1048, 1049], true)) respond(503, ['error' => $schemaMessage]);
    throw $e;
}

function lwsDate(?string $value): ?string {
    return empty($value) ? null : articleVersion($value);
}

function lwsMediaRow(array $row): array {
    return [
        'id' => $row['id'], 'bucket' => '', 'path' => $row['original_path'],
        'imgbb_url' => null, 'alt' => $row['alt_text'] ?? '',
        'caption' => $row['caption'] ?? '', 'credit' => $row['credit'] ?? '',
        'mime_type' => $row['mime_type'] ?? '', 'size_bytes' => (int)($row['size_bytes'] ?? 0),
        'width' => isset($row['width_px']) ? (int)$row['width_px'] : null,
        'height' => isset($row['height_px']) ? (int)$row['height_px'] : null,
        'created_at' => lwsDate($row['created_at'] ?? null),
        'url' => $row['media_url'] ?: $row['original_path'],
    ];
}

function lwsAdmin(PDO $pdo, string $op, array $request): void {
    $actor = $request['actor'] ?? [];
    $permissions = $actor['permissions'] ?? [];
    $actorId = (string)($actor['id'] ?? '');
    $id = (string)($request['id'] ?? '');
    $data = $request['data'] ?? [];
    $has = static fn(string $permission): bool => in_array($permission, $permissions, true);
    $need = static function(string $permission) use ($has): void {
        if (!$has($permission)) respond(403, ['error' => 'Permission insuffisante.']);
    };
    $isUuid = static fn(string $value): bool => (bool)preg_match('/^[a-f0-9-]{36}$/iD', $value);
    $schema = 'Schéma MySQL administration à mettre en conformité.';

    try {
        // Authentification MySQL : le mot de passe est vérifié côté Next.js,
        // l'API ne fait que fournir le hash et les permissions du profil.
        if ($op === 'auth.login' || $op === 'auth.me') {
            $column = $op === 'auth.login' ? 'p.email' : 'p.id';
            $value = $op === 'auth.login' ? (string)($data['email'] ?? '') : (string)($data['id'] ?? '');
            if ($value === '' || ($op === 'auth.me' && !$isUuid($value))) respond(400, ['error' => 'Identifiant invalide.']);
            $q = $pdo->prepare("SELECT p.id,p.email,p.full_name,p.role,p.is_active,p.password_hash,COALESCE(r.permissions,'[]') AS permissions
                FROM tvp_profiles p LEFT JOIN tvp_roles r ON r.role_key=p.role WHERE $column=?");
            $q->execute([$value]);
            $profile = $q->fetch();
            if (!$profile || !(bool)$profile['is_active']) respond(401, ['error' => 'Identifiants invalides.']);
            $result = [
                'id' => $profile['id'], 'email' => $profile['email'],
                'full_name' => $profile['full_name'], 'role' => $profile['role'],
                'is_active' => true, 'permissions' => json_decode($profile['permissions'], true) ?: [],
            ];
            if ($op === 'auth.login') $result['password_hash'] = $profile['password_hash'] ?? '';
            respond(200, $result);
        }

        // Inscription / création de compte : le hash est produit côté Next.js.
        if ($op === 'profile.signup') {
            $email = (string)($data['email'] ?? '');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'E-mail invalide.']);
            if (empty($data['password_hash']) || !is_string($data['password_hash'])) respond(400, ['error' => 'Mot de passe manquant.']);
            $role = (string)($data['role'] ?? 'reader');
            if (!preg_match('/^[a-z_]{2,50}$/D', $role)) respond(400, ['error' => 'Rôle invalide.']);
            $id = (string)($data['id'] ?? '');
            if ($id !== '' && !$isUuid($id)) respond(400, ['error' => 'Identifiant invalide.']);
            if (!empty($data['birth_date']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/D', (string)$data['birth_date'])) respond(400, ['error' => 'Date de naissance invalide.']);
            $check = $pdo->prepare('SELECT id FROM tvp_profiles WHERE email=?');
            $check->execute([$email]);
            if ($check->fetchColumn()) respond(409, ['error' => 'Un compte existe déjà avec cette adresse e-mail.']);
            if ($id === '') $id = $pdo->query('SELECT UUID()')->fetchColumn();
            $q = $pdo->prepare("INSERT INTO tvp_profiles
                (id,email,full_name,first_name,last_name,photo_url,birth_date,phone,city,bio,role,password_hash,is_active,is_temporary,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
            $q->execute([
                $id, $email, ($data['full_name'] ?? null) ?: null,
                ($data['first_name'] ?? null) ?: null, ($data['last_name'] ?? null) ?: null,
                ($data['photo_url'] ?? null) ?: null, ($data['birth_date'] ?? null) ?: null,
                ($data['phone'] ?? null) ?: null, ($data['city'] ?? null) ?: null, ($data['bio'] ?? null) ?: null,
                $role, $data['password_hash'], 1, empty($data['is_temporary']) ? 0 : 1,
            ]);
            respond(201, ['id' => $id, 'email' => $email, 'role' => $role, 'is_active' => true]);
        }

        if ($op === 'auth.set_password') {
            $need('users.manage');
            if (!$isUuid($id) || empty($data['password_hash'])) respond(400, ['error' => 'Mot de passe invalide.']);
            $q = $pdo->prepare('UPDATE tvp_profiles SET password_hash=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?');
            $q->execute([$data['password_hash'], $id]);
            if (!$q->rowCount()) respond(404, ['error' => 'Utilisateur introuvable.']);
            respond(200, ['updated' => true]);
        }

        // Résolution du profil : la session reste Supabase, les rôles viennent de MySQL.
        if ($op === 'profile.resolve') {
            if (!$isUuid($actorId)) respond(403, ['error' => 'Compte inconnu.']);
            $q = $pdo->prepare("SELECT p.id,p.email,p.full_name,p.role,p.is_active,COALESCE(r.permissions,'[]') AS permissions
                FROM tvp_profiles p LEFT JOIN tvp_roles r ON r.role_key=p.role WHERE p.id=?");
            $q->execute([$actorId]);
            $profile = $q->fetch();
            if (!$profile || !(bool)$profile['is_active']) respond(403, ['error' => 'Compte inactif ou absent de la V3.']);
            respond(200, [
                'id' => $profile['id'], 'email' => $profile['email'],
                'full_name' => $profile['full_name'], 'role' => $profile['role'],
                'is_active' => true, 'permissions' => json_decode($profile['permissions'], true) ?: [],
            ]);
        }

        // Création automatique du profil V3 lors d'une inscription Supabase.
        // Aucune permission requise : seul le service_key de l'API est vérifié.
        if ($op === 'profile.ensure') {
            $id = (string)($data['id'] ?? '');
            $email = (string)($data['email'] ?? '');
            if (!$isUuid($id) || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Profil invalide.']);
            $q = $pdo->prepare("INSERT INTO tvp_profiles (id,email,full_name,role,is_active,created_at,updated_at)
                VALUES (?,?,?,'reader',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE email=VALUES(email),full_name=VALUES(full_name),is_active=1,updated_at=UTC_TIMESTAMP(6)");
            $q->execute([$id, $email, ($data['full_name'] ?? null) ?: null]);
            respond(200, ['id' => $id, 'email' => $email, 'role' => 'reader']);
        }

        if ($op === 'users.authors') {
            $need('articles.read_all');
            $rows = $pdo->query("SELECT id,full_name FROM tvp_profiles WHERE is_active=1 ORDER BY full_name,id")->fetchAll();
            respond(200, ['items' => array_map(static fn(array $row): array => [
                'id' => $row['id'], 'full_name' => $row['full_name'],
            ], $rows)]);
        }

        if ($op === 'users.list' || $op === 'roles.list') {
            $need('users.manage');
            if ($op === 'roles.list') {
                $rows = $pdo->query("SELECT role_key AS `key`,label,permissions FROM tvp_roles ORDER BY role_key")->fetchAll();
                foreach ($rows as &$row) $row['permissions'] = json_decode($row['permissions'], true) ?: [];
                unset($row);
                respond(200, ['items' => $rows]);
            }
            $rows = $pdo->query("SELECT p.id,p.email,p.full_name,p.first_name,p.last_name,p.photo_url,p.birth_date,p.phone,p.city,p.bio,p.role,p.is_active,p.is_temporary,p.created_at,
                (SELECT COUNT(*) FROM tvp_articles a WHERE a.author_id=p.id) AS article_count
                FROM tvp_profiles p ORDER BY p.created_at DESC,p.id")->fetchAll();
            foreach ($rows as &$row) {
                $row['is_active'] = (bool)$row['is_active'];
                $row['is_temporary'] = (bool)$row['is_temporary'];
                $row['article_count'] = (int)$row['article_count'];
                $row['created_at'] = lwsDate($row['created_at']);
            }
            unset($row);
            respond(200, ['items' => $rows, 'total' => count($rows)]);
        }

        if ($op === 'users.create') {
            $need('users.manage');
            if (empty($data['id']) || !$isUuid((string)$data['id'])) respond(400, ['error' => 'Identifiant de compte invalide.']);
            if (!filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Adresse e-mail invalide.']);
            $role = (string)($data['role'] ?? 'reader');
            if (!preg_match('/^[a-z_]{2,50}$/D', $role)) respond(400, ['error' => 'Rôle invalide.']);
            $q = $pdo->prepare('INSERT INTO tvp_profiles (id,email,full_name,role,is_active,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))');
            $q->execute([$data['id'], $data['email'], ($data['full_name'] ?? null) ?: null, $role, (int)(bool)($data['is_active'] ?? true)]);
            respond(201, ['id' => $data['id'], 'email' => $data['email'], 'full_name' => $data['full_name'] ?? null, 'role' => $role, 'is_active' => true]);
        }

        if ($op === 'users.update') {
            $need('users.manage');
            if (!$isUuid($id)) respond(400, ['error' => 'Identifiant invalide.']);
            if ($id === $actorId) respond(400, ['error' => 'Vous ne pouvez pas modifier votre propre rôle.']);
            $fields = [];
            $params = [];
            foreach (['full_name' => 'full_name', 'first_name' => 'first_name', 'last_name' => 'last_name',
                      'photo_url' => 'photo_url', 'birth_date' => 'birth_date', 'phone' => 'phone',
                      'city' => 'city', 'bio' => 'bio', 'role' => 'role',
                      'is_active' => 'is_active', 'is_temporary' => 'is_temporary'] as $key => $column) {
                if (!array_key_exists($key, $data)) continue;
                if ($key === 'birth_date' && !empty($data[$key]) && !preg_match('/^\d{4}-\d{2}-\d{2}$/D', (string)$data[$key])) {
                    respond(400, ['error' => 'Date de naissance invalide.']);
                }
                $fields[] = $column . '=?';
                $params[] = $data[$key];
            }
            if (!$fields) respond(400, ['error' => 'Aucune modification fournie.']);
            $params[] = $id;
            $q = $pdo->prepare('UPDATE tvp_profiles SET ' . implode(',', $fields) . ',updated_at=UTC_TIMESTAMP(6) WHERE id=?');
            $q->execute($params);
            if (!$q->rowCount()) respond(404, ['error' => 'Utilisateur introuvable.']);
            $q = $pdo->prepare('SELECT id,email,full_name,first_name,last_name,photo_url,birth_date,phone,city,bio,role,is_active,is_temporary FROM tvp_profiles WHERE id=?');
            $q->execute([$id]);
            respond(200, $q->fetch());
        }

        // Espace de travail d'un rédacteur : profil, articles et compteurs.
        if ($op === 'users.workspace') {
            $need('articles.read_all');
            if (!$isUuid($id)) respond(400, ['error' => 'Profil inconnu.']);
            $q = $pdo->prepare("SELECT id,email,full_name,first_name,last_name,photo_url,birth_date,phone,city,bio,role,is_active,is_temporary
                FROM tvp_profiles WHERE id=?");
            $q->execute([$id]);
            $profile = $q->fetch();
            if (!$profile) respond(404, ['error' => 'Profil introuvable.']);
            $profile['is_active'] = (bool)$profile['is_active'];
            $profile['is_temporary'] = (bool)$profile['is_temporary'];
            $q = $pdo->prepare("SELECT a.id,a.slug,a.title,a.status,a.country_code,a.published_at,a.created_at,c.name AS category
                FROM tvp_articles a LEFT JOIN tvp_categories c ON c.id=a.category_id
                WHERE a.author_id=? ORDER BY a.published_at DESC,a.created_at DESC LIMIT 100");
            $q->execute([$id]);
            $articles = $q->fetchAll();
            foreach ($articles as &$article) {
                $article['published_at'] = lwsDate($article['published_at']);
                $article['created_at'] = lwsDate($article['created_at']);
            }
            unset($article);
            $stats = $pdo->prepare("SELECT status,COUNT(*) n,DATE_FORMAT(published_at,'%Y-%m') month FROM tvp_articles WHERE author_id=?
                GROUP BY status,month ORDER BY month DESC");
            $stats->execute([$id]);
            $counts = array_fill_keys(['published','draft','in_review','approved','scheduled','inactive','archived'], 0);
            foreach ($stats->fetchAll() as $row) $counts[$row['status']] = (int)$row['n'];
            respond(200, [
                'profile' => $profile, 'articles' => $articles,
                'counts' => $counts, 'total' => array_sum($counts),
            ]);
        }

        // Tableau de bord : toutes les données sont lues dans la V3.
        if ($op === 'dashboard.full') {
            $need('articles.read_all');
            $counts = array_fill_keys(['published','draft','in_review','approved','scheduled','inactive','archived'], 0);
            foreach ($pdo->query('SELECT status,COUNT(*) n FROM tvp_articles GROUP BY status') as $row) {
                $counts[$row['status']] = (int)$row['n'];
            }
            $articleFields = 'id,slug,short_code,title,excerpt,status,category_id,cover_media_id,author_id,reviewed_by,created_at,updated_at,published_at';
            $normalize = static function(array $rows) use ($articleFields): array {
                foreach ($rows as &$row) {
                    foreach (['created_at','updated_at','published_at'] as $key) $row[$key] = lwsDate($row[$key]);
                }
                unset($row);
                return $rows;
            };
            $recent = $pdo->query("SELECT $articleFields FROM tvp_articles ORDER BY updated_at DESC LIMIT 8")->fetchAll();
            $live = $pdo->query("SELECT $articleFields FROM tvp_articles WHERE status='published' ORDER BY published_at DESC LIMIT 7")->fetchAll();
            $scheduled = $pdo->query("SELECT $articleFields FROM tvp_articles WHERE status='scheduled' AND published_at>UTC_TIMESTAMP(6) ORDER BY published_at ASC LIMIT 6")->fetchAll();
            $month = $pdo->query("SELECT id,author_id,category_id,published_at FROM tvp_articles WHERE status='published' AND published_at>=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 30 DAY)")->fetchAll();
            foreach ($month as &$row) $row['published_at'] = lwsDate($row['published_at']);
            unset($row);
            $period = static function(string $since) use ($pdo): int {
                $q = $pdo->prepare("SELECT COUNT(*) FROM tvp_articles WHERE status='published' AND published_at>=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL $since)");
                $q->execute();
                return (int)$q->fetchColumn();
            };
            $audit = $pdo->query("SELECT id,actor_id,actor_email,action,entity,entity_id,details,created_at FROM tvp_audit_logs WHERE entity='articles' ORDER BY created_at DESC LIMIT 7")->fetchAll();
            foreach ($audit as &$row) {
                $row['details'] = json_decode($row['details'] ?? 'null', true);
                $row['created_at'] = lwsDate($row['created_at']);
            }
            unset($row);
            $authorStats = $pdo->query("SELECT p.id,p.full_name,p.first_name,p.last_name,p.photo_url,p.is_temporary,
                COUNT(a.id) total, SUM(a.status='published') published, SUM(a.status='draft') drafts
                FROM tvp_profiles p LEFT JOIN tvp_articles a ON a.author_id=p.id
                GROUP BY p.id ORDER BY total DESC,p.full_name")->fetchAll();
            foreach ($authorStats as &$author) {
                $author['total'] = (int)$author['total'];
                $author['published'] = (int)$author['published'];
                $author['drafts'] = (int)$author['drafts'];
                $author['is_temporary'] = (bool)$author['is_temporary'];
            }
            unset($author);
            $dailyWritten = $pdo->query("SELECT DATE(created_at) day,COUNT(*) n FROM tvp_articles
                WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY day DESC")->fetchAll();
            $dailyPublished = $pdo->query("SELECT DATE(published_at) day,COUNT(*) n FROM tvp_articles
                WHERE published_at>=DATE_SUB(UTC_DATE(),INTERVAL 30 DAY) GROUP BY DATE(published_at) ORDER BY day DESC")->fetchAll();
            $countryStats = $pdo->query('SELECT country_code,COUNT(*) n FROM tvp_articles GROUP BY country_code ORDER BY n DESC')->fetchAll();
            respond(200, [
                'counts' => $counts, 'total' => array_sum($counts),
                'media' => (int)$pdo->query('SELECT COUNT(*) FROM tvp_media')->fetchColumn(),
                'recent' => $normalize($recent), 'live' => $normalize($live), 'scheduled' => $normalize($scheduled),
                'month' => $month, 'week' => $period('7 DAY'), 'today' => $period('24 HOUR'),
                'categories' => $pdo->query('SELECT id,name FROM tvp_categories ORDER BY position,name')->fetchAll(),
                'profiles' => $pdo->query('SELECT id,full_name FROM tvp_profiles WHERE is_active=1')->fetchAll(),
                'author_stats' => $authorStats, 'daily_written' => $dailyWritten,
                'daily_published' => $dailyPublished, 'country_stats' => $countryStats,
                'audit' => $audit,
            ]);
        }

        // Références en lot pour les listes admin et l'éditeur (plus aucun appel Supabase).
        if ($op === 'lookups') {
            $need('articles.read_all');
            $ids = $request['ids'] ?? [];
            $fetch = static function(string $table, string $columns, string $key) use ($pdo, $ids, $schema): array {
                $values = array_values(array_unique(array_filter((array)($ids[$key] ?? []),
                    static fn($v) => is_string($v) && preg_match('/^[a-f0-9-]{36}$/iD', $v))));
                if (!$values) return [];
                $values = array_slice($values, 0, 200);
                try {
                    $q = $pdo->prepare("SELECT $columns FROM $table WHERE id IN (" . implode(',', array_fill(0, count($values), '?')) . ')');
                    $q->execute($values);
                    return $q->fetchAll();
                } catch (PDOException $e) { lwsAdminError($e, $schema); }
            };
            respond(200, [
                'profiles' => $fetch('tvp_profiles', 'id,full_name', 'profiles'),
                'categories' => $fetch('tvp_categories', 'id,name', 'categories'),
                'media' => $fetch('tvp_media', 'id,media_url,alt_text,original_path', 'media'),
            ]);
        }

        // Rubriques administratives.
        if (strpos($op, 'categories.') === 0) {
            $action = substr($op, strlen('categories.'));
            if ($action === 'list') {
                $need('articles.read_all');
                $rows = $pdo->query("SELECT c.id,c.slug,c.name,c.description,c.position,c.parent_id,c.hue,
                    (SELECT COUNT(*) FROM tvp_articles a WHERE a.category_id=c.id) AS article_count
                    FROM tvp_categories c ORDER BY c.position,c.name")->fetchAll();
                foreach ($rows as &$row) { $row['position'] = (int)$row['position']; $row['hue'] = (int)$row['hue']; $row['article_count'] = (int)$row['article_count']; }
                unset($row);
                respond(200, ['items' => $rows]);
            }
            $need('categories.manage');
            if ($action === 'create') {
                if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', (string)($data['slug'] ?? ''))) respond(400, ['error' => 'Lien de rubrique invalide.']);
                if (!isset($data['name']) || mb_strlen((string)$data['name']) < 2 || mb_strlen((string)$data['name']) > 85) respond(400, ['error' => 'Nom de rubrique invalide.']);
                $id = $pdo->query('SELECT UUID()')->fetchColumn();
                $values = [
                    'id' => $id, 'slug' => $data['slug'], 'name' => $data['name'],
                    'description' => (string)($data['description'] ?? ''),
                    'position' => (int)($data['position'] ?? 0),
                    'parent_id' => ($data['parent_id'] ?? null) ?: null,
                    'hue' => (int)($data['hue'] ?? 216),
                ];
                $q = $pdo->prepare('INSERT INTO tvp_categories (' . implode(',', array_keys($values)) . ',created_at,updated_at) VALUES (' .
                    implode(',', array_fill(0, count($values), '?')) . ',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))');
                $q->execute(array_values($values));
                respond(201, ['id' => $id, 'slug' => $values['slug'], 'name' => $values['name']]);
            }
            if (!$isUuid($id)) respond(400, ['error' => 'Rubrique inconnue.']);
            if ($action === 'edit') {
                $parent = ($data['parent_id'] ?? null) ?: null;
                if ($parent === $id) respond(400, ['error' => 'Une rubrique ne peut pas être son propre parent.']);
                if ($parent) {
                    if (!$isUuid($parent)) respond(400, ['error' => 'Rubrique parente invalide.']);
                    $q = $pdo->prepare('SELECT parent_id FROM tvp_categories WHERE id=?');
                    $q->execute([$parent]);
                    $ancestor = $q->fetchColumn();
                    $depth = 0;
                    while ($ancestor && $depth < 30) {
                        if ($ancestor === $id) respond(400, ['error' => 'Hiérarchie circulaire interdite.']);
                        $q->execute([$ancestor]);
                        $ancestor = $q->fetchColumn();
                        $depth++;
                    }
                    if ($depth >= 30) respond(400, ['error' => 'Hiérarchie trop profonde.']);
                }
                $values = [
                    'name' => $data['name'], 'description' => (string)($data['description'] ?? ''),
                    'parent_id' => $parent, 'position' => (int)($data['position'] ?? 0),
                    'hue' => (int)($data['hue'] ?? 216),
                ];
                $q = $pdo->prepare('UPDATE tvp_categories SET ' . implode('=?, ', array_keys($values)) . '=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?');
                $q->execute([...array_values($values), $id]);
                respond(200, ['id' => $id, 'name' => $values['name']]);
            }
            if ($action === 'delete') {
                $pdo->beginTransaction();
                foreach (['tvp_articles' => 'category_id', 'tvp_shows' => 'category_id', 'tvp_categories' => 'parent_id'] as $table => $column) {
                    $q = $pdo->prepare("SELECT COUNT(*) FROM $table WHERE $column=?");
                    $q->execute([$id]);
                    if ((int)$q->fetchColumn() > 0) {
                        $pdo->rollBack();
                        respond(409, ['error' => 'Rubrique utilisée. Déplacez ses articles, ses émissions ou ses sous-rubriques avant suppression.']);
                    }
                }
                $q = $pdo->prepare('DELETE FROM tvp_categories WHERE id=?');
                $q->execute([$id]);
                if (!$q->rowCount()) { $pdo->rollBack(); respond(404, ['error' => 'Rubrique introuvable.']); }
                $pdo->commit();
                respond(200, ['deleted' => true]);
            }
            respond(400, ['error' => 'Action rubrique invalide.']);
        }

        // Médiathèque : les fichiers restent sur Vercel Blob, les fiches passent en MySQL.
        if (strpos($op, 'media.') === 0) {
            $action = substr($op, strlen('media.'));
            $columns = 'id,original_path,media_url,alt_text,caption,credit,mime_type,size_bytes,width_px,height_px,created_at';
            if ($action === 'list') {
                $need('articles.read_all');
                $page = min(500, max(1, (int)($data['page'] ?? 1)));
                $size = min(60, max(1, (int)($data['pageSize'] ?? 32)));
                if (!empty($data['id'])) {
                    if (!$isUuid($data['id'])) respond(400, ['error' => 'Identifiant de média invalide.']);
                    $q = $pdo->prepare("SELECT $columns FROM tvp_media WHERE id=?");
                    $q->execute([$data['id']]);
                    $rows = $q->fetchAll();
                    respond(200, ['items' => array_map('lwsMediaRow', $rows), 'total' => count($rows), 'page' => 1, 'pageSize' => 1]);
                }
                $total = (int)$pdo->query('SELECT COUNT(*) FROM tvp_media')->fetchColumn();
                $q = $pdo->prepare("SELECT $columns FROM tvp_media ORDER BY created_at DESC,id LIMIT $size OFFSET " . (($page - 1) * $size));
                $q->execute();
                respond(200, ['items' => array_map('lwsMediaRow', $q->fetchAll()), 'total' => $total, 'page' => $page, 'pageSize' => $size]);
            }
            if ($action === 'create') {
                $need('media.upload');
                if (empty($data['original_path']) || empty($data['media_url'])) respond(400, ['error' => 'Fichier manquant.']);
                $id = $pdo->query('SELECT UUID()')->fetchColumn();
                $values = [
                    'id' => $id, 'original_path' => $data['original_path'], 'media_url' => $data['media_url'],
                    'alt_text' => (string)($data['alt_text'] ?? ''), 'caption' => (string)($data['caption'] ?? ''),
                    'credit' => (string)($data['credit'] ?? ''), 'mime_type' => (string)($data['mime_type'] ?? ''),
                    'size_bytes' => (int)($data['size_bytes'] ?? 0),
                    'width_px' => (int)($data['width_px'] ?? 0), 'height_px' => (int)($data['height_px'] ?? 0),
                    'uploaded_by' => $actorId,
                ];
                $q = $pdo->prepare('INSERT INTO tvp_media (' . implode(',', array_keys($values)) . ',created_at) VALUES (' .
                    implode(',', array_fill(0, count($values), '?')) . ',UTC_TIMESTAMP(6))');
                $q->execute(array_values($values));
                $q = $pdo->prepare("SELECT $columns FROM tvp_media WHERE id=?");
                $q->execute([$id]);
                respond(201, lwsMediaRow($q->fetch()));
            }
            if ($action === 'delete') {
                $need('media.delete');
                if (!$isUuid($id)) respond(400, ['error' => 'Identifiant de média invalide.']);
                foreach (['tvp_articles' => 'cover_media_id', 'tvp_shows' => 'cover_media_id'] as $table => $column) {
                    $q = $pdo->prepare("SELECT COUNT(*) FROM $table WHERE $column=?");
                    $q->execute([$id]);
                    if ((int)$q->fetchColumn() > 0) respond(409, ['error' => 'Média utilisé par un article ou une émission.']);
                }
                $q = $pdo->prepare('DELETE FROM tvp_media WHERE id=?');
                $q->execute([$id]);
                if (!$q->rowCount()) respond(404, ['error' => 'Média introuvable.']);
                respond(200, ['deleted' => true]);
            }
            respond(400, ['error' => 'Action média invalide.']);
        }

        // Régie du direct (les secrets Restream restent dans le coffre Supabase).
        if ($op === 'live.get' || $op === 'live.save') {
            $need('schedule.manage');
            $fields = 'id,title,description,standby_message,player_platform,playback_url,hls_url,enabled,starts_at,ends_at,updated_at';
            if ($op === 'live.get') {
                $row = $pdo->query("SELECT $fields FROM tvp_live_settings WHERE id=1")->fetch();
                if (!$row) respond(503, ['error' => 'Réglages du direct à initialiser dans la V3.']);
                foreach (['starts_at', 'ends_at', 'updated_at'] as $key) $row[$key] = lwsDate($row[$key]);
                $row['enabled'] = (bool)$row['enabled'];
                respond(200, $row);
            }
            $values = array_intersect_key($data, array_flip(['title', 'description', 'standby_message', 'player_platform', 'playback_url', 'hls_url', 'enabled', 'starts_at', 'ends_at']));
            if (!$values) respond(400, ['error' => 'Aucun réglage fourni.']);
            foreach (['starts_at', 'ends_at'] as $key) {
                if (array_key_exists($key, $values)) {
                    $values[$key] = empty($values[$key]) ? null : (new DateTimeImmutable($values[$key]))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
                }
            }
            $values['enabled'] = (int)(bool)($values['enabled'] ?? 0);
            $values['hls_url'] = '';
            $columns = array_keys($values);
            $q = $pdo->prepare('INSERT INTO tvp_live_settings (id,' . implode(',', $columns) . ',updated_at) VALUES (1,' .
                implode(',', array_fill(0, count($columns), '?')) . ',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE ' .
                implode(',', array_map(static fn(string $column): string => $column . '=VALUES(' . $column . ')', $columns)) . ',updated_at=UTC_TIMESTAMP(6)');
            $q->execute(array_values($values));
            $q = $pdo->query("SELECT $fields FROM tvp_live_settings WHERE id=1");
            $row = $q->fetch();
            foreach (['starts_at', 'ends_at', 'updated_at'] as $key) $row[$key] = lwsDate($row[$key]);
            $row['enabled'] = (bool)$row['enabled'];
            respond(200, $row);
        }

        // Compteurs de lecture : une ligne agrégée par article, aucune écriture Supabase.
        if ($op === 'reads.record' || $op === 'reads.get') {
            if ($op === 'reads.get') {
                $q = $pdo->prepare('SELECT a.id,s.read_count FROM tvp_articles a LEFT JOIN tvp_article_read_stats s ON s.article_id=a.id WHERE ' .
                    (!empty($data['id']) ? 'a.id=?' : 'a.short_code=?'));
                $q->execute([$data['id'] ?? $data['shortCode'] ?? '']);
                $row = $q->fetch();
                respond(200, ['reads' => $row ? (int)($row['read_count'] ?? 0) : 0]);
            }
            $shortCode = (string)($data['shortCode'] ?? '');
            if (!preg_match('/^[A-Za-z0-9_-]{8}$/D', $shortCode)) respond(400, ['error' => 'Article invalide.']);
            $q = $pdo->prepare('SELECT id FROM tvp_articles WHERE short_code=?');
            $q->execute([$shortCode]);
            $articleId = $q->fetchColumn();
            if (!$articleId) respond(404, ['error' => 'Article introuvable.']);
            $q = $pdo->prepare('INSERT INTO tvp_article_read_stats (article_id,read_count,updated_at) VALUES (?,1,UTC_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE read_count=read_count+1,updated_at=UTC_TIMESTAMP(6)');
            $q->execute([$articleId]);
            $q = $pdo->prepare('SELECT read_count FROM tvp_article_read_stats WHERE article_id=?');
            $q->execute([$articleId]);
            respond(200, ['reads' => (int)$q->fetchColumn()]);
        }

        respond(400, ['error' => 'Opération inconnue.']);
    } catch (PDOException $e) {
        if (isset($q) && $pdo->inTransaction()) $pdo->rollBack();
        lwsAdminError($e, $schema);
    }
}
