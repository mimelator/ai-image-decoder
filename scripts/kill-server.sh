#!/bin/bash

# Kill any running ai-image-decoder servers on port 8080

PORT=${1:-8080}

echo "Checking for processes on port $PORT..."

# Find PIDs using the port
PIDS=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No process found on port $PORT"
    exit 0
fi

echo "Found processes: $PIDS"
echo "Killing processes..."

for PID in $PIDS; do
    kill -9 $PID 2>/dev/null && echo "  ✅ Killed PID $PID" || echo "  ❌ Failed to kill PID $PID"
done

sleep 1

# Verify
REMAINING=$(lsof -ti :$PORT 2>/dev/null)
if [ -z "$REMAINING" ]; then
    echo "✅ Port $PORT is now free"
else
    echo "⚠️  Some processes may still be running: $REMAINING"
fi

