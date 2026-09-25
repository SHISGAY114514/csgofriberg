#!/usr/bin/env bash
# Disposable Linux production-image acceptance. No host ports, data mounts,
# production secrets, image publishing or shared Redis commands.
set -euo pipefail
image=${1:?Usage: verify-production.sh LOCAL_IMAGE}
root=$(cd "$(dirname "$0")/.." && pwd)
project="soup-release-qa-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-0}"
network="$project-net"
envfile=$(mktemp)
chmod 600 "$envfile"
cleanup() {
  docker rm -f "$project-app" "$project-pg" "$project-redis" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -f "$envfile"
}
trap cleanup EXIT
secret=$(openssl rand -hex 32)
cat > "$envfile" <<EOF
NODE_ENV=production
DB_CLIENT=pg
DB_URL=postgres://qa:$secret@postgres:5432/soup_release_qa
REDIS_URL=redis://redis:6379
REDIS_PREFIX=soup-release-qa:
REDIS_REQUIRED=true
JWT_SECRET=$(openssl rand -hex 32)
GUEST_ID_SALT=$(openssl rand -hex 32)
TRUST_PROXY=true
CORS_ORIGINS=https://soup-release-qa.invalid
GEETEST_CAPTCHA_ID=release-qa-unconnected
GEETEST_PRIVATE_KEY=$(openssl rand -hex 32)
EOF
docker network create "$network" >/dev/null
docker run -d --name "$project-pg" --network "$network" --network-alias postgres \
  -e POSTGRES_USER=qa -e POSTGRES_PASSWORD="$secret" -e POSTGRES_DB=soup_release_qa \
  --tmpfs /var/lib/postgresql/data postgres:17-alpine >/dev/null
docker run -d --name "$project-redis" --network "$network" --network-alias redis \
  redis:7.4-alpine redis-server --save '' --appendonly no >/dev/null
for i in $(seq 1 60); do
  if docker exec "$project-pg" pg_isready -U qa -d soup_release_qa >/dev/null 2>&1 && docker exec "$project-redis" redis-cli ping | grep -q PONG; then break; fi
  sleep 1
done
run() {
  docker run --rm --network "$network" --env-file "$envfile" --read-only --tmpfs /tmp \
    --security-opt no-new-privileges --mount "type=bind,src=$root/scripts/verify-production.cjs,dst=/qa/verify-production.cjs,readonly" "$image" "$@"
}
run server/dist/db/migrate.js
run /qa/verify-production.cjs legacy
run server/dist/db/migrate.js
run server/dist/db/migrate.js
run /qa/verify-production.cjs migration
docker run -d --name "$project-app" --network "$network" --network-alias app \
  --env-file "$envfile" --read-only --tmpfs /tmp --security-opt no-new-privileges "$image" >/dev/null
for i in $(seq 1 60); do
  if docker exec "$project-app" /nodejs/bin/node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then break; fi
  if [ "$i" = 60 ]; then docker logs "$project-app"; exit 1; fi
  sleep 1
done
run /qa/verify-production.cjs http
echo 'PASS disposable production image acceptance (external GeeTest/SMTP and real TLS edge excluded)'
