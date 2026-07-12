#!/usr/bin/env sh
# =============================================================================
# install-piston-packages.sh
#
# One-time setup: installs all language runtimes into the running Piston
# container. Run this ONCE after `docker compose up -d`.
#
# Packages are stored in the `piston_packages` Docker volume and survive
# container restarts — you never need to run this again unless you add a
# new language.
#
# Usage:
#   chmod +x scripts/install-piston-packages.sh
#   ./scripts/install-piston-packages.sh
#
# Or if Piston is on a non-default port:
#   PISTON_URL=http://localhost:2000 ./scripts/install-piston-packages.sh
# =============================================================================

PISTON_URL="${PISTON_URL:-http://localhost:2000}"
PACKAGES_URL="$PISTON_URL/api/v2/packages"

echo "🔌 Connecting to Piston at $PISTON_URL ..."

# Wait until Piston is healthy (up to 60s)
for i in $(seq 1 12); do
  if wget -qO- "$PISTON_URL/api/v2/runtimes" > /dev/null 2>&1; then
    echo "✅ Piston is up."
    break
  fi
  echo "   Waiting for Piston to start... ($i/12)"
  sleep 5
  if [ "$i" -eq 12 ]; then
    echo "❌ Piston did not become healthy in 60s. Is the container running?"
    exit 1
  fi
done

install_package() {
  LANG=$1
  VER=$2
  echo "📦 Installing $LANG $VER ..."
  RESULT=$(wget -qO- --post-data="{\"language\":\"$LANG\",\"version\":\"$VER\"}" \
    --header="Content-Type: application/json" \
    "$PACKAGES_URL" 2>&1)
  echo "   → $RESULT"
}

# ── Core languages ────────────────────────────────────────────────────────────
install_package python     3.10.0
install_package javascript 18.15.0   # Node.js
install_package java       15.0.2
install_package c++        10.2.0
install_package c          10.2.0
install_package r          4.1.1

# ── Verify ───────────────────────────────────────────────────────────────────
echo ""
echo "✅ Installed runtimes:"
wget -qO- "$PISTON_URL/api/v2/runtimes" | \
  grep -o '"language":"[^"]*","version":"[^"]*"' | \
  sed 's/"language":"//;s/","version":" / /;s/"//'

echo ""
echo "🎉 Done! Your Piston instance is ready for offline code execution."
echo "   Test it: curl -X POST $PISTON_URL/api/v2/execute \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"language\":\"python\",\"version\":\"*\",\"files\":[{\"content\":\"print(\\\"hello\\\")\"}]}'"
