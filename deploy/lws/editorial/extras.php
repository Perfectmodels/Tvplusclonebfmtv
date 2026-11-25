<?php
declare(strict_types=1);
function publicExtras(PDO $pdo,string $resource): void {
 if($resource==='schedule')respond(200,['items'=>$pdo->query("SELECT weekday,TIME_FORMAT(start_time,'%H:%i') AS time,title,category,0 AS live FROM tvp_program_slots ORDER BY weekday,start_time LIMIT 300")->fetchAll()]);
 if($resource==='ads')respond(200,['items'=>$pdo->query("SELECT banner,slot,advertiser,image_url,target_url,alt,active,starts_at,ends_at FROM tvp_homepage_ad_slots WHERE active=1 AND (starts_at IS NULL OR starts_at<=UTC_TIMESTAMP()) AND (ends_at IS NULL OR ends_at>UTC_TIMESTAMP()) ORDER BY banner,slot")->fetchAll()]);
 if($resource==='home_layout'){$row=$pdo->query('SELECT media_order,hidden_media FROM tvp_home_editorial_settings WHERE id=1')->fetch();respond(200,['order'=>json_decode($row['media_order']??'["reels","ligne-rouge","replays","reportages","podcasts"]',true),'hidden'=>json_decode($row['hidden_media']??'[]',true)]);}
 if($resource==='media_catalog'||$resource==='media_detail'){
  $where=["status='published'","published_at<=UTC_TIMESTAMP()"];$params=[];
  if(isset($_GET['kind'])){if(!in_array($_GET['kind'],['reel','reportage','podcast'],true))respond(400,['error'=>'Format invalide']);$where[]='kind=?';$params[]=$_GET['kind'];}
  if($resource==='media_detail'){$id=(string)($_GET['id']??'');if(!preg_match('/^[0-9a-f-]{36}$/i',$id))respond(400,['error'=>'Identifiant invalide']);$where[]='id=?';$params[]=$id;}
  $limit=max(1,min(100,(int)($_GET['limit']??60)));$offset=max(0,min(1000000,(int)($_GET['offset']??0)));
  $w=implode(' AND ',$where);$q=$pdo->prepare('SELECT COUNT(*) FROM tvp_editorial_media WHERE '.$w);$q->execute($params);$total=(int)$q->fetchColumn();
  $q=$pdo->prepare('SELECT id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,published_at,studio_meta FROM tvp_editorial_media WHERE '.$w." ORDER BY published_at DESC,id LIMIT $limit OFFSET $offset");$q->execute($params);respond(200,['items'=>$q->fetchAll(),'total'=>$total]);
 }
 respond(404,['error'=>'Ressource inconnue']);
}
function adminExtras(PDO $pdo,string $op,array $request): void {
 // Le secret du service a déjà été vérifié par newsroom(). Recharger les permissions en base.
 $actor=(string)($request['actor']['id']??'');$data=$request['data']??[];
 if(in_array($op,['forms.newsletter','forms.contact','forms.question'],true)){
  $map=['forms.newsletter'=>['tvp_newsletter_subscriptions',['email','newsletter']],'forms.contact'=>['tvp_contacts',['name','email','subject','message']],'forms.question'=>['tvp_questions',['name','email','question']]];
  [$table,$fields]=$map[$op];$values=[];
  foreach($fields as $key){if(!is_string($data[$key]??null)||strlen($data[$key])>8000)respond(400,['error'=>'Champs invalides']);$values[]=$data[$key];}
  if(!filter_var($data['email'],FILTER_VALIDATE_EMAIL))respond(400,['error'=>'E-mail invalide']);
  $id=$pdo->query('SELECT UUID()')->fetchColumn();
  $pdo->prepare('INSERT INTO '.$table.' (id,'.implode(',',$fields).',created_at) VALUES (?,'.implode(',',array_fill(0,count($fields),'?')).',UTC_TIMESTAMP(6))')->execute([$id,...$values]);
  respond(201,['id'=>$id,'created_at'=>gmdate('c')]);
 }
 if(!preg_match('/^[0-9a-f-]{36}$/i',$actor))respond(403,['error'=>'Accès refusé']);
 $q=$pdo->prepare('SELECT r.permissions FROM tvp_profiles p JOIN tvp_roles r ON r.role_key=p.role WHERE p.id=? AND p.is_active=1');$q->execute([$actor]);$raw=$q->fetchColumn();
 if(!$raw)respond(403,['error'=>'Accès refusé']);$permissions=json_decode($raw,true)?:[];
 if($op==='entitlements.check'){
  $q=$pdo->prepare("SELECT id FROM tvp_live_entitlements WHERE user_id=? AND status='active' AND starts_at<=UTC_TIMESTAMP() AND ends_at>UTC_TIMESTAMP() LIMIT 1");$q->execute([$actor]);respond(200,['entitled'=>(bool)$q->fetchColumn()]);
 }
 $permission=str_starts_with($op,'catalog.')?'shows.manage':((str_starts_with($op,'schedule.')||str_starts_with($op,'restream.'))?'schedule.manage':'settings.manage');
 if(!in_array($permission,$permissions,true))respond(403,['error'=>'Permission insuffisante']);
 if($op==='restream.get'){$row=$pdo->query('SELECT id,account_id,account_name,token_ciphertext,expires_at,connected_by FROM tvp_restream_connections WHERE id=1')->fetch();respond(200,['item'=>$row?:null]);}
 if($op==='restream.delete'){$pdo->exec('DELETE FROM tvp_restream_connections WHERE id=1');respond(200,['deleted'=>true]);}
 if($op==='restream.save'||$op==='restream.refresh'){
  $cipher=(string)($data['token_ciphertext']??'');if(strlen($cipher)>16000||!preg_match('/^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+$/',$cipher))respond(400,['error'=>'Jeton chiffré invalide']);
  $expires=(new DateTimeImmutable($data['expires_at']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
  if($op==='restream.save'){$q=$pdo->prepare('INSERT INTO tvp_restream_connections(id,account_id,account_name,token_ciphertext,expires_at,connected_by,updated_at) VALUES(1,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE account_id=VALUES(account_id),account_name=VALUES(account_name),token_ciphertext=VALUES(token_ciphertext),expires_at=VALUES(expires_at),connected_by=VALUES(connected_by),updated_at=UTC_TIMESTAMP(6)');$q->execute([(string)$data['account_id'],(string)$data['account_name'],$cipher,$expires,$actor]);}
  else{$q=$pdo->prepare('UPDATE tvp_restream_connections SET token_ciphertext=?,expires_at=?,updated_at=UTC_TIMESTAMP(6) WHERE id=1 AND token_ciphertext=?');$q->execute([$cipher,$expires,(string)($data['expected']??'')]);if($q->rowCount()!==1)respond(409,['error'=>'Connexion modifiée simultanément']);}
  respond(200,['saved'=>true]);
 }
 if($op==='ads.list')respond(200,['items'=>$pdo->query('SELECT * FROM tvp_homepage_ad_slots ORDER BY banner,slot')->fetchAll()]);
 if($op==='ads.save'){
  $b=(int)($data['banner']??0);$s=(int)($data['slot']??0);if($b<1||$b>5||$s<1||$s>5)respond(400,['error'=>'Emplacement invalide']);
  $values=[];foreach(['advertiser','image_url','target_url','alt'] as $f)$values[]=(string)($data[$f]??'');
  $values[]=(int)!empty($data['active']);foreach(['starts_at','ends_at'] as $f)$values[]=empty($data[$f])?null:(new DateTimeImmutable($data[$f]))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
  $q=$pdo->prepare('UPDATE tvp_homepage_ad_slots SET advertiser=?,image_url=?,target_url=?,alt=?,active=?,starts_at=?,ends_at=?,updated_at=UTC_TIMESTAMP(6) WHERE banner=? AND slot=?');$q->execute([...$values,$b,$s]);
  $q=$pdo->prepare('SELECT * FROM tvp_homepage_ad_slots WHERE banner=? AND slot=?');$q->execute([$b,$s]);respond(200,$q->fetch()?:[]);
 }
 if($op==='layout.save'){
  $allowed=['reels','ligne-rouge','replays','reportages','podcasts'];$order=$data['order']??[];$hidden=$data['hidden']??[];
  if(!is_array($order)||!is_array($hidden)||count($order)!==5||count(array_unique($order))!==5||array_diff($order,$allowed)||array_diff($hidden,$allowed))respond(400,['error'=>'Ordre invalide']);
  $pdo->prepare('UPDATE tvp_home_editorial_settings SET media_order=?,hidden_media=? WHERE id=1')->execute([json_encode($order),json_encode($hidden)]);respond(200,['order'=>$order,'hidden'=>$hidden]);
 }
 if($op==='catalog.list')respond(200,['items'=>$pdo->query('SELECT * FROM tvp_editorial_media ORDER BY created_at DESC LIMIT 300')->fetchAll()]);
 if($op==='catalog.create'||$op==='catalog.edit')respond(409,['error'=>'Utilisez le Studio audiovisuel pour créer ou modifier un contenu.']);
 if(false){
  $kind=$data['kind']??'';$status=$data['status']??'';$title=trim((string)($data['title']??''));$url=(string)($data['source_url']??'');
  if(!in_array($kind,['reel','reportage','podcast'],true)||!in_array($status,['draft','published'],true)||strlen($title)<3||strlen($title)>800||!str_starts_with($url,'https://'))respond(400,['error'=>'Champs invalides']);
  $values=[$kind,$title,(string)($data['description']??''),(string)($data['category']??''),$url,(string)($data['thumbnail_url']??''),$data['duration_seconds']??null,$status];
  if($op==='catalog.create'){$id=$pdo->query('SELECT UUID()')->fetchColumn();$pdo->prepare("INSERT INTO tvp_editorial_media (kind,title,description,category,source_url,thumbnail_url,duration_seconds,status,id,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,IF(?='published',UTC_TIMESTAMP(6),NULL),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")->execute([...$values,$id,$status]);}
  else{$id=(string)($request['id']??'');if(!preg_match('/^[0-9a-f-]{36}$/i',$id))respond(400,['error'=>'Identifiant invalide']);$pdo->prepare("UPDATE tvp_editorial_media SET kind=?,title=?,description=?,category=?,source_url=?,thumbnail_url=?,duration_seconds=?,status=?,published_at=IF(?='published',COALESCE(published_at,UTC_TIMESTAMP(6)),NULL),updated_at=UTC_TIMESTAMP(6) WHERE id=?")->execute([...$values,$status,$id]);}
  $q=$pdo->prepare('SELECT * FROM tvp_editorial_media WHERE id=?');$q->execute([$id]);$row=$q->fetch();if(!$row)respond(404,['error'=>'Contenu introuvable']);respond(200,$row);
 }
 respond(404,['error'=>'Opération inconnue']);
}
