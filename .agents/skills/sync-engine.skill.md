## Objetivo
Sincronizar dados entre dispositivos via cloud (Google Drive / OneDrive)

## Estratégia
- Event sourcing ou CRDT
- Versionamento por registro
- Merge automático

## Fluxo
1. Detectar mudanças locais
2. Serializar em JSON
3. Upload incremental
4. Merge remoto/local

## Conflitos
- Last-write-wins (simples)
- Merge inteligente (preferido)
