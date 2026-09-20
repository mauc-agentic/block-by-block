#!/bin/bash

# Script para ejecutar el backend

set -e

echo "🚀 Block by Block Backend"

# Detectar OS
OS_TYPE=$(uname -s)

# Activar venv si existe
if [ -d "venv" ]; then
    echo "📦 Activando venv..."
    if [ "$OS_TYPE" = "Darwin" ] || [ "$OS_TYPE" = "Linux" ]; then
        source venv/bin/activate
    else
        venv\Scripts\activate
    fi
fi

# Verificar .env
if [ ! -f ".env" ]; then
    echo "⚠️  .env no encontrado. Crear desde .env.example"
    cp .env.example .env
    echo "❌ Editar .env con tus valores"
    exit 1
fi

# Instalar dependencias
echo "📥 Instalando dependencias..."
pip install -q -r requirements.txt

# Crear BD si no existe
echo "🗄️  Verificando base de datos..."
# alembic upgrade head  # TODO: Configurar Alembic

# Ejecutar
echo "✅ Iniciando servidor..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
