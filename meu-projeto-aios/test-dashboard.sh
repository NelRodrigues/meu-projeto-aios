#!/bin/bash

echo "🚀 Iniciando teste do Control Tower Dashboard..."
echo ""

# Verificar se o frontend foi compilado
if [ ! -d "frontend/dist" ]; then
    echo "❌ Frontend não foi compilado. Compilando..."
    cd frontend && npm run build && cd ..
fi

# Verificar se os ficheiros estão presentes
if [ ! -f "frontend/dist/index.html" ]; then
    echo "❌ Ficheiros do frontend não encontrados em frontend/dist"
    exit 1
fi

echo "✅ Frontend compilado com sucesso"
echo ""
echo "📊 Ficheiros prontos:"
ls -lh frontend/dist/ | grep -E "index.html|assets" | head -5
echo ""

# Iniciar servidor
echo "🔧 Iniciando servidor Node.js na porta 3000..."
echo "   Acesso: http://localhost:3000"
echo ""
echo "Pressione CTRL+C para parar o servidor"
echo "---"
echo ""

# Executar servidor
node server.js
