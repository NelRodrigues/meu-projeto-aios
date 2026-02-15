#!/bin/bash

# Script de Deploy para Vercel
# Uso: ./DEPLOY.sh

echo "🚀 Control Tower - Deploy no Vercel"
echo "===================================="
echo ""

# Verificar se vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não instalado"
    echo "Instala com: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI encontrado"
echo ""

# Verificar autenticação
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Não autenticado no Vercel"
    echo "Fazer login..."
    vercel login
fi

echo ""
echo "📦 Fazendo deploy..."
echo ""

# Deploy
vercel --prod

echo ""
echo "✅ Deploy completo!"
echo ""
echo "🌐 Verifica a URL no output acima"
