# NFR - Non-Functional Requirements Document
## Projeto: Meu Orçamento AI

### 1. Desempenho (Performance)
- **RNF01**: As operações de leitura e escrita no banco de dados local devem ser concluídas em menos de 200ms para garantir fluidez na UI.
- **RNF02**: O tempo de carregamento inicial do dashboard não deve ultrapassar 2 segundos após a inicialização do banco.

### 2. Segurança e Privacidade
- **RNF03**: Todos os dados financeiros devem ser armazenados localmente no dispositivo do usuário (IndexedDB via absurd-sql).
- **RNF04**: A sincronização em nuvem deve ser opcional e exigir autenticação OAuth2 via Google.

### 3. Disponibilidade e Confiabilidade
- **RNF05**: O sistema deve funcionar em modo 100% offline para operações de consulta e lançamento.
- **RNF06**: Deve haver um mecanismo de backup binário para evitar perda de dados em caso de limpeza de cache do navegador.

### 4. Usabilidade
- **RNF07**: A interface deve ser responsiva, adaptando-se a diferentes tamanhos de tela (Desktop via Electron e Web).
- **RNF08**: O sistema deve fornecer feedback visual imediato para ações de sucesso ou erro (Notificações).

### 5. Arquitetura e Manutenibilidade
- **RNF09**: Utilização de Next.js para o frontend e SQLite (WebAssembly) para a camada de dados.
- **RNF10**: O código deve seguir os padrões de componentes do React e hooks para gerenciamento de estado.
- **RNF11**: Persistência garantida via `absurd-sql` para contornar limitações de armazenamento volátil do navegador.
