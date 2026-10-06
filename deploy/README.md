# Docker deployment contract

This directory is the host-side Docker Compose contract for LunaBiner. It is
used twice on the VPS: once for `staging` and once for `production`. Each
environment has a dedicated Compose project, PostgreSQL volume, upload volumes,
cache volume, Traefik router labels, and private environment file.

## Host layout

Keep the checked-in `compose.yml` in an operations directory outside the
application source checkout. Create a different directory and `.env` file for
each environment, for example:

```text
/opt/lunabiner/staging/compose.yml
/opt/lunabiner/staging/.env
/opt/lunabiner/production/compose.yml
/opt/lunabiner/production/.env
```

Copy `deploy/.env.example` to each `.env`, set restrictive permissions, and
never commit those files. Use different random credentials for every database
and use the matching environment-specific image tags.

The existing host-level Traefik service is the only public entry point. Each
environment declares an `APP_HOST`, unique router/service names, and an
internal port `3000` through Docker labels; the application does not publish a
host port. Do not publish PostgreSQL or container port 3000 to the public
internet. Traefik discovers the labels through its read-only Docker socket.

For production, also copy `compose.production.yml` and set the redirect router
variables. This overlay terminates TLS for `lunabiner.tech` and sends a
permanent redirect to `https://lunabiner.com` while preserving the path.

## Deploy sequence

After the CI workflow has published matching immutable image tags:

```sh
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml --profile operations run --rm migrate
docker compose --env-file .env -f compose.yml up -d --remove-orphans
docker compose --env-file .env -f compose.yml ps
```

For production, include the redirect overlay in every command:

```sh
docker compose --env-file .env -f compose.yml -f compose.production.yml pull
docker compose --env-file .env -f compose.yml -f compose.production.yml --profile operations run --rm migrate
docker compose --env-file .env -f compose.yml -f compose.production.yml up -d --remove-orphans
docker compose --env-file .env -f compose.yml -f compose.production.yml ps
```

Run a database backup before a migration that is not known to be additive. A
failed migration must stop the deployment; do not start a new application image
against an unknown schema state.

## Rollback

Change only `APP_IMAGE` and `MIGRATION_IMAGE` to a previously verified matching
commit SHA in the relevant private `.env` file. Pull and run `up -d` again.
Never roll back an image across a destructive database migration without a
tested database restore plan.

## Persistence and backup

`postgres-data`, `portfolio-covers`, and `product-covers` are stateful. Back up
the PostgreSQL database and both upload volumes together; an image registry is
not a backup. The `next-cache` volume is disposable and may be recreated.

This Compose project deliberately does not define an Nginx service. The VPS
already has Traefik and Hermes Docker projects. Configure LunaBiner labels only
after verifying Traefik remains healthy; do not publish service ports as a
workaround for routing errors.

`release.sh` is installed at `/opt/lunabiner/release.sh` by host bootstrap. It
receives the short-lived GitHub Actions registry token on standard input, pulls
the immutable image digest, applies migrations, starts the target Compose
project, then logs out of GHCR. It never stores a registry token on the VPS.
