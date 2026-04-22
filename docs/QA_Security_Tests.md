# Plano de Testes de Segurança (QA)

Este documento descreve os casos de teste voltados para a segurança do armazenamento de dados.

## CT01 - Verificação de Dados em Texto Plano (IndexedDB)
- **Objetivo**: Verificar se os dados financeiros estão acessíveis via DevTools.
- **Passos**:
  1. Abrir a aplicação.
  2. Adicionar uma transação com descrição "TESTE_SEGURANCA".
  3. Abrir o Console do Desenvolvedor (F12).
  4. Ir em `Application` -> `IndexedDB`.
  5. Localizar o banco de dados e verificar se a descrição é visível nos campos de conteúdo (chunks).
- **Resultado Esperado**: Os dados são visíveis (Cenário atual, a ser mitigado com criptografia total no futuro).

## CT02 - Proteção de Chaves de API
- **Objetivo**: Garantir que chaves de API não estejam em texto plano no banco de dados.
- **Passos**:
  1. Configurar uma Gemini API Key nas configurações.
  2. Executar consulta SQL no banco local: `SELECT valor FROM configuracao WHERE chave = 'geminiApiKey'`.
  3. Verificar o conteúdo do campo `valor`.
- **Resultado Esperado**: O valor deve estar criptografado ou ofuscado, não sendo idêntico à chave inserida.

## CT03 - Integridade da Autorização Google Drive
- **Objetivo**: Verificar se a aplicação armazena tokens de acesso permanentemente.
- **Passos**:
  1. Realizar o login no Google Drive Sync.
  2. Reiniciar a aplicação.
  3. Verificar se o token de acesso ainda está acessível sem nova interação do usuário (se não houver "Remember Me").
- **Resultado Esperado**: Tokens de acesso devem ser temporários (in-memory) ou armazenados de forma segura/expirável.

## CT04 - Acesso Não Autorizado ao Backup
- **Objetivo**: Tentar acessar o arquivo de backup no Google Drive sem autorização.
- **Passos**:
  1. Obter o ID do arquivo no Google Drive.
  2. Tentar baixar o arquivo usando uma conta Google diferente ou sem token.
- **Resultado Esperado**: Acesso negado pelo Google Drive API.
