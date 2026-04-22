## Princípios
- Offline-first
- Dados locais como fonte da verdade
- Sincronização eventual

## Componentes
- IndexedDB (web layer)
- SQLite (Electron)
- Sync engine
- AI local + cloud opcional

## Fluxo
1. Usuário cria/edita dado
2. Persistência local imediata
3. Marcação como "dirty"
4. Sync assíncrono