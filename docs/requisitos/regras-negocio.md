# Regras de Negócio (Business Rules)
## Projeto: Meu Orçamento AI

### 1. Transações
- **RN01**: Uma transação não pode ser salva sem um valor maior que zero.
- **RN02**: Toda transação deve estar obrigatoriamente vinculada a uma Conta, uma Categoria e um Usuário.
- **RN03**: Ao excluir uma transação que possui itens detalhados, os itens também devem ser removidos (cascata).
- **RN04**: Transações de "Saída" devem subtrair do saldo da conta, enquanto "Entrada" deve somar.

### 2. Orçamentos (Budgets)
- **RN05**: Não é permitido definir um limite de orçamento negativo para uma categoria.
- **RN06**: Se um orçamento não for definido para um mês específico, o sistema pode sugerir o valor do mês anterior ou considerar zero.
- **RN07**: O cálculo do "Realizado" no orçamento deve considerar apenas transações daquele mês, ano e categoria específica (incluindo subcategorias, se aplicável).

### 3. Recorrências
- **RN08**: Uma recorrência deve gerar automaticamente uma nova transação na data da "Próxima Execução".
- **RN09**: Após a geração da transação, a data da "Próxima Execução" deve ser atualizada com base na frequência (Mensal, Semanal, Anual).

### 4. Categorias
- **RN10**: Não podem existir duas categorias com o mesmo nome e mesmo tipo (Entrada/Saída) sob o mesmo "Parent ID".
- **RN11**: Categorias com transações vinculadas não podem ser excluídas sem que as transações sejam reatribuídas ou excluídas.

### 5. Entidades e Usuários
- **RN12**: Uma entidade deve ter pelo menos um usuário administrador/padrão.
- **RN13**: Não é possível excluir a entidade ativa no momento.
