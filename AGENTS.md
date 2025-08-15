# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI app (`main.py`) exposing `/api/datasets`, `/api/styles/{dataset_id}`, `/health`. Reads MBTiles from `data/mbtiles/` and styles from `data/styles/`.
- `frontend/`: Static MapLibre app (`index.html`, `js/*.js`, `css/*.css`). JS modules: `app.js`, `layer-controls.js`, `feature-popup.js`, `tile-source.js`. Runtime config: `frontend/config.json`.
- `data/`: Project assets. Put tiles in `data/mbtiles/*.mbtiles`; styles in `data/styles/{dataset_id}_style.json`.
- `config/tileserver.json`: tileserver-gl-light config.  
- `scripts/start_services.sh`: starts tileserver, backend, and static server; logs to `logs/`.

## Build, Test, and Development Commands
- `npm start`: run all services (tileserver on `8080`, backend on `8000`, frontend on `3000`).
- `npm run tileserver`: run tileserver-gl-light with `config/tileserver.json`.
- `npm run backend`: start FastAPI with reload.
- `npm run dev`: serve `frontend/` statically on port 3000.
- `scripts/run_backend_tests.sh`: create venv, install dev deps, run pytest.
- Logs: `tail -f logs/{backend,tileserver,frontend}.log`.

## Coding Style & Naming Conventions
- **Python (backend)**: 4-space indent, type hints, Pydantic models for I/O. Keep module-level constants (`MBTILES_PATH`, `STYLES_PATH`) and small, single-purpose functions (e.g., `extract_mbtiles_metadata`).
- **JavaScript (frontend)**: ES6 classes, 4-space indent. Use existing patterns for IDs: sources `"${datasetId}-source"`, layers `"${datasetId}-${layer.id}"`. Avoid global state except `window.app` initializer.
- **Naming**: dataset IDs are `snake_case` (e.g., `co_power_lines`). Style files must match: `data/styles/co_power_lines_style.json`.

## Testing Guidelines
- Backend tests live in `backend/tests/` (pytest). Run: `scripts/run_backend_tests.sh`.
- Smoke checks:
  - `curl http://localhost:8000/health` → `{ "status": "healthy" }`
  - `curl -I http://localhost:8080/` → `200 OK`
  - Visit `http://localhost:3000` and verify layers load without console errors.

## Commit & Pull Request Guidelines
- **Commits**: imperative and concise (mirroring history), e.g., "Fix railways layer MapLibre dasharray error" or "Implement multi-zoom road styling".
- **PRs must include**: clear description, steps to run (`npm start` or individual commands), screenshots of the map, linked issues, and a note of any data/config files changed.

## Security & Configuration Tips
- Do not commit proprietary `.mbtiles`. Keep large datasets out of git.
- Keep ports (`8080/8000/3000`) consistent with scripts; update both code and `config/tileserver.json` if changed.
- Styles should reference tiles via the backend-adjusted source or `TileSource` helper; do not hardcode external URLs.
