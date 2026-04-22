# Guia do Usuário - Meu Orçamento AI

Bem-vindo ao **Meu Orçamento AI**, seu gerenciador financeiro inteligente com foco em privacidade e facilidade de uso. Este guia ajudará você a explorar todas as funcionalidades do sistema.

## 1. Primeiros Passos

### Seleção de Entidade
Ao abrir o sistema, você será solicitado a escolher uma **Entidade**. 
- **Pessoal**: Para suas finanças individuais.
- **Empresarial**: Para gerenciar os gastos de uma empresa ou projeto.
Você pode criar novas entidades conforme necessário.

### Usuários e Perfis
Dentro de cada entidade, você pode cadastrar diferentes **Usuários**. Isso permite que uma família ou equipe gerencie finanças em conjunto, mantendo a distinção de quem realizou cada gasto ou recebeu cada renda.

---

## 2. Gerenciando Transações

O coração do sistema é o registro de transações, dividido em **Gastos** (Saídas) e **Rendas** (Entradas).

### Como adicionar uma Transação
1. Vá para o menu **Transações**.
2. Clique em "Nova Saída" ou "Nova Entrada".
3. Preencha o valor, a data e selecione o usuário responsável.
4. **Inteligência Artificial**: Ao digitar a descrição, o sistema pode sugerir automaticamente a categoria mais adequada usando o Google Gemini.

### Importação de Dados
Você pode importar transações em massa utilizando arquivos CSV. O sistema possui um **Importador Inteligente** que ajuda a mapear as colunas do seu arquivo para os campos do sistema.

---

## 3. Categorias e Contas

### Categorias
As categorias ajudam a organizar seus gastos (ex: Alimentação, Moradia, Lazer). Você pode criar, editar ou excluir categorias no menu **Categorias**.

### Contas
Cadastre suas contas bancárias, cartões de crédito ou carteira no menu **Contas**. Cada transação deve ser associada a uma conta para que o saldo seja calculado corretamente.

---

## 4. Planejamento e Orçamentos (Budget)

O módulo de **Orçamento** permite que você defina metas de gastos por categoria para cada mês.
- **Definição de Metas**: Escolha uma categoria e defina o valor máximo que deseja gastar.
- **Acompanhamento**: O sistema mostrará barras de progresso indicando o quanto você já gastou em relação à meta.

---

## 5. Sincronização e Segurança

### Local-First
Seus dados são armazenados localmente no seu navegador/computador usando SQLite. Isso garante privacidade total e funcionamento offline.

### Google Drive Sync
Para não perder seus dados e sincronizar entre diferentes dispositivos:
1. Vá em **Configurações**.
2. Configure a integração com seu **Google Drive**.
3. O sistema fará backups automáticos do seu banco de dados para uma pasta privada no seu Drive.

---

## 6. Inteligência Artificial

O Meu Orçamento AI utiliza o **Google Gemini** para:
- **Categorização Automática**: Sugere categorias baseadas na descrição do gasto.
- **Insights Financeiros**: Analisa seus padrões de gastos e sugere onde você pode economizar (disponível no Dashboard).

---

## Perguntas Frequentes (FAQ)

**Onde meus dados ficam guardados?**
Seus dados ficam guardados apenas no seu dispositivo. Caso você ative a sincronização, uma cópia criptografada será enviada para o seu próprio Google Drive.

**Preciso de internet para usar?**
Não para as funções básicas. A internet é necessária apenas para a sincronização com o Google Drive e para as sugestões da Inteligência Artificial.

**Posso exportar meus dados?**
Sim, você pode exportar seus dados em formato CSV a qualquer momento através do menu de configurações.
