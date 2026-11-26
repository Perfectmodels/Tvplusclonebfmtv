#!/usr/bin/env bash
# Exécuter dans le terminal cPanel depuis une copie Git authentifiée de main.
set -Eeuo pipefail
umask 077
src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ $# -eq 1 ]] || { echo "Usage: bash install-api.sh /chemin/exact/racine-api-v3" >&2; exit 2; }
root="$(realpath -e -- "$1")"
home="$(realpath -e -- "$HOME")"
[[ -d "$root" && "$root" == "$home/"* && "$root" != "$home/public_html" ]] || { echo "Racine API dédiée requise (pas la racine du site principal)." >&2; exit 2; }
[[ -f "$root/index.php" ]] || { echo "API existante introuvable : vérifier la racine dans cPanel > Domains." >&2; exit 2; }
[[ "$root" != "$src" ]] || exit 2
php_bin="${PHP_BIN:-php}"
files=(api-health.php index.php newsroom.php admin.php programming.php extras.php payments.php studio.php whatsapp.php)
for name in "${files[@]}" check-install.php; do "$php_bin" -l "$src/$name" >/dev/null; done
"$php_bin" "$src/check-install.php" local "$root"
backup="$(mktemp -d "$home/tvplus-api-backup.XXXXXXXX")"
chmod 700 "$backup"
for name in "${files[@]}"; do
 [[ ! -L "$root/$name" ]] || { echo "Lien symbolique inattendu : $name" >&2; exit 2; }
 if [[ -f "$root/$name" ]]; then cp -p -- "$root/$name" "$backup/$name"; fi
done
rollback(){
 local code=$?
 trap - EXIT
 if [[ $code -ne 0 ]]; then
  echo "Contrôle échoué : restauration des fichiers PHP précédents." >&2
  for name in "${files[@]}"; do
   if [[ -f "$backup/$name" ]]; then cp -p -- "$backup/$name" "$root/$name"; else rm -f -- "$root/$name"; fi
  done
 fi
 exit "$code"
}
trap rollback EXIT
for name in api-health.php newsroom.php admin.php programming.php extras.php payments.php studio.php whatsapp.php index.php; do
 tmp="$(mktemp "$root/.api-update.XXXXXXXX")"
 install -m 0644 -- "$src/$name" "$tmp"
 mv -f -- "$tmp" "$root/$name"
done
"$php_bin" "$src/check-install.php" http "$root"
echo "API PHP validée. Sauvegarde privée : $backup"
trap - EXIT
