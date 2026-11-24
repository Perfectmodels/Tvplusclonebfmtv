<?php
declare(strict_types=1);

function articleVersion(string $date): string {
    return str_replace(' ', 'T', $date) . 'Z';
}

function articleRow(array $row): array {
    $row['tags'] = json_decode($row['tags_json'] ?? '[]', true);
    $row['content_json'] = json_decode($row['content_json'] ?? 'null', true);
    unset($row['tags_json']);
    foreach (['updated_at', 'created_at', 'published_at', 'reviewed_at'] as $field) {
        if (!empty($row[$field])) $row[$field] = articleVersion($row[$field]);
    }
    foreach (['featured', 'is_alert', 'is_video_article'] as $field) {
        $row[$field] = (bool)$row[$field];
    }
    return $row;
}

function newsroom(PDO $pdo, array $config): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error'=>'Méthode non autorisée']);
    if (empty($config['service_key']) || !hash_equals($config['service_key'], $_SERVER['HTTP_X_TVPLUS_KEY'] ?? '')) {
        respond(403, ['error'=>'Accès refusé']);
    }
    $request = json_decode(file_get_contents('php://input'), true, 32, JSON_THROW_ON_ERROR);
    $op = $request['operation'] ?? '';
    $actor = $request['actor'] ?? [];
    $permissions = $actor['permissions'] ?? [];
    $review = in_array('articles.review', $permissions, true);
    $read = in_array('articles.read_all', $permissions, true);
    $id = $request['id'] ?? '';
    $data = $request['data'] ?? [];
    if (preg_match('/^(auth|profile|users|roles|lookups|dashboard|categories|media|live|reads)\./', $op)) {
        require_once __DIR__.'/admin.php';
        lwsAdmin($pdo, $op, $request);
    }
    if (str_starts_with($op,'shows.') || str_starts_with($op,'episodes.')) {
        require_once __DIR__.'/programming.php'; programming($pdo,$op,$request);
    }
    if ($op === 'publish_due' && in_array('articles.publish_scheduled',$permissions,true)) {
        $q=$pdo->prepare("UPDATE tvp_articles SET status='published',updated_at=UTC_TIMESTAMP(6) WHERE status='scheduled' AND published_at<=UTC_TIMESTAMP(6)");$q->execute();
        respond(200,['published'=>$q->rowCount(),'articles'=>[]]);
    }
    if ($op === 'dashboard' && $read) {
        $counts=array_fill_keys(['published','draft','in_review','approved','scheduled'],0);
        foreach($pdo->query('SELECT status,COUNT(*) n FROM tvp_articles GROUP BY status') as $row) $counts[$row['status']]=(int)$row['n'];
        $recent=$pdo->query('SELECT id,title,slug,status,updated_at FROM tvp_articles ORDER BY updated_at DESC LIMIT 7')->fetchAll();
        foreach($recent as &$row) if($row['updated_at'])$row['updated_at']=articleVersion($row['updated_at']);unset($row);
        respond(200,['published'=>$counts['published'],'drafts'=>$counts['draft'],'review'=>$counts['in_review'],'approved'=>$counts['approved'],'scheduled'=>$counts['scheduled'],'media'=>(int)$pdo->query('SELECT COUNT(*) FROM tvp_media')->fetchColumn(),'categories'=>(int)$pdo->query('SELECT COUNT(*) FROM tvp_categories')->fetchColumn(),'recent'=>$recent]);
    }
    if ($op === 'list' && $read) {
        $where = []; $params = [];
        foreach (['category'=>'category_id','author'=>'author_id','status'=>'status'] as $key=>$field) {
            if (!empty($data[$key])) { $where[] = $field.' = ?'; $params[] = $data[$key]; }
        }
        if (!empty($data['search'])) { $where[] = 'LOCATE(?,title)>0'; $params[] = $data['search']; }
        $filter = $where ? ' WHERE '.implode(' AND ', $where) : '';
        $count = $pdo->prepare('SELECT COUNT(*) FROM tvp_articles'.$filter);
        $count->execute($params);
        $page = min(10000, max(1, (int)($data['page'] ?? 1)));
        $order = ['published'=>'published_at','created'=>'created_at'][$data['sort'] ?? ''] ?? 'updated_at';
        $offset = ($page-1)*18;
        $list = $pdo->prepare("SELECT id, slug, short_code, title, excerpt, status, category_id, cover_media_id, author_id, reviewed_by, featured, is_alert, is_video_article, updated_at, created_at, published_at FROM tvp_articles $filter ORDER BY $order DESC,id LIMIT 18 OFFSET $offset");
        $list->execute($params);
        respond(200, ['items'=>array_map('articleRow', $list->fetchAll()),'total'=>(int)$count->fetchColumn(),'page'=>$page,'pageSize'=>18]);
    }
    if ($op === 'stats' && $read) {
        $counts = array_fill_keys(['published','draft','in_review','approved','scheduled','inactive','archived'],0);
        foreach ($pdo->query('SELECT status,COUNT(*) n FROM tvp_articles GROUP BY status') as $row) $counts[$row['status']] = (int)$row['n'];
        respond(200,['counts'=>$counts,'total'=>array_sum($counts)]);
    }
    if ($op === 'get' && $read) {
        $q=$pdo->prepare('SELECT * FROM tvp_articles WHERE id=?'); $q->execute([$id]);
        $row=$q->fetch();
        if (!$row) respond(404,['error'=>'Article introuvable']);
        respond(200, articleRow($row));
    }
    if (!in_array($op,['create','edit','transition'],true)) respond(403,['error'=>'Accès refusé']);
    if ($op==='create' && !in_array('articles.create',$permissions,true)) respond(403,['error'=>'Création refusée']);
    $pdo->beginTransaction();
    if ($op!=='create') {
        $q=$pdo->prepare('SELECT author_id,status,updated_at FROM tvp_articles WHERE id=? FOR UPDATE'); $q->execute([$id]);
        $old=$q->fetch();
        if (!$old) respond(404,['error'=>'Article introuvable']);
        $own=in_array('articles.edit_own',$permissions,true) && $old['author_id'] === ($actor['id'] ?? '') && in_array($old['status'],['draft','in_review'],true);
        if (!$review && (!$own || ($op==='transition' && ($data['status'] ?? '')!=='in_review'))) respond(403,['error'=>'Modification refusée']);
        if (articleVersion($old['updated_at'])!==($request['expected'] ?? '')) respond(409,['error'=>'Article modifié depuis son ouverture']);
    }
    if ($op==='transition') {
        $values=array_intersect_key($data,array_flip(['status','reviewed_by','reviewed_at','published_at']));
        foreach (['published_at','reviewed_at'] as $key) if (isset($values[$key])) {
            $values[$key]=(new DateTimeImmutable($values[$key]))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
        }
    } else {
        $values=array_intersect_key($data,array_flip(['title','slug','excerpt','content_html','seo_title','seo_description','category_id','cover_media_id','country_code','province_slug']));
        $values['content_json']=json_encode($data['content_json'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $values['tags_json']=json_encode($data['tags'],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $values['is_alert']=(int)$data['is_alert']; $values['featured']=(int)$data['featured'];
        if (array_key_exists('is_video_article',$data)) $values['is_video_article']=(int)(bool)$data['is_video_article'];
        $refs=$request['references'] ?? [];
        foreach (['category'=>['tvp_categories','category_id',['id','slug','name','description','position','parent_id']],
                  'media'=>['tvp_media','cover_media_id',['id','original_path','media_url','alt_text','caption','credit','mime_type','width_px','height_px']]] as $name=>[$table,$field,$columns]) {
            $ref=$refs[$name] ?? null;
            if (!$ref || $ref['id']!==($values[$field] ?? null)) continue;
            $exists=$pdo->prepare("SELECT id FROM $table WHERE id=?"); $exists->execute([$ref['id']]);
            $record=array_intersect_key($ref,array_flip($columns));
            if ($exists->fetchColumn()) {
                unset($record['id']);
                $sync='UPDATE '.$table.' SET '.implode('=?, ',array_keys($record)).'=? WHERE id=?';
                $record[]=$ref['id'];
            } else {
                $sync='INSERT INTO '.$table.' ('.implode(',',array_keys($record)).') VALUES ('.implode(',',array_fill(0,count($record),'?')).')';
            }
            $pdo->prepare($sync)->execute(array_values($record));
        }
        foreach (['category_id'=>'tvp_categories','cover_media_id'=>'tvp_media'] as $field=>$table) if (!empty($values[$field])) {
            $check=$pdo->prepare("SELECT id FROM $table WHERE id=?"); $check->execute([$values[$field]]);
            if (!$check->fetchColumn()) respond(409,['error'=>'Référence de rubrique ou de couverture absente de la V3']);
        }
    }
    if ($op==='create') {
        $id=$pdo->query('SELECT UUID()')->fetchColumn();
        $values+=['id'=>$id,'short_code'=>rtrim(strtr(base64_encode(random_bytes(6)),'+/','-_'),'='),'status'=>'draft','author_id'=>$actor['id']];
        $sql='INSERT INTO tvp_articles ('.implode(',',array_keys($values)).',created_at,updated_at) VALUES ('.implode(',',array_fill(0,count($values),'?')).',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))';
    } else {
        $sql='UPDATE tvp_articles SET '.implode('=?, ',array_keys($values)).'=?, updated_at=UTC_TIMESTAMP(6) WHERE id=?';
        $values[]=$id;
    }
    try {
        $pdo->prepare($sql)->execute(array_values($values));
        $q=$pdo->prepare('SELECT * FROM tvp_articles WHERE id=?'); $q->execute([$id]); $row=$q->fetch();
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (($e->errorInfo[1] ?? 0)===1062) respond(409,['error'=>'Identifiant ou lien déjà utilisé']);
        throw $e;
    }
    respond($op==='create'?201:200,articleRow($row));
}
