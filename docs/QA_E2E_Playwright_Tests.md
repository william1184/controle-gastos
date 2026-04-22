# Plano de Testes E2E (Playwright)

Este documento mapeia as jornadas críticas do usuário na aplicação **Meu Orçamento AI**, definindo os cenários End-to-End (E2E) que devem ser automatizados utilizando o framework Playwright. 

Devido à natureza *local-first* da aplicação (banco de dados SQLite via `absurd-sql` em IndexedDB), os testes E2E assumem um papel vital em garantir que a persistência no navegador e a interface offline operem perfeitamente em diferentes fluxos.

---

## 1. Módulo: Onboarding & Configuração Inicial
**Arquivo de spec sugerido**: `e2e/onboarding.spec.js`

### 1.1 Criação da Primeira Entidade e Usuário
- **Pré-condição**: Aplicação acessada pela primeira vez (IndexedDB limpo).
- **Passos**:
  1. Navegar para a raiz `/`.
  2. Verificar se o formulário "Bem-vindo ao Meu Orçamento AI" é exibido.
  3. Preencher o nome da Entidade (ex: "Família Silva").
  4. Selecionar o tipo de contexto (Pessoal).
  5. Preencher o nome do Usuário (ex: "João").
  6. Submeter o formulário.
- **Resultado Esperado**: O usuário deve ser redirecionado para `/dashboard`. Uma entidade e um usuário devem ser persistidos localmente, e o painel deve exibir "Olá, João".

---

## 2. Módulo: Gestão de Transações
**Arquivo de spec sugerido**: `e2e/transacoes.spec.js`

### 2.1 Inserção Rápida de Nova Despesa (Saída)
- **Pré-condição**: Usuário e contas básicas já configuradas (Setup via `test.beforeEach` injetando DB mock ou completando onboarding).
- **Passos**:
  1. Navegar para `/transacoes/saidas/nova`.
  2. Preencher Descrição ("Supermercado"), Valor ("150,00"), Categoria ("Alimentação"), Conta ("Carteira").
  3. Clicar em "Salvar Gastos".
- **Resultado Esperado**: O sistema redireciona para `/transacoes`. A nova transação de R$ 150,00 com tag de Saída aparece na listagem. O saldo geral no Dashboard deve refletir a dedução.

### 2.2 Inserção de Nova Receita (Entrada)
- **Passos**:
  1. Navegar para `/transacoes/entradas/nova`.
  2. Preencher Descrição ("Salário"), Valor ("5000,00"), Categoria ("Salário").
  3. Salvar a entrada.
- **Resultado Esperado**: A entrada é listada em `/transacoes` e o saldo geral aumenta em R$ 5000,00.

### 2.3 Exclusão de Transação
- **Passos**:
  1. Na listagem de `/transacoes`, clicar no ícone de exclusão/lixeira em uma transação existente.
  2. Confirmar a exclusão no modal.
- **Resultado Esperado**: A transação desaparece da tela e o balanço é recalculado.

---

## 3. Módulo: Resiliência Local (Offline-First)
**Arquivo de spec sugerido**: `e2e/offline.spec.js`

### 3.1 Persistência de Dados Pós-Recarregamento
- **Objetivo**: Garantir que o IndexedDB está segurando a base SQLite.
- **Passos**:
  1. Criar uma transação específica (ex: "Compra Teste Reload").
  2. Realizar um `page.reload()`.
  3. Navegar para `/transacoes`.
- **Resultado Esperado**: A transação "Compra Teste Reload" ainda deve estar visível, provando a persistência do banco em disco (IndexedDB).

---

## 4. Módulo: Gestão de Orçamento (Budget)
**Arquivo de spec sugerido**: `e2e/orcamento.spec.js`

### 4.1 Criação de Limite de Orçamento
- **Passos**:
  1. Navegar para `/orcamento`.
  2. Selecionar o Mês/Ano atual.
  3. Definir o limite para "Lazer" como R$ 300,00.
  4. Criar uma transação de "Lazer" no valor de R$ 350,00.
  5. Voltar à tela de Orçamento.
- **Resultado Esperado**: A barra de progresso da categoria "Lazer" deve indicar que o limite foi ultrapassado (vermelho) com 116% de uso.

---

## 5. Módulo: Integrações (Mocking Recomendado)
**Arquivo de spec sugerido**: `e2e/integracoes.spec.js`

### 5.1 Categorização Inteligente com Gemini (Mock Network)
- **Passos**:
  1. Configurar uma rota de mock (Intercept `page.route`) para a URL da API do Google Gemini, retornando `{"categoria": "Transporte", "confianca": 0.95}`.
  2. Na tela de Nova Saída, preencher a descrição com "Uber Viagem".
  3. Acionar o gatilho de auto-categorização (se houver blur/botão).
- **Resultado Esperado**: O campo Categoria deve ser automaticamente preenchido com "Transporte" sem bater na API real.

### 5.2 Backup para Google Drive
- **Passos**:
  1. Navegar para `/configuracoes`.
  2. Interceptar a chamada HTTP para `googleapis.com/upload/drive...` simulando sucesso `200 OK`.
  3. Clicar no botão "Sincronizar agora".
- **Resultado Esperado**: Uma notificação/toast de sucesso deve aparecer confirmando o envio do backup.

---

---

## 6. Status da Automação (Abril/2026)

| Módulo | Status | Spec File | Notas |
| :--- | :--- | :--- | :--- |
| Onboarding | ✅ Passando | `onboarding.spec.js` | Cobre criação de entidade e fluxo inicial. |
| Transações | ✅ Passando | `transacoes.spec.js` | Testes de CRUD completos com persistência. |
| Offline | ✅ Passando | `offline.spec.js` | Validado via reload de página com dados persistidos. |
| Orçamento | ✅ Passando | `orcamento.spec.js` | Corrigido bug de cálculo de realizado no `orcamentoDb`. |
| Integrações | ✅ Passando | `integracoes.spec.js` | Mock robusto da Gemini API e sincronização de UI via BackgroundTask. |

## Configurações do Playwright para este Projeto
Devido ao uso intenso de IndexedDB, o projeto utiliza a variável de ambiente `NEXT_PUBLIC_CLEAN_DB=true` para garantir que o banco de dados seja limpo antes de cada execução. 

**Comando principal**: `yarn test:e2e:clean`

### Estratégias de Estabilização Utilizadas:
1. **Reset do Banco**: Uso de `indexedDB.deleteDatabase` nos hooks de setup dos testes.
2. **Mocks de Rede**: Interceptação de chamadas `page.route` para APIs externas (Gemini).
3. **Sincronização de UI**: Tratamento de botões de notificação de tarefas em segundo plano ("Visualizar").
4. **Seletores Robustos**: Substituição de seletores frágeis por `.first()` e tags específicas para evitar ambiguidades com elementos ocultos.
