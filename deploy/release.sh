#!/usr/bin/env bash
set -euo pipefail

deploy_directory="${1:?deployment directory is required}"
app_image="${2:?application image is required}"
migration_image="${3:?migration image is required}"
deploy_environment="${4:?deployment environment is required}"
ghcr_username="${5:?GHCR username is required}"

case "$deploy_environment" in
  staging|production) ;;
  *)
    echo "Unsupported deployment environment: $deploy_environment" >&2
    exit 1
    ;;
esac

if ! IFS= read -r ghcr_token || [ -z "$ghcr_token" ]; then
  echo "Missing ephemeral GHCR token on standard input." >&2
  exit 1
fi

cleanup() {
  unset ghcr_token
  docker logout ghcr.io >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '%s' "$ghcr_token" | docker login ghcr.io --username "$ghcr_username" --password-stdin >/dev/null
unset ghcr_token

cd "$deploy_directory"
compose_files=(-f compose.yml)
if [ "$deploy_environment" = "production" ]; then
  compose_files+=(-f compose.production.yml)
fi

APP_IMAGE="$app_image" MIGRATION_IMAGE="$migration_image" \
  docker compose --env-file .env "${compose_files[@]}" pull app migrate
APP_IMAGE="$app_image" MIGRATION_IMAGE="$migration_image" \
  docker compose --env-file .env "${compose_files[@]}" --profile operations run --rm migrate
APP_IMAGE="$app_image" MIGRATION_IMAGE="$migration_image" \
  docker compose --env-file .env "${compose_files[@]}" up -d --remove-orphans
APP_IMAGE="$app_image" MIGRATION_IMAGE="$migration_image" \
  docker compose --env-file .env "${compose_files[@]}" ps
