#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-5.6.1}"
JS_URL="https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.js"
CSS_URL="https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.css"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

echo "Downloading MapLibre GL JS ${VERSION}…" 1>&2
curl -sSL "$JS_URL" -o "$tmpdir/maplibre-gl.js"
curl -sSL "$CSS_URL" -o "$tmpdir/maplibre-gl.css"

js_sri="sha384-$(openssl dgst -sha384 -binary "$tmpdir/maplibre-gl.js" | openssl base64 -A)"
css_sri="sha384-$(openssl dgst -sha384 -binary "$tmpdir/maplibre-gl.css" | openssl base64 -A)"

cat <<EOF
<!-- Replace tags in frontend/index.html with the following: -->
<script src="${JS_URL}" integrity="${js_sri}" crossorigin="anonymous"></script>
<link href="${CSS_URL}" rel="stylesheet" integrity="${css_sri}" crossorigin="anonymous" />
EOF
