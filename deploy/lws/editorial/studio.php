<?php
declare(strict_types=1);
// Les opérations passent exclusivement par newsroom(), qui a vérifié le secret du service.
function studioStateSql():string {
 return "CASE WHEN studio_state='scheduled' AND published_at<=UTC_TIMESTAMP(6) THEN 'published' WHEN studio_state IS NOT NULL THEN studio_state WHEN status='published' AND published_at>UTC_TIMESTAMP(6) THEN 'scheduled' WHEN status='published' THEN 'published' ELSE 'draft' END";
}
function studioRow(array $r):array {
 $r['revision']=(int)$r['studio_revision'];$r['duration_seconds']=$r['duration_seconds']===null?null:(int)$r['duration_seconds'];
 $meta=json_decode((string)($r['studio_meta']??'{}'),true);$r['studio_meta']=is_array($meta)?(object)$meta:(object)[];
 foreach(['published_at','updated_at'] as $f)if(!empty($r[$f]))$r[$f]=str_replace(' ','T',$r[$f]).'Z';
 unset($r['studio_revision'],$r['studio_updated_by'],$r['studio_state'],$r['status']);
 return $r;
}
function studioHttps(string $url):bool {
 $u=parse_url($url);return is_array($u)&&($u['scheme']??'')==='https'&&!empty($u['host'])&&!isset($u['user'])&&!isset($u['pass'])&&!isset($u['port'])&&!preg_match('/\s/',$url);
}
function studioSource(string $kind,string $url):bool {
 if(!studioHttps($url))return false;
 $u=parse_url($url);$host=strtolower($u['host']);$path=$u['path']??'';
 if($kind==='podcast')return (bool)preg_match('/\.(mp3|ogg|wav|m4a|aac)$/i',$path)||in_array($host,['open.spotify.com','spotify.com','www.spotify.com','soundcloud.com','www.soundcloud.com','deezer.com','www.deezer.com','podcasts.apple.com'],true);
 return (bool)preg_match('/\.(mp4|webm|m3u8)$/i',$path)||in_array($host,['youtube.com','www.youtube.com','m.youtube.com','youtu.be','facebook.com','www.facebook.com','m.facebook.com','web.facebook.com','fb.watch','tiktok.com','www.tiktok.com','m.tiktok.com','vimeo.com','www.vimeo.com','player.vimeo.com','dailymotion.com','www.dailymotion.com','dai.ly'],true);
}
function studio(PDO $pdo,string $op,array $request):void {
 $actor=(string)($request['actor']['id']??'');$d=$request['data']??[];
 if(!is_array($d)||!preg_match('/^[0-9a-f-]{36}$/i',$actor))respond(403,['error'=>'Accès refusé']);
 $q=$pdo->prepare('SELECT r.permissions FROM tvp_profiles p JOIN tvp_roles r ON r.role_key=p.role WHERE p.id=? AND p.is_active=1');
 $q->execute([$actor]);$permissions=json_decode((string)$q->fetchColumn(),true);
 if(!is_array($permissions))respond(403,['error'=>'Accès refusé']);
 $kind=(string)($d['kind']??'');if(!in_array($kind,['reel','podcast','reportage'],true))respond(400,['error'=>'Format invalide']);
 if(!in_array('shows.manage',$permissions,true)&&!in_array('studio.'.$kind.'_manage',$permissions,true))respond(403,['error'=>'Permission insuffisante']);
 $reviewer=in_array('articles.review',$permissions,true)||in_array('settings.manage',$permissions,true);
 $state=studioStateSql();$select="SELECT *,($state) AS state FROM tvp_editorial_media";
 if($op==='studio.list'){
  $page=max(1,min(10000,(int)($d['page']??1)));$size=20;$offset=($page-1)*$size;
  $q=$pdo->prepare("SELECT ($state) AS state,COUNT(*) AS n FROM tvp_editorial_media WHERE kind=? GROUP BY state");$q->execute([$kind]);$counts=[];foreach($q->fetchAll() as $r)$counts[$r['state']]=(int)$r['n'];
  $where=['kind=?'];$params=[$kind];$filter=(string)($d['state']??'all');
  if($filter!=='all'){if(!in_array($filter,['draft','production','review','approved','scheduled','published','archived'],true))respond(400,['error'=>'Statut invalide']);$where[]="($state)=?";$params[]=$filter;}
  $search=trim((string)($d['q']??''));if($search!==''){$where[]='(LOCATE(?,title)>0 OR LOCATE(?,description)>0 OR LOCATE(?,category)>0)';$params[]=$search;$params[]=$search;$params[]=$search;}
  $w=implode(' AND ',$where);$q=$pdo->prepare('SELECT COUNT(*) FROM tvp_editorial_media WHERE '.$w);$q->execute($params);$total=(int)$q->fetchColumn();
  $q=$pdo->prepare($select.' WHERE '.$w." ORDER BY ".($filter==='scheduled'?'published_at ASC':'updated_at DESC').",id LIMIT $size OFFSET $offset");$q->execute($params);
  respond(200,['items'=>array_map('studioRow',$q->fetchAll()),'total'=>$total,'page'=>$page,'pageSize'=>$size,'counts'=>(object)$counts]);
 }
 $id=(string)($d['id']??'');
 if($op==='studio.get'){
  if(!preg_match('/^[0-9a-f-]{36}$/i',$id))respond(400,['error'=>'Identifiant invalide']);
  $q=$pdo->prepare($select.' WHERE id=? AND kind=?');$q->execute([$id,$kind]);$row=$q->fetch();if(!$row)respond(404,['error'=>'Contenu introuvable']);respond(200,studioRow($row));
 }
 if(!in_array($op,['studio.save','studio.transition'],true))respond(404,['error'=>'Opération inconnue']);
 $pdo->beginTransaction();$row=null;
 if($id!==''){
  if(!preg_match('/^[0-9a-f-]{36}$/i',$id)){$pdo->rollBack();respond(400,['error'=>'Identifiant invalide']);}
  $q=$pdo->prepare($select.' WHERE id=? AND kind=? FOR UPDATE');$q->execute([$id,$kind]);$row=$q->fetch();
  if(!$row){$pdo->rollBack();respond(404,['error'=>'Contenu introuvable']);}
  if(!is_int($d['revision']??null)||(int)$row['studio_revision']!==$d['revision']){$pdo->rollBack();respond(409,['error'=>'Ce contenu a été modifié. Rechargez avant de continuer.']);}
 }
 if($op==='studio.save'){
  // Modifier une publication impose de la retirer explicitement du site et de la revalider.
  if($row&&!in_array($row['state'],['draft','production'],true)){$pdo->rollBack();respond(409,['error'=>'Repasser en production avant de modifier ce contenu.']);}
  $title=trim((string)($d['title']??''));$description=(string)($d['description']??'');$category=(string)($d['category']??'');$source=(string)($d['source_url']??'');$cover=(string)($d['thumbnail_url']??'');$duration=$d['duration_seconds']??null;$meta=$d['studio_meta']??null;
  if(strlen($title)<3||strlen($title)>800||strlen($description)>20000||strlen($category)>400||strlen($source)>1300||strlen($cover)>1300||($source!==''&&!studioSource($kind,$source))||($cover!==''&&!studioHttps($cover))||($duration!==null&&(!is_int($duration)||$duration<1||$duration>864000))||!is_array($meta)){$pdo->rollBack();respond(400,['error'=>'Champs invalides']);}
  $meta=array_intersect_key($meta,array_flip(['series','season','episode','host','guest','journalist','location','credits','caption','keywords','transcript','reportType','relatedArticle']));
  $encoded=json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
  if(strlen($encoded)>100000){$pdo->rollBack();respond(400,['error'=>'Métadonnées trop volumineuses']);}
  $values=[$title,$description,$category,$source,$cover,$duration,$encoded,$actor];
  if($row){$q=$pdo->prepare("UPDATE tvp_editorial_media SET title=?,description=?,category=?,source_url=?,thumbnail_url=?,duration_seconds=?,studio_meta=?,studio_updated_by=?,studio_revision=studio_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?");$q->execute([...$values,$id]);}
  else{$id=$pdo->query('SELECT UUID()')->fetchColumn();$q=$pdo->prepare("INSERT INTO tvp_editorial_media (title,description,category,source_url,thumbnail_url,duration_seconds,studio_meta,studio_updated_by,id,kind,status,studio_state,studio_revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'draft','draft',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");$q->execute([...$values,$id,$kind]);}
 }else{
  if(!$row){$pdo->rollBack();respond(400,['error'=>'Identifiant requis']);}
  $current=$row['state'];$target=(string)($d['target']??'');
  $allowed=match($current){'draft'=>['production','review','archived'],'production'=>['draft','review','archived'],'review'=>$reviewer?['production','approved','archived']:[],'approved'=>$reviewer?['production','published','scheduled','archived']:[],'scheduled','published'=>$reviewer?['production','archived']:[],'archived'=>$reviewer?['draft']:[],default=>[]};
  if(!in_array($target,$allowed,true)){$pdo->rollBack();respond(403,['error'=>'Transition non autorisée']);}
  if(in_array($target,['review','approved','published','scheduled'],true)&&(!studioSource($kind,(string)$row['source_url'])||!studioHttps((string)$row['thumbnail_url']))){$pdo->rollBack();respond(400,['error'=>'Une source média compatible et une couverture HTTPS sont requises.']);}
  $public=in_array($target,['published','scheduled'],true);
  $date=null;
  if($target==='scheduled'){
   try{$when=new DateTimeImmutable((string)($d['publish_at']??''));if($when->getTimestamp()<=time()+60)throw new RuntimeException();$date=$when->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');}catch(Throwable $e){$pdo->rollBack();respond(400,['error'=>'Date future requise']);}
  }
  $q=$pdo->prepare("UPDATE tvp_editorial_media SET studio_state=?,status=?,published_at=CASE WHEN ?='published' THEN UTC_TIMESTAMP(6) ELSE ? END,studio_updated_by=?,studio_revision=studio_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?");
  $q->execute([$target,$public?'published':'draft',$target,$date,$actor,$id]);
 }
 $q=$pdo->prepare($select.' WHERE id=? AND kind=?');$q->execute([$id,$kind]);$saved=$q->fetch();$pdo->commit();respond(200,studioRow($saved));
}
