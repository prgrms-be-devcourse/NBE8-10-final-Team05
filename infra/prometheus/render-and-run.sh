#!/bin/sh
set -eu

TEMPLATE_PATH="/etc/prometheus/prometheus.yml.tmpl"
RENDERED_PATH="/tmp/prometheus.yml"

: "${BACKEND_SCRAPE_TARGET:=maum-on-back:8080}"
: "${PROMETHEUS_EXTERNAL_URL:=http://localhost:3400/prometheus/}"

sed "s#__BACKEND_SCRAPE_TARGET__#${BACKEND_SCRAPE_TARGET}#g" "$TEMPLATE_PATH" > "$RENDERED_PATH"

exec /bin/prometheus \
  --config.file="$RENDERED_PATH" \
  --storage.tsdb.path=/prometheus \
  --web.enable-lifecycle \
  --web.enable-remote-write-receiver \
  --web.external-url="$PROMETHEUS_EXTERNAL_URL" \
  --web.route-prefix=/
