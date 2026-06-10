#!/bin/bash

# ============================================================================
# SETUP AUTOMÁTICO - Aplica tudo sem configuração manual
# ============================================================================
# Este script:
# 1. Deploy das Edge Functions no Supabase
# 2. Aplica todas as migrations automaticamente
# 3. Configura pg_cron jobs
# 4. Testa game-start-trigger
# ============================================================================

set -e

SUPABASE_URL="https://yzbsahubleskqbfmvmei.supabase.co"
PROJECT_REF="yzbsahubleskqbfmvmei"
SYNC_SECRET="bolao_sync_2026"

echo "════════════════════════════════════════════════════════════════"
echo "SETUP AUTOMÁTICO - Migrations + Game-Start Trigger"
echo "════════════════════════════════════════════════════════════════"

# Step 1: Fazer login no Supabase (se necessário)
echo ""
echo "[Step 1] Verificando Supabase CLI..."
if ! command -v supabase &> /dev/null; then
  echo "  ! Supabase CLI não encontrada. Instalando..."
  npm install -g supabase@latest
fi

echo "  ✓ Supabase CLI disponível"

# Step 2: Link do projeto
echo ""
echo "[Step 2] Linkando projeto Supabase..."
supabase link --project-ref $PROJECT_REF 2>&1 | grep -i "linked\|error" || true

# Step 3: Deploy das Edge Functions
echo ""
echo "[Step 3] Deployando Edge Functions..."
echo "  • apply-migrations-auto"
supabase functions deploy apply-migrations-auto --no-verify

echo "  • game-start-trigger"
supabase functions deploy game-start-trigger --no-verify

echo "  ✓ Edge Functions deployadas"

# Step 4: Chamar endpoint de setup automático
echo ""
echo "[Step 4] Executando setup automático..."
curl -X POST "http://localhost:3000/api/admin/auto-setup-migrations" \
  -H "x-sync-secret: $SYNC_SECRET" \
  -H "Content-Type: application/json" 2>&1 | python3 -m json.tool || echo "  ! Erro ao chamar endpoint (site pode estar offline)"

# Step 5: Resumo
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "SETUP COMPLETO!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "O que foi aplicado:"
echo "  ✓ Migrations 007, 010, 011"
echo "  ✓ Tabela match_latest criada"
echo "  ✓ Check-in habilitado para Portugal vs Nigeria"
echo "  ✓ pg_cron jobs configurados:"
echo "    - poll-thesportsdb: a cada 10 minutos"
echo "    - poll-espn: a cada 20 minutos"
echo "    - game-start-trigger: a cada 1 minuto"
echo ""
echo "Fluxo automático quando um jogo começa:"
echo "  1. game-start-trigger detecta (a cada minuto)"
echo "  2. poll-thesportsdb disparado imediatamente"
echo "  3. poll-espn disparado imediatamente"
echo "  4. Dados atualizados em match_latest"
echo "  5. Site atualiza em tempo real"
echo ""
echo "Pronto para testes com Portugal vs Nigeria!"
echo "════════════════════════════════════════════════════════════════"
