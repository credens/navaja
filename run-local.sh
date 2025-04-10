#!/bin/bash
echo "🔧 Instalando dependencias..."
npm install

echo "🛠️ Haciendo build..."
npm run build

echo "🚀 Iniciando servidor en modo producción..."
npm start
