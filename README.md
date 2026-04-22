# Meu Orçamento AI 🚀

**Meu Orçamento AI** é um gerenciador financeiro moderno, inteligente e focado em privacidade, desenvolvido com uma arquitetura *local-first* e integrado com Inteligência Artificial para facilitar o controle de gastos.

---

## ✨ Principais Funcionalidades

- 🔒 **Privacidade Total**: Arquitetura *local-first* - seus dados financeiros ficam no seu computador.
- 🤖 **IA Inteligente**: Categorização automática de gastos e insights financeiros usando Google Gemini.
- 📱 **Offline-First**: Funciona perfeitamente sem internet, sincronizando quando houver conexão.
- 📊 **Gestão Completa**: Controle de contas, categorias, metas de orçamento e fluxos de caixa.
- 🖥️ **Desktop & Web**: Disponível como aplicação Desktop (Electron) e Web.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [Next.js](https://nextjs.org/) (React)
- **Desktop**: [Electron](https://www.electronjs.org/)
- **Banco de Dados**: SQLite via [absurd-sql](https://github.com/jlongster/absurd-sql) (IndexedDB no navegador)
- **Estilização**: Tailwind CSS
- **IA**: Google Gemini API
- **Testes**: Playwright (E2E) & Jest (Unitários)

---

## 🚀 Como Começar

### Pré-requisitos

- Node.js (v18 ou superior)
- Yarn ou NPM

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/william1184/controle-gastos.git
   cd meu-orcamento-ai
   ```

2. Instale as dependências:
   ```bash
   yarn install
   # ou
   npm install
   ```

3. Instale os navegadores do Playwright (necessário para os testes E2E):
   ```bash
   npx playwright install chromium
   ```

4. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto e adicione sua chave da API do Gemini:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
   ```

---

## 💻 Comandos Disponíveis

### Desenvolvimento

- **Web**: `yarn dev` - Inicia o servidor Next.js em `http://localhost:3000`.
- **Web (Base Limpa)**: `yarn dev:clean` - Inicia limpando o banco de dados local.
- **Desktop**: `yarn electron` - Inicia a aplicação no ambiente Electron.
- **Desktop (Base Limpa)**: `yarn electron:clean` - Inicia o Desktop com banco limpo.

### Construção (Build)

- **Web**: `yarn build` - Gera a build estática do Next.js.
- **Desktop**: `yarn electron:build` - Gera o executável da aplicação.

### Testes

- **Unitários**: `yarn test` - Executa os testes com Jest.
- **E2E (Interface)**: `yarn test:e2e` - Executa os testes de ponta a ponta.
- **E2E (Base Limpa)**: `yarn test:e2e:clean` - Executa testes garantindo banco limpo.
- **Relatório E2E**: `npx playwright show-report` - Exibe os resultados detalhados dos testes.

---

## 🏗️ Arquitetura Local-First

O projeto utiliza os seguintes princípios:
1. **Offline-first**: A aplicação funciona sem conexão.
2. **Dados locais como fonte da verdade**: Os dados são salvos primeiro no SQLite local/IndexedDB.
3. **Persistência imediata**: Cada ação do usuário é gravada instantaneamente para evitar perda de dados.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
