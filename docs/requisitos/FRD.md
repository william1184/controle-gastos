# FRD - Functional Requirements Document
## Projeto: Meu Orçamento AI

### 1. Lista de Funcionalidades

#### 1.1 Gestão de Entidades
- **RF01**: O sistema deve permitir a criação de múltiplas entidades (ex: "Pessoal", "Empresa X").
- **RF02**: Cada entidade deve ser classificada como "Contexto Pessoal" ou "Contexto Empresarial".

#### 1.2 Gestão de Usuários e Contas
- **RF03**: O sistema deve permitir o cadastro de usuários vinculados a uma entidade.
- **RF04**: O sistema deve permitir o cadastro de contas bancárias, carteiras ou cartões de crédito.
- **RF05**: Cada conta deve possuir um saldo inicial.

#### 1.3 Gestão de Transações
- **RF06**: O sistema deve permitir o registro de Entradas (Receitas) e Saídas (Despesas).
- **RF07**: Cada transação deve conter: Data, Descrição, Valor, Categoria, Conta e Usuário.
- **RF08**: O sistema deve permitir a adição de tags e itens detalhados a uma transação.
- **RF09**: O sistema deve suportar transações recorrentes (mensal, semanal, anual).

#### 1.4 Categorização e Orçamento
- **RF10**: O sistema deve permitir a criação de categorias hierárquicas para receitas e despesas.
- **RF11**: O sistema deve permitir a definição de limites de orçamento (budget) por categoria, mês e ano.
- **RF12**: O sistema deve exibir o comparativo entre o valor orçado e o valor realizado.

#### 1.5 Integrações e Sincronização
- **RF13**: O sistema deve permitir a sincronização da base de dados com o Google Drive.
- **RF14**: O sistema deve permitir a importação de dados via arquivos CSV/Excel.
- **RF15**: O sistema deve utilizar IA (Gemini) para sugerir categorias com base na descrição da transação.

### 2. Fluxos de Usuário
- **Seleção de Entidade**: O usuário escolhe o contexto de trabalho ao iniciar o app.
- **Lançamento de Gasto**: Usuário preenche o formulário de saída -> Sistema valida dados -> Persiste no SQLite local.
- **Sincronização**: Usuário clica em "Sincronizar" -> Sistema gera backup binário -> Envia para pasta segura no Drive.

### 3. Matriz de Permissões
- Atualmente, o sistema é monousuário local, sem diferenciação de papéis administrativos, mas suporta múltiplos perfis (usuários) dentro do banco de dados local.
