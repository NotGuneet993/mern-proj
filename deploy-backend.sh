#!/bin/bash

PROJECT_DIR="./backend"
SERVER_USER="root"
SERVER_IP="knightnav.net"
REMOTE_DIR="/var/mernServer"

cd "$PROJECT_DIR" || { echo "Project directory not found!"; exit 1; }

echo "Copying files to server..."
sshpass -f ../pw.txt scp -r *.js "$SERVER_USER@$SERVER_IP:$REMOTE_DIR" || { echo "File transfer failed!"; exit 1; }

echo "Deployment successful!"