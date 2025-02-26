#!/bin/bash

PROJECT_DIR="./frontend"
BUILD_DIR="dist"
SERVER_USER="root"
SERVER_IP="knightnav.net"
REMOTE_DIR="/var/www/html"

cd "$PROJECT_DIR" || { echo "Project directory not found!"; exit 1; }

echo "Building the project..."
npm run build || { echo "Build failed!"; exit 1; }

echo "Copying files to server..."
sshpass -f ../pw.txt scp -r "$BUILD_DIR"/* "$SERVER_USER@$SERVER_IP:$REMOTE_DIR" || { echo "File transfer failed!"; exit 1; }

echo "Deployment successful!"