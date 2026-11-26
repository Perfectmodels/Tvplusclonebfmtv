<?php
declare(strict_types=1);
function whatsapp(PDO $pdo,string $op,array $request):void {
 $actor=(string)($request['actor']['id']??'');$d=$request['data']??[];
 $system=in_array($op,['whatsapp.inbound','whatsapp.report'],true);
 if($system){if($actor!=='public')respond(403,['error'=>'Accès refusé']);}
 else {
  if(!preg_match('/^[0-9a-f-]{36}$/i',$actor))respond(403,['error'=>'Accès refusé']);
  $q=$pdo->prepare('SELECT r.permissions FROM tvp_profiles p JOIN tvp_roles r ON r.role_key=p.role WHERE p.id=? AND p.is_active=1');$q->execute([$actor]);
  $permissions=json_decode((string)$q->fetchColumn(),true);
  if(!is_array($permissions)||!in_array('settings.manage',$permissions,true))respond(403,['error'=>'Permission insuffisante']);
 }
 $phone=(string)($d['phone']??'');$purpose=(string)($d['purpose']??'');
 $validPhone=static fn($p)=>is_string($p)&&preg_match('/^[1-9][0-9]{7,14}$/',$p);
 $validPurpose=static fn($p)=>in_array($p,['test','alert','newsletter','premium'],true);
 if($op==='whatsapp.overview'){
  $contacts=$pdo->query('SELECT c.phone,c.purpose,c.granted,c.updated_at,IF(o.phone IS NULL,0,1) AS opted_out FROM tvp_whatsapp_consents c LEFT JOIN tvp_whatsapp_optouts o ON o.phone=c.phone ORDER BY c.updated_at DESC LIMIT 300')->fetchAll();
  $messages=$pdo->query('SELECT id,phone,purpose,template,state,provider_status,created_at FROM tvp_whatsapp_messages ORDER BY created_at DESC LIMIT 100')->fetchAll();
  $inbound=$pdo->query('SELECT phone,body,received_at FROM tvp_whatsapp_inbound ORDER BY received_at DESC LIMIT 50')->fetchAll();
  $stats=$pdo->query('SELECT state,COUNT(*) AS count FROM tvp_whatsapp_messages GROUP BY state')->fetchAll();
  respond(200,['contacts'=>$contacts,'messages'=>$messages,'inbound'=>$inbound,'stats'=>$stats]);
 }
 if($op==='whatsapp.consent'||$op==='whatsapp.revoke'){
  if(!$validPhone($phone)||!$validPurpose($purpose))respond(400,['error'=>'Contact invalide']);
  $granted=$op==='whatsapp.consent'?1:0;$proof=trim((string)($d['proof']??''));
  if($granted&&(($d['confirmed']??false)!==true||strlen($proof)<10||strlen($proof)>1000))respond(400,['error'=>'Preuve de consentement requise']);
  if($granted){$q=$pdo->prepare('SELECT phone FROM tvp_whatsapp_optouts WHERE phone=?');$q->execute([$phone]);if($q->fetch())respond(409,['error'=>'Contact désinscrit globalement. Réinscription vérifiée à traiter avant envoi.']);}
  $q=$pdo->prepare('INSERT INTO tvp_whatsapp_consents(phone,purpose,granted,proof,actor_id,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE granted=VALUES(granted),proof=VALUES(proof),actor_id=VALUES(actor_id),updated_at=VALUES(updated_at)');
  $q->execute([$phone,$purpose,$granted,$granted?$proof:'Retrait administratif',$actor]);respond(200,['saved'=>true]);
 }
 if($op==='whatsapp.reserve'){
  $id=(string)($d['requestId']??'');$phones=$d['phones']??[];$template=(string)($d['template']??'');$language=(string)($d['language']??'');
  if(!preg_match('/^[0-9a-f-]{36}$/i',$id)||!$validPurpose($purpose)||!is_array($phones)||count($phones)<1||count($phones)>5||count(array_unique($phones))!==count($phones)||!preg_match('/^[a-z0-9_]{1,100}$/',$template)||!preg_match('/^[a-z]{2,3}(_[A-Z]{2})?$/',$language))respond(400,['error'=>'Demande invalide']);
  $pdo->beginTransaction();
  $q=$pdo->prepare('INSERT IGNORE INTO tvp_whatsapp_requests(id,actor_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6))');$q->execute([$id,$actor]);
  if(!$q->rowCount()){$pdo->rollBack();respond(200,['duplicate'=>true,'rows'=>[]]);}
  $q=$pdo->prepare('SELECT granted FROM tvp_whatsapp_consents WHERE phone=? AND purpose=? FOR UPDATE');
  $optout=$pdo->prepare('SELECT phone FROM tvp_whatsapp_optouts WHERE phone=? FOR UPDATE');
  $insert=$pdo->prepare("INSERT INTO tvp_whatsapp_messages(id,request_id,phone,purpose,template,language,state,actor_id,created_at,updated_at) VALUES (?,?,?,?,?,?,'reserved',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
  $rows=[];
  foreach($phones as $p){
   if(!$validPhone($p)){$pdo->rollBack();respond(400,['error'=>'Numéro invalide']);}
   $optout->execute([$p]);$stopped=$optout->fetchColumn();$q->execute([$p]);
   if($stopped||!(int)$q->fetchColumn()){$pdo->rollBack();respond(409,['error'=>'Au moins un destinataire ne dispose pas du consentement requis. Aucun envoi.']);}
   $mid=$pdo->query('SELECT UUID()')->fetchColumn();$insert->execute([$mid,$id,$p,$purpose,$template,$language,$actor]);$rows[]=['id'=>$mid,'phone'=>$p];
  }
  $pdo->commit();respond(200,['duplicate'=>false,'rows'=>$rows]);
 }
 if($op==='whatsapp.outcome'){
  $q=$pdo->prepare("UPDATE tvp_whatsapp_messages SET state=?,provider_status=?,updated_at=UTC_TIMESTAMP(6) WHERE id=? AND actor_id=? AND state='reserved'");
  foreach(array_slice($d['outcomes']??[],0,5) as $v){if(in_array($v['state']??'', ['accepted','failed','unknown'],true))$q->execute([$v['state'],substr((string)$v['providerStatus'],0,100),$v['id'],$actor]);}
  respond(200,['saved'=>true]);
 }
 if($op==='whatsapp.report'){
  $state=$d['state']??'';$id=(string)($d['id']??'');
  if(!in_array($state,['accepted','delivered','read','failed'],true)||!preg_match('/^[0-9a-f-]{36}$/i',$id))respond(200,['ignored'=>true]);
  $q=$pdo->prepare("UPDATE tvp_whatsapp_messages SET state=?,provider_status=?,updated_at=UTC_TIMESTAMP(6) WHERE id=? AND (state IN ('reserved','unknown','accepted') OR (state='delivered' AND ?='read'))");
  $q->execute([$state,substr((string)($d['providerStatus']??''),0,100),$id,$state]);respond(200,['saved'=>true]);
 }
 if($op==='whatsapp.inbound'){
  $id=(string)($d['id']??'');if(!$validPhone($phone)||strlen($id)<1||strlen($id)>150)respond(400,['error'=>'Événement invalide']);
  $pdo->beginTransaction();
  $q=$pdo->prepare('INSERT IGNORE INTO tvp_whatsapp_inbound(id,phone,body,received_at) VALUES (?,?,?,UTC_TIMESTAMP(6))');
  $q->execute([$id,$phone,(string)($d['text']??'')]);$fresh=$q->rowCount()>0;
  if(($d['stop']??false)===true){$pdo->prepare('INSERT IGNORE INTO tvp_whatsapp_optouts(phone,created_at) VALUES (?,UTC_TIMESTAMP(6))')->execute([$phone]);$pdo->prepare('UPDATE tvp_whatsapp_consents SET granted=0,updated_at=UTC_TIMESTAMP(6) WHERE phone=?')->execute([$phone]);}
  $q=$pdo->prepare('SELECT phone FROM tvp_whatsapp_optouts WHERE phone=?');$q->execute([$phone]);$allowed=!$q->fetchColumn();
  $pdo->commit();respond(200,['fresh'=>$fresh,'allowed'=>$allowed]);
 }
 respond(404,['error'=>'Opération inconnue']);
}
