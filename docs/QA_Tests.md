# Casos de Teste (QA)
## Projeto: Meu Orçamento AI

### 1. Testes de Transações

| ID | Caso de Teste | Pré-condição | Passos | Resultado Esperado |
|:---|:---|:---|:---|:---|
| CT01 | Criar Transação de Saída | Conta e Categoria cadastradas | 1. Ir em Nova Saída<br>2. Preencher valor, conta e categoria<br>3. Salvar | Transação exibida na listagem e saldo da conta reduzido |
| CT02 | Tentar Salvar Transação sem Valor | Nenhuma | 1. Ir em Nova Saída<br>2. Preencher apenas descrição<br>3. Salvar | Sistema deve exibir erro de validação e não salvar |
| CT03 | Gerar Recorrência Mensal | Recorrência ativa | 1. Aguardar data de execução | Nova transação criada automaticamente para o mês atual |

### 2. Testes de Sincronização

| ID | Caso de Teste | Pré-condição | Passos | Resultado Esperado |
|:---|:---|:---|:---|:---|
| CT04 | Sincronizar com Google Drive | Login realizado | 1. Clicar em Sincronizar | Arquivo .sqlite enviado ao Drive com sucesso |
| CT05 | Restaurar Backup do Drive | Arquivo existente no Drive | 1. Selecionar arquivo de backup<br>2. Restaurar | Banco de dados local sobrescrito e página recarregada com novos dados |

### 3. Testes de Orçamento

| ID | Caso de Teste | Pré-condição | Passos | Resultado Esperado |
|:---|:---|:---|:---|:---|
| CT06 | Verificar Alerta de Orçamento Estourado | Gasto > Limite | 1. Definir limite de 100 em 'Lazer'<br>2. Lançar gasto de 120 em 'Lazer' | Sistema deve destacar a categoria como acima do limite no dashboard |

### 4. Testes de Interface (UI/UX)

| ID | Caso de Teste | Pré-condição | Passos | Resultado Esperado |
|:---|:---|:---|:---|:---|
| CT07 | Responsividade Mobile (Sidebar) | Nenhuma | 1. Redimensionar para mobile<br>2. Clicar no menu hamburger | Sidebar deve aparecer como um drawer com overlay escuro |
| CT08 | Visualização de Transações (Mobile) | Transações existentes | 1. Acessar 'Transações' no mobile | A listagem deve ser exibida em Cards (Digital Receipts) em vez de tabela |
| CT11 | Estética Premium (Glassmorphism) | Nenhuma | 1. Verificar Dashboard | Cards devem ter efeito de blur no fundo e sombras suaves (card-premium) |
| CT12 | Animações de Entrada | Nenhuma | 1. Navegar entre páginas | O conteúdo deve subir levemente com fade-in (animate-fade-in-up) |

### 5. Testes de Documentação
| ID | Caso de Teste | Pré-condição | Passos | Resultado Esperado |
|:---|:---|:---|:---|:---|
| CT09 | Acessar Central de Ajuda | Nenhuma | 1. Clicar em 'Ajuda' no menu lateral | Página de ajuda carregada com todas as seções visíveis |
| CT10 | Navegar entre Seções da Ajuda | Página de ajuda aberta | 1. Clicar nos botões de navegação lateral (ex: 'Transações') | O conteúdo central deve atualizar para refletir a seção selecionada |

---

### Observações do QA:
- Priorizar testes de integração para o fluxo de banco de dados (SQLite + IndexedDB).
- Validar se a IA do Gemini está sugerindo categorias coerentes.
- Testar comportamento offline desativando a rede no DevTools.
