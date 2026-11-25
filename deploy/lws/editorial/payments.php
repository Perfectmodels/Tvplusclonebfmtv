<?php
declare(strict_types=1);
function premiumSettings(PDO $pdo):array {
 $r=$pdo->query('SELECT checkout_enabled,golive_confirmed,checkout_hosts,return_origin FROM tvp_premium_settings WHERE id=1')->fetch();
 return ['checkout_enabled'=>(bool)($r['checkout_enabled']??false),'golive_confirmed'=>(bool)($r['golive_confirmed']??false),'checkout_hosts'=>(string)($r['checkout_hosts']??''),'return_origin'=>(string)($r['return_origin']??'')];
}
function premiumCatalog(PDO $pdo):array {
 return ['plans'=>$pdo->query('SELECT slug,name,amount,duration_minutes FROM tvp_live_plans WHERE active=1 ORDER BY duration_minutes,amount')->fetchAll(),'settings'=>premiumSettings($pdo)];
}
function paymentRow(PDO $pdo,string $reference):array {
 $q=$pdo->prepare('SELECT * FROM tvp_live_payments WHERE reference=?');$q->execute([$reference]);$row=$q->fetch();
 if(!$row)respond(404,['error'=>'Transaction introuvable']);
 foreach(['checkout_expires_at','entitlement_ends_at'] as $key)if(!empty($row[$key]))$row[$key]=str_replace(' ','T',$row[$key]).'Z';
 return $row;
}
function payments(PDO $pdo,string $op,array $req):void {
 $actor=(string)($req['actor']['id']??'');$d=$req['data']??[];
 $ref=(string)($d['reference']??'');
 $system=in_array($op,['payments.link','payments.review','payments.settle','payments.claim_due','payments.record_check'],true);
 if($system&&$actor!=='payment-service')respond(403,['error'=>'Accès refusé']);
 if($op==='payments.plans'){
  if($actor!=='public')respond(403,['error'=>'Accès refusé']);
  respond(200,premiumCatalog($pdo));
 }
 if(!$system){
  if(!preg_match('/^[0-9a-f-]{36}$/i',$actor))respond(403,['error'=>'Accès refusé']);
  $q=$pdo->prepare('SELECT role FROM tvp_profiles WHERE id=? AND is_active=1');$q->execute([$actor]);$role=$q->fetchColumn();
  if(!$role)respond(403,['error'=>'Compte inactif']);
  if(in_array($op,['payments.admin','payments.plan_save','payments.admin_get','payments.settings_save'],true)){
   $q=$pdo->prepare('SELECT permissions FROM tvp_roles WHERE role_key=?');$q->execute([$role]);$perms=json_decode((string)$q->fetchColumn(),true);
   if(!is_array($perms)||!in_array('settings.manage',$perms,true))respond(403,['error'=>'Permission insuffisante']);
  }
 }
 if($op==='payments.admin'){
  $plans=$pdo->query('SELECT * FROM tvp_live_plans ORDER BY duration_minutes')->fetchAll();
  $orders=$pdo->query('SELECT reference,user_id,plan_name,amount,state,mode,provider_id,created_at,entitlement_ends_at,last_checked_at,next_check_at,check_attempts,last_check_result FROM tvp_live_payments ORDER BY created_at DESC LIMIT 100')->fetchAll();
  $stats=$pdo->query('SELECT state,COUNT(*) AS count,SUM(amount) AS total FROM tvp_live_payments GROUP BY state')->fetchAll();
  respond(200,['plans'=>$plans,'orders'=>$orders,'stats'=>$stats,'settings'=>premiumSettings($pdo)]);
 }
 if($op==='payments.settings_save'){
  $enabled=$d['checkout_enabled']??null;$confirmed=$d['golive_confirmed']??null;$hosts=trim((string)($d['checkout_hosts']??''));$origin=trim((string)($d['return_origin']??''));
  if(!is_bool($enabled)||!is_bool($confirmed)||strlen($hosts)>1500||strlen($origin)>300)respond(400,['error'=>'Paramètres invalides']);
  foreach(explode(',',$hosts) as $h)if(trim($h)!==''&&!preg_match('/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/D',trim($h)))respond(400,['error'=>'Hôte invalide']);
  if($origin!==''&&!preg_match('#^https://[a-zA-Z0-9.-]+$#D',$origin))respond(400,['error'=>'Origine HTTPS invalide']);
  if($enabled&&(!$confirmed||$hosts===''||$origin===''))respond(400,['error'=>'Confirmez GoLive et renseignez les hôtes et l’origine']);
  $q=$pdo->prepare('INSERT INTO tvp_premium_settings(id,checkout_enabled,golive_confirmed,checkout_hosts,return_origin,updated_at) VALUES(1,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE checkout_enabled=VALUES(checkout_enabled),golive_confirmed=VALUES(golive_confirmed),checkout_hosts=VALUES(checkout_hosts),return_origin=VALUES(return_origin),updated_at=VALUES(updated_at)');
  $q->execute([(int)$enabled,(int)$confirmed,$hosts,$origin]);respond(200,['settings'=>premiumSettings($pdo)]);
 }
 if($op==='payments.plan_save'){
  $slug=(string)($d['slug']??'');$name=trim((string)($d['name']??''));$amount=$d['amount']??null;$duration=$d['duration_minutes']??null;
  if(!preg_match('/^[a-z0-9-]{1,50}$/',$slug)||strlen($name)<2||strlen($name)>400||!is_int($amount)||$amount<1||$amount>1000000||!is_int($duration)||$duration<1||$duration>525600||!is_bool($d['active']??null))respond(400,['error'=>'Offre invalide']);
  $q=$pdo->prepare('INSERT INTO tvp_live_plans(slug,name,amount,duration_minutes,active,updated_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE name=VALUES(name),amount=VALUES(amount),duration_minutes=VALUES(duration_minutes),active=VALUES(active),updated_at=VALUES(updated_at)');
  $q->execute([$slug,$name,$amount,$duration,(int)$d['active']]);respond(200,['saved'=>true]);
 }
 if($op==='payments.claim_due'){
  $wallet=(string)($d['wallet']??'');$mode=(string)($d['mode']??'');
  if(!$wallet||strlen($wallet)>200||!in_array($mode,['sandbox','production'],true))respond(400,['error'=>'Configuration invalide']);
  $pdo->beginTransaction();
  $q=$pdo->prepare("SELECT reference FROM tvp_live_payments WHERE wallet_id=? AND mode=? AND state IN ('reserved','pending','review') AND created_at<=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 60 SECOND) AND (next_check_at IS NULL OR next_check_at<=UTC_TIMESTAMP(6)) ORDER BY COALESCE(next_check_at,created_at),reference LIMIT 3 FOR UPDATE");
  $q->execute([$wallet,$mode]);$refs=$q->fetchAll(PDO::FETCH_COLUMN);$orders=[];
  $claim=$pdo->prepare("UPDATE tvp_live_payments SET next_check_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 5 MINUTE) WHERE reference=?");
  foreach($refs as $reference){$claim->execute([$reference]);$orders[]=paymentRow($pdo,$reference);}
  $pdo->commit();respond(200,['orders'=>$orders]);
 }
 if($op==='payments.mine'){
  $q=$pdo->prepare('SELECT reference,plan_name,amount,state,mode,entitlement_ends_at FROM tvp_live_payments WHERE user_id=? ORDER BY created_at DESC LIMIT 30');$q->execute([$actor]);$orders=$q->fetchAll();foreach($orders as &$item){if(!empty($item['entitlement_ends_at']))$item['entitlement_ends_at']=str_replace(' ','T',$item['entitlement_ends_at']).'Z';}unset($item);respond(200,['orders'=>$orders]);
 }
 if($op==='payments.reserve'){
  $wallet=(string)($d['wallet']??'');$mode=(string)($d['mode']??'');$slug=(string)($d['plan']??'');
  if(!in_array($mode,['sandbox','production'],true)||!$wallet||strlen($wallet)>200||!preg_match('/^[a-z0-9-]{1,50}$/',$slug))respond(400,['error'=>'Demande invalide']);
  $pdo->beginTransaction();
  $q=$pdo->prepare('SELECT id FROM tvp_profiles WHERE id=? AND is_active=1 FOR UPDATE');$q->execute([$actor]);if(!$q->fetchColumn()){$pdo->rollBack();respond(403,['error'=>'Compte inactif']);}
  $q=$pdo->prepare("SELECT reference FROM tvp_live_payments WHERE user_id=? AND mode=? AND (state IN ('reserved','pending','review') OR (state='failed' AND (checkout_expires_at IS NULL OR checkout_expires_at>UTC_TIMESTAMP(6)))) ORDER BY created_at DESC LIMIT 1 FOR UPDATE");$q->execute([$actor,$mode]);$existing=$q->fetchColumn();
  if($existing){$row=paymentRow($pdo,$existing);$pdo->commit();respond(200,['order'=>$row,'fresh'=>false]);}
  if($mode==='production'){$gate=$pdo->query('SELECT checkout_enabled,golive_confirmed FROM tvp_premium_settings WHERE id=1 FOR UPDATE')->fetch();if(!$gate||!$gate['checkout_enabled']||!$gate['golive_confirmed']){$pdo->rollBack();respond(409,['error'=>'Les encaissements ne sont pas ouverts']);}}
  $q=$pdo->prepare('SELECT * FROM tvp_live_plans WHERE slug=? AND active=1 FOR UPDATE');$q->execute([$slug]);$plan=$q->fetch();
  if(!$plan){$pdo->rollBack();respond(404,['error'=>'Offre indisponible']);}
  if((int)$plan['amount']!==($d['amount']??null)||(int)$plan['duration_minutes']!==($d['durationMinutes']??null)){$pdo->rollBack();respond(409,['error'=>'L’offre a changé. Actualisez la page.']);}
  $ref=$pdo->query('SELECT UUID()')->fetchColumn();
  $q=$pdo->prepare("INSERT INTO tvp_live_payments(reference,user_id,plan_slug,plan_name,amount,duration_minutes,wallet_id,mode,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'reserved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
  $q->execute([$ref,$actor,$slug,$plan['name'],$plan['amount'],$plan['duration_minutes'],$wallet,$mode]);$row=paymentRow($pdo,$ref);$pdo->commit();respond(200,['order'=>$row,'fresh'=>true]);
 }
 if(!preg_match('/^[0-9a-f-]{36}$/i',$ref))respond(400,['error'=>'Référence invalide']);
 if($op==='payments.record_check'){
  $result=(string)($d['result']??'');
  if(!in_array($result,['pending','paid','failed','review','provider_error'],true))respond(400,['error'=>'Résultat invalide']);
  $q=$pdo->prepare("UPDATE tvp_live_payments SET last_checked_at=UTC_TIMESTAMP(6),last_check_result=?,check_attempts=check_attempts+1,next_check_at=CASE WHEN state IN ('paid','failed') THEN NULL WHEN check_attempts<6 THEN DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 5 MINUTE) ELSE DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 HOUR) END WHERE reference=?");
  $q->execute([$result,$ref]);respond(200,['recorded'=>true]);
 }
 if($op==='payments.admin_get')respond(200,['order'=>paymentRow($pdo,$ref)]);
 if($op==='payments.get'){$row=paymentRow($pdo,$ref);if($row['user_id']!==$actor)respond(404,['error'=>'Transaction introuvable']);respond(200,['order'=>$row]);}
 if($op==='payments.link'){
  $url=(string)($d['url']??'');if(strlen($url)>2500||!str_starts_with($url,'https://'))respond(400,['error'=>'Lien invalide']);
  $expiry=empty($d['expiresAt'])?null:(new DateTimeImmutable($d['expiresAt']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
  $q=$pdo->prepare("UPDATE tvp_live_payments SET checkout_url=?,checkout_expires_at=?,state='pending',updated_at=UTC_TIMESTAMP(6) WHERE reference=? AND state='reserved'");$q->execute([$url,$expiry,$ref]);respond(200,['saved'=>true]);
 }
 if($op==='payments.review'){
  $pdo->prepare("UPDATE tvp_live_payments SET state='review',updated_at=UTC_TIMESTAMP(6) WHERE reference=? AND state IN ('reserved','pending','review')")->execute([$ref]);respond(200,['saved'=>true]);
 }
 if($op==='payments.settle'){
  $state=$d['state']??'';$providerId=(string)($d['providerId']??'');
  if(!in_array($state,['paid','failed'],true)||strlen($providerId)<1||strlen($providerId)>200)respond(400,['error'=>'Résultat invalide']);
  $initial=paymentRow($pdo,$ref);
  $pdo->beginTransaction();
  $q=$pdo->prepare('SELECT id FROM tvp_profiles WHERE id=? FOR UPDATE');$q->execute([$initial['user_id']]);$q->fetch();
  $q=$pdo->prepare('SELECT * FROM tvp_live_payments WHERE reference=? FOR UPDATE');$q->execute([$ref]);$row=$q->fetch();
  if(!$row||$row['wallet_id']!==($d['wallet']??null)||(int)$row['amount']!==($d['amount']??null)||($row['provider_id']&&$row['provider_id']!==$providerId)){$pdo->rollBack();respond(409,['error'=>'Transaction incohérente']);}
  if($row['state']==='paid'){$saved=paymentRow($pdo,$ref);$pdo->commit();respond(200,['order'=>$saved]);}
  if($state==='paid'&&$row['mode']==='sandbox'){
   $pdo->prepare("UPDATE tvp_live_payments SET state='paid',provider_id=?,updated_at=UTC_TIMESTAMP(6) WHERE reference=?")->execute([$providerId,$ref]);
  }elseif($state==='paid'){
   $q=$pdo->prepare("SELECT GREATEST(UTC_TIMESTAMP(6),COALESCE(MAX(ends_at),UTC_TIMESTAMP(6))) FROM tvp_live_entitlements WHERE user_id=? AND status='active'");$q->execute([$row['user_id']]);$start=$q->fetchColumn();
   $end=(new DateTimeImmutable($start,new DateTimeZone('UTC')))->modify('+'.(int)$row['duration_minutes'].' minutes')->format('Y-m-d H:i:s.u');
   $id=$pdo->query('SELECT UUID()')->fetchColumn();
   $q=$pdo->prepare("INSERT INTO tvp_live_entitlements(id,user_id,starts_at,ends_at,status,reference) VALUES(?,?,?,?,'active',?)");$q->execute([$id,$row['user_id'],$start,$end,$ref]);
   $q=$pdo->prepare("UPDATE tvp_live_payments SET state='paid',provider_id=?,entitlement_ends_at=?,updated_at=UTC_TIMESTAMP(6) WHERE reference=?");$q->execute([$providerId,$end,$ref]);
  }else{$pdo->prepare("UPDATE tvp_live_payments SET state='failed',provider_id=?,updated_at=UTC_TIMESTAMP(6) WHERE reference=?")->execute([$providerId,$ref]);}
  $saved=paymentRow($pdo,$ref);$pdo->commit();respond(200,['order'=>$saved]);
 }
 respond(404,['error'=>'Opération inconnue']);
}
