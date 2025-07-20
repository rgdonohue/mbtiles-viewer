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
        if curl -s -f "$url" > /dev/null 2>&1; then
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

print_status "Activating virtual environment and installing dependencies..."
source backend/venv/bin/activate
pip install -q -r backend/requirements.txt

print_success "Dependencies ready"
echo

# Check if ports are available
print_status "Checking port availability..."
if check_port 8080; then
    print_warning "Port 8080 is already in use (tileserver)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start tileserver on port 8080"
        exit 1
    fi
fi

if check_port 8000; then
    print_warning "Port 8000 is already in use (backend API)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start backend API on port 8000"
        exit 1
    fi
fi

if check_port 3000; then
    print_warning "Port 3000 is already in use (frontend)"
    read -p "Kill existing process? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        print_error "Cannot start frontend on port 3000"
        exit 1
    fi
fi

print_success "Ports are available"
echo

# Start tileserver-gl-light
print_status "Starting tileserver-gl-light on port 8080..."
tileserver-gl-light --config config/tileserver.json --port 8080 > logs/tileserver.log 2>&1 &
TILESERVER_PID=$!
print_success "Tileserver started (PID: $TILESERVER_PID)"

# Wait for tileserver to be ready
wait_for_service "http://localhost:8080/health" "Tileserver"

# Start FastAPI backend
print_status "Starting FastAPI backend on port 8000..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
print_success "Backend API started (PID: $BACKEND_PID)"

# Wait for backend to be ready
wait_for_service "http://localhost:8000/health" "Backend API"

# Start frontend development server
print_status "Starting frontend server on port 3000..."
cd frontend
python3 -m http.server 3000 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
print_success "Frontend server started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
wait_for_service "http://localhost:3000" "Frontend"

echo
print_success "All services started successfully!"
echo
echo "Services running:"
echo "  📍 Frontend:     http://localhost:3000"
echo "  🔌 Backend API:  http://localhost:8000"
echo "  🗺️  Tileserver:   http://localhost:8080"
echo
echo "API Endpoints:"
echo "  📊 Datasets:     http://localhost:8000/api/datasets"
echo "  🎨 Styles:       http://localhost:8000/api/styles/{dataset_id}"
echo "  ❤️  Health:       http://localhost:8000/health"
echo
echo "Logs:"
echo "  Backend:    tail -f logs/backend.log"
echo "  Tileserver: tail -f logs/tileserver.log" 
echo "  Frontend:   tail -f logs/frontend.log"
echo
print_warning "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait