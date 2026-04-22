# GDD - Global Design Document
## Projeto: Meu Orçamento AI

### 1. Documento de Design Global
Este documento serve como a fonte única de verdade para o design, arquitetura e funcionalidades do sistema Meu Orçamento AI.

### 2. Visão do Produto
Um gerenciador financeiro local-first, com sincronização em nuvem e inteligência artificial para categorização automática.

### 3. Arquitetura Técnica
- **Frontend**: Next.js (React)
- **Runtime**: Electron (para desktop) e Browser (Web)
- **Banco de Dados**: SQLite compilado em WebAssembly (sql.js)
- **Persistência**: absurd-sql (IndexedDB como backend para SQLite)
- **Sincronização**: Google Drive API
- **IA**: Google Gemini API (para sugestão de categorias e insights)

### 4. Estrutura de Pastas Principal
- `/src/app`: Rotas e páginas do Next.js.
- `/src/lib`: Serviços de banco de dados, utilitários de IA e sincronização.
- `/src/components`: Componentes de interface reutilizáveis.
- `/docs`: Documentação de requisitos, processos e testes.

### 5. Histórico de Funcionalidades Implementadas
- [x] Inicialização de Banco de Dados SQLite no Navegador.
- [x] CRUD de Transações (Entradas/Saídas).
- [x] Gestão de Contas e Categorias.
- [x] Sistema de Orçamento (Budget).
- [x] Sincronização com Google Drive.
- [x] Integração com Gemini para categorização.
- [x] Suporte a múltiplas entidades e usuários.
- [x] Documentação do Usuário e Central de Ajuda Integrada.
- [x] Modernização Premium UX/UI (Design Tokens, Glassmorphism, Responsividade Total).
- [x] Estabilização de Testes E2E (Playwright) com reset de banco e mocks de IA.
- [x] Padronização de Configurações (Migração de storeDb para configuracaoDb com criptografia).


### 6. Roadmap de Design
- [ ] Implementação de Gráficos e Analytics Avançados.
- [ ] Exportação de Relatórios em PDF.
- [ ] Reconhecimento de Notas Fiscais via OCR.
- [ ] App Mobile Progressivo (PWA).

### 7. Segurança de Dados
- **Armazenamento Local**: Protegido pela política de mesma origem (Same-Origin Policy). Dados sensíveis devem ser criptografados.
- **Sincronização**: Utiliza OAuth2 para autorização e HTTPS para transporte.
- **Privacidade**: Todos os dados financeiros residem no dispositivo do usuário e em sua conta pessoal do Google Drive.
