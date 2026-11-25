<?php
// CLI only: never install this script in a publicly accessible directory.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit(1);}
require_once __DIR__.'/api-health.php';
try{
 if(PHP_VERSION_ID<80100||!extension_loaded('pdo_mysql')||!extension_loaded('curl'))throw new RuntimeException('PHP 8.1+, PDO MySQL et cURL requis');
 $mode=$argv[1]??'';$root=realpath($argv[2]??'');
 if(!$root||!is_dir($root))throw new RuntimeException('Racine API invalide');
 $config=tvplusApiConfig(dirname($root,2).'/tvplus-v3-private.php');
 if($mode==='local'){
  $r=tvplusSchema(tvplusApiPdo($config));echo json_encode($r,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;exit($r['status']==='ok'?0:1);
 }
 if($mode!=='http')throw new RuntimeException('Mode invalide');
 $base='https://api-v3.tvplusafrique.com/';
 $probe=function(string $resource,array $filters=[],?array $payload=null)use($base,$config):array{
  $ch=curl_init($base.'?'.http_build_query(['resource'=>$resource]+$filters));
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>6,CURLOPT_TIMEOUT=>15,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
  if($payload!==null){curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($payload,JSON_THROW_ON_ERROR),CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-TVPlus-Key: '.$config['service_key']]]);}
  $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
  $body=is_string($raw)?json_decode($raw,true):null;
  if($status!==200||!is_array($body))throw new RuntimeException($resource.' : HTTP '.$status.' ou réponse non JSON');
  return $body;
 };
 $h=$probe('health');if(($h['version']??null)!==TVPLUS_API_RELEASE)throw new RuntimeException('La version installée ne correspond pas au domaine API');
 foreach(['articles'=>['limit'=>1],'categories'=>[],'programs'=>[],'episodes'=>['limit'=>1],'media_catalog'=>['kind'=>'reportage','limit'=>1],'schedule'=>[],'ads'=>[],'home_layout'=>[],'premium_plans'=>[]] as $r=>$filters){$probe($r,$filters);echo "OK $r\n";}
 $r=$probe('newsroom',[],['operation'=>'system.health','actor'=>['id'=>'deployment-check','permissions'=>[]]]);
 if(($r['status']??null)!=='ok'||($r['version']??null)!==TVPLUS_API_RELEASE)throw new RuntimeException('Diagnostic privé incomplet');
 echo "OK accès privé et schéma\n";echo json_encode(['archives'=>$r['archives']??[]],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,"Contrôle API échoué. Vérifier PHP, configuration privée, schéma, DNS/HTTPS et racine documentaire.\n");exit(1);}
