#!/bin/bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "Iniciando servidor de Mosal Stickers..."
(sleep 1 && open http://localhost:3000/) &
npm run dev
