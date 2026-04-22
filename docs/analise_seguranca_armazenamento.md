# Análise de Segurança de Armazenamento de Dados

## 1. Visão Geral
O projeto **Meu Orçamento AI** adota uma arquitetura *local-first*, onde a soberania dos dados pertence ao usuário. No entanto, o armazenamento local sem criptografia apresenta riscos específicos que devem ser mitigados.

## 2. Superfície de Ataque e Riscos

### 2.1 Armazenamento Local (IndexedDB)
- **Mecanismo**: SQLite -> absurd-sql -> IndexedDB.
- **Risco**: Os dados financeiros (transações, saldos, nomes de contas) estão armazenados em um arquivo binário SQLite padrão dentro do IndexedDB.
- **Vulnerabilidade**: Se um atacante tiver acesso ao computador do usuário e conseguir abrir as Ferramentas de Desenvolvedor (F12) ou acessar os arquivos de perfil do navegador, poderá extrair o banco de dados completo.

### 2.2 Chaves de API e Configurações Sensíveis
- **Mecanismo**: Tabela `configuracao`.
- **Risco**: Chaves do Google Gemini e Google Drive são armazenadas como strings JSON em texto plano.
- **Vulnerabilidade**: Exposição direta de credenciais que permitem o uso indevido da conta do usuário em serviços de terceiros.

### 2.3 Sincronização em Nuvem (Google Drive)
- **Mecanismo**: Upload do binário `.sqlite` para o Drive via OAuth2.
- **Risco**: O backup no Drive é uma cópia exata do banco local.
- **Vulnerabilidade**: Se a conta Google do usuário for comprometida, o atacante terá acesso total ao histórico financeiro.

## 3. Recomendações e Plano de Ação

### 3.1 Curto Prazo (Imediato)
- [ ] **Ofuscação/Criptografia de Configurações**: Implementar uma camada de criptografia simétrica para chaves de API antes de salvar na tabela `configuracao`.
- [ ] **Limpeza de Memória**: Garantir que chaves sensíveis não fiquem em variáveis globais desnecessariamente.

### 3.2 Médio Prazo
- [ ] **Senha de Acesso**: Implementar uma senha de mestre (Master Password) opcional. Esta senha seria usada para derivar uma chave de criptografia (via PBKDF2) para o banco de dados SQLite (usando extensões como SQLCipher, se compatível com WASM, ou criptografando o binário antes do sync).
- [ ] **Bloqueio de Sessão**: Adicionar um timeout de inatividade para bloquear a interface.

### 3.3 Longo Prazo
- [ ] **SQLCipher**: Migrar para uma versão do SQLite que suporte criptografia nativa (at-rest encryption).

## 4. Conclusão
A arquitetura atual prioriza usabilidade e disponibilidade offline. A implementação de criptografia para chaves de API é o primeiro passo essencial para elevar o nível de segurança sem comprometer a experiência do usuário.
