#!/bin/bash
echo "🔧 Instalando dependencias..."
npm install

# 🔐 Corregir vulnerabilidades automáticamente
npm audit fix

echo "🛠️ Haciendo build..."
npm run build

echo "🚀 Iniciando servidor en modo producción..."
npm start
