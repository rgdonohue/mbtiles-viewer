#!/bin/bash

# Start Services Script for MBTiles Viewer
# This script starts all required services for the tile viewer application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f --max-time 2 "$url" > /dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "$name failed to start within 30 seconds"
    return 1
}

# Function to cleanup background processes
cleanup() {
    print_warning "Shutting down services..."
    
    if [ ! -z "$TILESERVER_PID" ]; then
        kill $TILESERVER_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Change to project root directory
cd "$(dirname "$0")/.."

print_status "Starting MBTiles Viewer Services..."
echo

# Ensure logs directory exists
mkdir -p logs

# Resolve ports (overridable)
TILESERVER_PORT=${TILESERVER_PORT:-8080}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Build frontend runtime config from environment or defaults (derive from ports if unset)
API_BASE_URL="${API_BASE_URL:-http://localhost:${BACKEND_PORT}/api}"
TILESERVER_BASE_URL="${TILESERVER_BASE_URL:-http://localhost:${TILESERVER_PORT}}"
print_status "Writing frontend/config.json (API: $API_BASE_URL, Tiles: $TILESERVER_BASE_URL)"
cat > frontend/config.json <<EOF
{
  "tileServerBase": "${TILESERVER_BASE_URL}",
  "apiBase": "${API_BASE_URL}"
}
EOF

# Check for required files
print_status "Checking data files..."
for file in data/mbtiles/co_power_lines.mbtiles data/mbtiles/co_railways.mbtiles data/mbtiles/co_roads.mbtiles; do
    if [ ! -f "$file" ]; then
        print_error "Missing required file: $file"
        exit 1
    fi
done
print_success "All data files found"

# Check for required dependencies
print_status "Checking dependencies..."

# Check for tileserver-gl-light
if ! command -v tileserver-gl-light &> /dev/null; then
    print_error "tileserver-gl-light not found. Install with: npm install -g tileserver-gl-light"
    exit 1
fi

# Check for Python and required packages
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not found. Please install Python 3."
    exit 1
fi

# Install Python dependencies if needed
if [ ! -d "backend/venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv backend/venv
fi

print_status "Preparing virtual environment and installing dependencies..."
VENV_DIR="backend/venv"
PY_BIN="$VENV_DIR/bin/python"
if [ ! -x "$PY_BIN" ]; then
  PY_BIN="$VENV_DIR/bin/python3"
fi
"$PY_BIN" -m ensurepip --upgrade >/dev/null 2>&1 || true
"$PY_BIN" -m pip install -q --upgrade pip setuptools wheel
"$PY_BIN" -m pip install -q -r backend/requirements.txt

print_success "Dependencies ready"
echo

# Check if ports are available
print_status "Checking port availability..."
if check_port "$TILESERVER_PORT"; then
    print_warning "Port $TILESERVER_PORT is already in use (tileserver)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:"$TILESERVER_PORT" | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start tileserver on port $TILESERVER_PORT"
        exit 1
    fi
fi

if check_port "$BACKEND_PORT"; then
    print_warning "Port $BACKEND_PORT is already in use (backend API)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:"$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start backend API on port $BACKEND_PORT"
        exit 1
    fi
fi

if check_port "$FRONTEND_PORT"; then
    print_warning "Port $FRONTEND_PORT is already in use (frontend)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:"$FRONTEND_PORT" | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start frontend on port $FRONTEND_PORT"
        exit 1
    fi
fi

print_success "Ports are available"
echo

# Start tileserver-gl-light
print_status "Starting tileserver-gl-light on port $TILESERVER_PORT..."
tileserver-gl-light --config config/tileserver.json --port "$TILESERVER_PORT" > logs/tileserver.log 2>&1 &
TILESERVER_PID=$!
print_success "Tileserver started (PID: $TILESERVER_PID)"

# Wait for tileserver to be ready
wait_for_service "http://localhost:${TILESERVER_PORT}" "Tileserver"

# Start FastAPI backend
print_status "Starting FastAPI backend on port $BACKEND_PORT..."
cd backend
TILESERVER_BASE_URL="$TILESERVER_BASE_URL" uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
print_success "Backend API started (PID: $BACKEND_PID)"

# Wait for backend to be ready
wait_for_service "http://localhost:${BACKEND_PORT}/health" "Backend API"

# Start frontend development server
print_status "Starting frontend server on port $FRONTEND_PORT..."
cd frontend
python3 -m http.server "$FRONTEND_PORT" > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
print_success "Frontend server started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
wait_for_service "http://localhost:${FRONTEND_PORT}" "Frontend"

echo
print_success "All services started successfully!"
echo
echo "Services running:"
echo "  📍 Frontend:     http://localhost:${FRONTEND_PORT}"
echo "  🔌 Backend API:  http://localhost:${BACKEND_PORT}"
echo "  🗺️  Tileserver:   http://localhost:${TILESERVER_PORT}"
echo
echo "API Endpoints:"
echo "  📊 Datasets:     ${API_BASE_URL}/datasets"
echo "  🎨 Styles:       ${API_BASE_URL}/styles/{dataset_id}"
echo "  ❤️  Health:       http://localhost:${BACKEND_PORT}/health"
echo
echo "Logs:"
echo "  Backend:    tail -f logs/backend.log"
echo "  Tileserver: tail -f logs/tileserver.log" 
echo "  Frontend:   tail -f logs/frontend.log"
echo
print_warning "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
