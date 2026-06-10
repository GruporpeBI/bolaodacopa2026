# Desfazer Mudanças Após Teste - enrich-ids

## ⚠️ IMPORTANTE
As mudanças abaixo foram feitas para TESTAR Portugal vs Nigeria (jogo de amistoso).
Após validar que funciona, REVERTER para o comportamento original (apenas fifa.world).

---

## Mudanças Feitas no Commit `9c1dc51`

### 1. Endpoint ESPN
**ANTES (original):**
```
/sports/soccer/fifa.world/scoreboard
```

**DEPOIS (teste):**
```
/sports/soccer/all/scoreboard
```

**REVERTER PARA:**
```
/sports/soccer/fifa.world/scoreboard
```

Arquivo: `src/app/api/admin/enrich-ids/route.ts` (linha ~101)

---

### 2. Interface EspnEvent
**ANTES (original):**
```typescript
interface EspnEvent {
  id: string;
  competitions: Array<{
    date: string;
    competitors: Array<{ homeAway: string; team: { displayName: string } }>;
  }>;
}
```

**DEPOIS (teste):**
```typescript
interface EspnEvent {
  id: string;
  name?: string;           // "Nigeria at Portugal"
  shortName?: string;      // "NGA @ POR"
  date?: string;           // "2026-06-10T19:45Z"
  competitions?: Array<{
    date: string;
    competitors: Array<{ homeAway: string; team: { displayName: string } }>;
  }>;
}
```

**REVERTER PARA:** (remover name?, shortName?, date?)

Arquivo: `src/app/api/admin/enrich-ids/route.ts` (linha ~90)

---

### 3. Função findEspnEvent
**ANTES (original):**
```typescript
function findEspnEvent(game: GameRow, events: EspnEvent[]): EspnEvent | undefined {
  return events.find((e) => {
    const comp = e.competitions?.[0];
    if (!comp) return false;
    if (!datesMatch(game.scheduled_at, comp.date)) return false;
    const home = comp.competitors?.find((c) => c.homeAway === "home")?.team.displayName ?? "";
    const away = comp.competitors?.find((c) => c.homeAway === "away")?.team.displayName ?? "";
    return (
      (teamsMatch(game.home_team, home) && teamsMatch(game.away_team, away)) ||
      (teamsMatch(game.home_team, away) && teamsMatch(game.away_team, home))
    );
  });
}
```

**DEPOIS (teste):**
Usa matching por `name` e `shortName` (veja commit 9c1dc51)

**REVERTER PARA:** Código original acima

Arquivo: `src/app/api/admin/enrich-ids/route.ts` (linha ~162)

---

## Como Desfazer

### Opção 1: Revert automático (mais fácil)
```bash
git revert 9c1dc51
git push origin master
npx vercel --prod --yes
```

### Opção 2: Manual (se quiser manter histórico)
1. Abra `src/app/api/admin/enrich-ids/route.ts`
2. Reverta as 3 mudanças acima
3. Commit: `git commit -m "revert: enrich-ids volta a usar fifa.world para testes com Copa"`
4. Deploy: `npx vercel --prod --yes`

---

## Quando Desfazer?
- [ ] Após validar que Portugal vs Nigeria funciona em tempo real
- [ ] Após confirmar que ranking/gamecard atualizam corretamente
- [ ] Antes de fazer deploy final para a Copa (24/06 onwards)

## Por Que Desfazer?
O endpoint `/all/scoreboard` retorna **200+ eventos** (amistosos, qualificatórias, etc.), o que:
- ❌ Deixa mais lento (mais comparações)
- ❌ Pode dar falsos positivos (nome de times semelhante em ligas diferentes)
- ✅ Bom apenas para TESTES de amistosos como Portugal vs Nigeria

A Copa do Mundo deve usar `/fifa.world/scoreboard` (apenas ~60 eventos, mais rápido e preciso).

---

## Checkpoint Final

Após desfazer, confirme que:
- ❌ Portugal vs Nigeria (16135568) não aparece em enrich-ids (esperado - não é Copa)
- ✅ Brazil vs Morocco (760419) continua aparecendo e funcionando
- ✅ Polling de TDB continua funcionando (não foi alterado)
