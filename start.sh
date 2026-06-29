#!/bin/bash

cd /home/ubuntu/auto-credit-manager/backend

# Kill existing process if any
pkill -f "node server.js" 2>/dev/null

# Start server
nohup node server.js > server.log 2>&1 &

echo "Server started on http://localhost:3000"
echo "Check logs: tail -f /home/ubuntu/auto-credit-manager/backend/server.log"