# Centre WhatsApp — Infobip / MySQL LWS
## Périmètre intégré
- /admin-v2/whatsapp : rôle settings.manage ; envois manuels de modèles, consentement distinct par finalité, sélection de 1 à 5 contacts, confirmation explicite, historique et réception.
- /api/admin-v2/whatsapp : validation serveur, contrôle des droits, contrôle des consentements en MySQL, identifiant unique de demande avant appel au fournisseur. Aucune relance automatique en cas de timeout.
- /api/whatsapp/webhook : réception authentifiée par Authorization: Bearer <secret>, rapports de livraison et de lecture, STOP global, réponse optionnelle aux messages texte récents avec des liens vers les articles publics. Le robot ne répond pas aux contacts désinscrits. Le stockage des messages entrants doit faire l’objet d’une politique de conservation et d’un accès restreint.
- Aucun accès à Supabase dans ce module. Aucun envoi ou paiement déclenché lors de la livraison du code.
## Installation de test
1. Sauvegarder tvplus_v3 et exécuter deploy/lws/editorial/upgrade-whatsapp.sql sur une base de test. Installer whatsapp.php et la modification de newsroom.php, vérifier PHP lint et droits MySQL.
2. Configurer les variables privées dans Vercel Preview (ne pas copier de clé dans un fichier suivi par Git) :
   INFOBIP_BASE_URL=https://x1zw6q.api.infobip.com
   INFOBIP_WHATSAPP_SENDER=447860088970
   INFOBIP_API_KEY=<clé renouvelée, scope whatsapp:message:send>
   INFOBIP_WEBHOOK_SECRET=<secret aléatoire de 32 caractères ou plus>
   INFOBIP_SEND_ENABLED=false
   INFOBIP_BOT_ENABLED=false
   INFOBIP_APPROVED_TEMPLATES=[]
3. Le numéro partagé et le modèle test_whatsapp_template_en sont destinés à la recette technique. Vérifier les restrictions du compte et l'autorisation du destinataire dans le portail. Ne pas activer les campagnes réelles tant qu'un expéditeur TV+ dédié et les modèles n'ont pas été approuvés. Le modèle test accepte un seul paramètre et un seul destinataire.
4. INFOBIP_APPROVED_TEMPLATES : tableau JSON de modèles corps texte réellement approuvés, par exemple structure (illustrative, pas un modèle approuvé) : [{"purpose":"alert","name":"nom_approuve","language":"fr","label":"Alerte info","parameters":["Titre","Lien"]}]. Les paramètres doivent correspondre exactement au modèle Infobip. Les boutons et en-têtes médias nécessitent une extension de cette structure.
5. Configurer les webhooks de réception, livraison et lecture dans Infobip, vers l'URL HTTPS publique /api/whatsapp/webhook, en ajoutant l'en-tête Authorization: Bearer avec le secret configuré. Tester l'accès public à cette route si Preview est protégée par SSO. Ne pas désactiver la protection globale sans autorisation.
6. Après recette et consentement documenté : activer INFOBIP_SEND_ENABLED=true puis envoyer un seul test manuel. Le statut API « accepté » n'est pas une preuve de livraison. INFOBIP_BOT_ENABLED ne doit être activé qu'après validation du webhook et du numéro dédié.
## À compléter avant mise en service générale
- OTP : aucun changement du parcours de connexion. Nécessite des modèles Authentication approuvés, association téléphone-compte vérifiée, code à usage unique avec expiration, protection anti-bruteforce et procédure de récupération. Ne jamais utiliser le modèle de test comme authentification.
- Paiements Premium : aucun événement de paiement ni notification automatique n'est câblé tant que le prestataire et ses webhooks vérifiés ne sont pas actifs. La finalité premium permet actuellement les envois manuels autorisés.
- Campagnes automatiques, file d'attente de grande capacité, inscription publique à consentement vérifié, journal des réponses automatiques, relance contrôlée, réinscription après STOP, politique de conservation et tableau des coûts à compléter. Aucun envoi automatique à une liste de contacts sans accord.
## Recette
Tester refus anonyme/permission/CSRF, clé manquante, consentement absent, retrait et STOP, double clic/doublon, timeout fournisseur, refus du modèle, rapports en désordre, webhook sans secret, demande ancienne, recherche d'articles existants, responsive mobile. Vérifier tsc et build avant toute fusion.
Références : https://www.infobip.com/docs/tutorials/send-whatsapp-template-messages ; https://www.infobip.com/docs/whatsapp/compliance/user-opt-ins ; https://www.infobip.com/docs/developer-resources/api-fundamentals/webhooks ; https://www.infobip.com/docs/whatsapp/manage-integration/usernames-and-user-ids
