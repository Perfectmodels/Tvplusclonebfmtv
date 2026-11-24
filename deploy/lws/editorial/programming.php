<?php
declare(strict_types=1);
function programming(PDO $pdo,string $op,array $request): void {
 if(!in_array('shows.manage',$request['actor']['permissions']??[],true)) respond(403,['error'=>'Permission émissions requise']);
 $show=strpos($op,'shows.')===0;$table=$show?'tvp_shows':'tvp_episodes';$action=substr($op,strpos($op,'.')+1);
 $id=$request['id']??'';$data=$request['data']??[];
 if(!in_array($action,['list','create','edit','delete'],true))respond(400,['error'=>'Action invalide']);
 if(in_array($action,['edit','delete'],true)&&!preg_match('/^[a-f0-9-]{36}$/iD',$id))respond(400,['error'=>'Identifiant invalide']);
 try {
 if($action==='list'){
  $rows=$pdo->query($show?'SELECT * FROM tvp_shows ORDER BY position,title':'SELECT * FROM tvp_episodes ORDER BY aired_at DESC LIMIT 300')->fetchAll();
  foreach($rows as &$row){if($show){$row['is_active']=(bool)$row['is_active'];$row['position']=(int)$row['position'];}else{
   $row['duration_seconds']=$row['duration_seconds']===null?null:(int)$row['duration_seconds'];
   if($row['status']==='draft'&&$row['publish_at']&&strtotime($row['publish_at'].' UTC')<=time())$row['status']='published';
   foreach(['aired_at','publish_at','updated_at'] as $f)if($row[$f])$row[$f]=articleVersion($row[$f]);
  }}unset($row);respond(200,['items'=>$rows]);
 }
 $pdo->beginTransaction();
 if($action==='delete'){
  if($show){$q=$pdo->prepare('SELECT id FROM tvp_shows WHERE id=? FOR UPDATE');$q->execute([$id]);if(!$q->fetchColumn())respond(404,['error'=>'Émission introuvable']);
   $q=$pdo->prepare('SELECT COUNT(*) FROM tvp_episodes WHERE show_id=?');$q->execute([$id]);if($q->fetchColumn()>0)respond(409,['error'=>'Cette émission possède des replays.']);}
  $q=$pdo->prepare("DELETE FROM $table WHERE id=?");$q->execute([$id]);if(!$q->rowCount())respond(404,['error'=>'Contenu introuvable']);
  $pdo->commit();respond(200,['deleted'=>true]);
 }
 $fields=$show?['slug','title','tagline','description','schedule_label','host_name','frequency','category_id','cover_media_id','is_active','position']:['show_id','title','description','aired_at','duration_seconds','platform','external_id','source_url','thumbnail_url','publish_at','status'];
 $values=array_intersect_key($data,array_flip($fields));
 if($show){
  $values['is_active']=(int)(bool)$values['is_active'];
  foreach(['category_id'=>'tvp_categories','cover_media_id'=>'tvp_media'] as $field=>$target)if(!empty($values[$field])){
   $q=$pdo->prepare("SELECT id FROM $target WHERE id=?");$q->execute([$values[$field]]);
   if(!$q->fetchColumn()){
    $ref=$request['references'][$field==='category_id'?'category':'media']??null;
    $cols=$field==='category_id'?['id','slug','name','description','position','parent_id']:['id','original_path','media_url','alt_text','caption','credit','mime_type','width_px','height_px'];
    if(!$ref||$ref['id']!==$values[$field])respond(409,['error'=>'Rubrique ou couverture absente de MySQL']);
    $record=array_intersect_key($ref,array_flip($cols));
    $pdo->prepare("INSERT INTO $target (".implode(',',array_keys($record)).") VALUES (".implode(',',array_fill(0,count($record),'?')).")")->execute(array_values($record));
   }
  }
 }else{
  $q=$pdo->prepare('SELECT id FROM tvp_shows WHERE id=? FOR UPDATE');$q->execute([$values['show_id']]);if(!$q->fetchColumn())respond(409,['error'=>'Émission introuvable dans MySQL']);
  foreach(['aired_at','publish_at'] as $f)$values[$f]=empty($values[$f])?null:(new DateTimeImmutable($values[$f]))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
 }
 if($action==='create'){$id=$pdo->query('SELECT UUID()')->fetchColumn();$values['id']=$id;
  $q=$pdo->prepare("INSERT INTO $table (".implode(',',array_keys($values)).",created_at,updated_at) VALUES (".implode(',',array_fill(0,count($values),'?')).",UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
 }else{$q=$pdo->prepare("SELECT id FROM $table WHERE id=? FOR UPDATE");$q->execute([$id]);if(!$q->fetchColumn())respond(404,['error'=>'Contenu introuvable']);
  $q=$pdo->prepare("UPDATE $table SET ".implode('=?, ',array_keys($values))."=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?");$values[]=$id;}
 $q->execute(array_values($values));$pdo->commit();respond($action==='create'?201:200,['id'=>$id,'title'=>$data['title'],'slug'=>$data['slug']??null]);
 }catch(PDOException $e){if($pdo->inTransaction())$pdo->rollBack();if(($e->errorInfo[1]??0)===1062)respond(409,['error'=>'Identifiant ou lien déjà utilisé']);if(in_array(($e->errorInfo[1]??0),[1054,1146],true))respond(503,['error'=>'Schéma MySQL émissions/replays à mettre en conformité.']);throw $e;}
}
