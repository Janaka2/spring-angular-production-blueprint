#!/bin/sh
# Render /config.json and the CSP connect-src from environment variables at container start.
set -eu
HTML=/usr/share/nginx/html
cat > "$HTML/config.json" <<JSON
{ "apiUrl": "${API_URL}", "issuer": "${OIDC_ISSUER}", "clientId": "${OIDC_CLIENT_ID}" }
JSON
origin() { echo "$1" | sed -E 's#^(https?://[^/]+).*#\1#'; }
CSP_CONNECT_SRC="$(origin "$API_URL") $(origin "$OIDC_ISSUER")"
CSP_FORM_ACTION="$(origin "$OIDC_ISSUER")"
sed -i "s#\${CSP_CONNECT_SRC}#${CSP_CONNECT_SRC}#; s#\${CSP_FORM_ACTION}#${CSP_FORM_ACTION}#" /etc/nginx/conf.d/default.conf
echo "config.json rendered: apiUrl=${API_URL} issuer=${OIDC_ISSUER}"
