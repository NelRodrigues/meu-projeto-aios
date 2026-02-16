#!/bin/bash

# Script de Deploy com Token Vercel
# Uso: ./deploy-with-token.sh "teu_vercel_token_aqui"

if [ -z "$1" ]; then
    echo "❌ Erro: Token não fornecido"
    echo ""
    echo "Uso: ./deploy-with-token.sh 'teu_token_aqui'"
    echo ""
    echo "Para obter o token:"
    echo "1. Abre: https://vercel.com/account/tokens"
    echo "2. Clica: Create Token"
    echo "3. Copia o token"
    echo "4. Executa: ./deploy-with-token.sh 'token_aqui'"
    exit 1
fi

echo "🚀 Deploying to Vercel..."
echo ""

# Export token
export VERCEL_TOKEN="$1"

# Deploy
vercel deploy --prod

echo ""
echo "✅ Deploy completo!"
echo ""
echo "Verifica a URL acima para a tua aplicação online!"
