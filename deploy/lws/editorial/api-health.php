<?php
declare(strict_types=1);
const TVPLUS_API_RELEASE='v3-20261125-r2';
function tvplusApiConfig(string $path):array {
 if(!is_file($path)||!is_readable($path))throw new RuntimeException('Private config unavailable');
 $config=require $path;
 if(!is_array($config)||!is_string($config['password']??null)||$config['password']===''||!is_string($config['service_key']??null)||$config['service_key']==='')throw new RuntimeException('Private config incomplete');
 return $config;
}
function tvplusApiPdo(array $config):PDO{
 $pdo=new PDO('mysql:host=localhost;dbname=cp1779864p23_tvplus_v3;charset=utf8mb4','cp1779864p23_tvplus_rw',$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $pdo->exec("SET time_zone = '+00:00'");
 return $pdo;
}
function tvplusSchema(PDO $pdo):array {
 // All probes are read-only. LIMIT 0 checks identifiers without scanning the article archive.
 $probes=[
 'articles'=>'SELECT id,short_code,slug,content_html,video_source_url,province_slug,category_id,cover_media_id,author_id,seo_title,seo_description,featured,is_alert,is_video_article,tags_json,published_at,updated_at FROM tvp_articles LIMIT 0',
 'auth'=>'SELECT id,email,role,password_hash,is_active,first_name,last_name,photo_url,birth_date,phone,city,bio,is_temporary FROM tvp_profiles LIMIT 0',
 'roles'=>'SELECT role_key,permissions FROM tvp_roles LIMIT 0',
 'categories'=>'SELECT id,name,slug,position FROM tvp_categories LIMIT 0',
 'media'=>'SELECT id,media_url,alt_text,caption,credit,size_bytes,uploaded_by,created_at FROM tvp_media LIMIT 0',
 'reads'=>'SELECT article_id,read_count FROM tvp_article_read_stats LIMIT 0',
 'shows'=>'SELECT id,slug,title,host_name,schedule_label,description,tagline,intro_video_url,cover_media_id,is_active,position FROM tvp_shows LIMIT 0',
 'episodes'=>'SELECT id,show_id,platform,external_id,source_url,thumbnail_url,status,aired_at,publish_at,duration_seconds FROM tvp_episodes LIMIT 0',
 'studio'=>'SELECT id,kind,status,studio_state,studio_meta,studio_revision,studio_updated_by,published_at,updated_at FROM tvp_editorial_media LIMIT 0',
 'plans'=>'SELECT slug,name,amount,duration_minutes,active FROM tvp_live_plans LIMIT 0',
 'premium_settings'=>'SELECT checkout_enabled,golive_confirmed,checkout_hosts,return_origin FROM tvp_premium_settings WHERE id=1',
 'payments'=>'SELECT reference,user_id,wallet_id,state,mode,last_checked_at,next_check_at,check_attempts,last_check_result FROM tvp_live_payments LIMIT 0',
 'entitlements'=>'SELECT id,user_id,starts_at,ends_at,status,reference FROM tvp_live_entitlements LIMIT 0',
 'schedule'=>'SELECT weekday,start_time,title,category FROM tvp_program_slots LIMIT 0',
 'ads'=>'SELECT banner,slot,active,starts_at,ends_at FROM tvp_homepage_ad_slots LIMIT 0',
 'layout'=>'SELECT media_order,hidden_media FROM tvp_home_editorial_settings LIMIT 0',
 'restream'=>'SELECT id,account_id,token_ciphertext,expires_at FROM tvp_restream_connections LIMIT 0',
 'newsletter'=>'SELECT id,email,newsletter FROM tvp_newsletter_subscriptions LIMIT 0',
 'contacts'=>'SELECT id,name,email,subject,message FROM tvp_contacts LIMIT 0',
 'questions'=>'SELECT id,name,email,question FROM tvp_questions LIMIT 0',
 'whatsapp'=>'SELECT id FROM tvp_whatsapp_messages LIMIT 0',
 ];
 $checks=[];
 foreach($probes as $label=>$sql){try{$q=$pdo->query($sql);$checks[$label]=($label!=='premium_settings'||(bool)$q->fetch());}catch(Throwable $e){$checks[$label]=false;}}
 $archives=[];
 foreach(['episodes'=>'SELECT COUNT(*) AS total,SUM(legacy_state=1 AND legacy_deleted=0) AS published FROM tvp_legacy_episode_import','videos'=>'SELECT COUNT(*) AS total,SUM(kind=\'reportage\' AND review_state=\'archive_publiee\') AS published,SUM(kind=\'reel\') AS reels_to_review FROM tvp_legacy_video_import'] as $label=>$sql){try{$r=$pdo->query($sql)->fetch();$archives[$label]=array_map('intval',$r?:[]);}catch(Throwable $e){$archives[$label]=null;}}
 return ['status'=>in_array(false,$checks,true)?'incomplete':'ok','version'=>TVPLUS_API_RELEASE,'checks'=>$checks,'archives'=>$archives];
}
