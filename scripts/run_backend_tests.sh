#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d backend/venv ]; then
  python3 -m venv backend/venv
fi

source backend/venv/bin/activate
pip install -q -r backend/requirements.txt
pip install -q -r backend/dev-requirements.txt

pytest -q backend/tests
