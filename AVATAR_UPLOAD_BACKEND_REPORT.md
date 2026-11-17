# Relato: falha no envio de foto de perfil

## Reprodução observada

- Conta de teste: `upload-debug-2026-11-17@example.com` (descartável).
- Ação: no perfil, selecionar uma imagem PNG pelo controle “Trocar foto”.
- Requisição observada na reprodução original: `PATCH /api/users/avatar`.
- Corpo esperado pelo frontend: `multipart/form-data`, com os campos `user_id` (ID da conta autenticada) e `file` (arquivo selecionado).
- MIME aceito pelo frontend: `image/png` (também aceita JPEG e WebP).
- Resultado observado: HTTP 500 com a mensagem genérica “Erro interno do servidor”. A foto não foi persistida.

## O que conferir no backend

1. Correlacionar a requisição nos logs pelo horário/ID de request e obter a exceção e stack trace associados ao 500.
2. Confirmar que `PUT /api/users/avatar` interpreta `multipart/form-data` e espera os nomes `user_id` e `file`.
3. Verificar middleware/parser de multipart, limites de tamanho, validação do MIME/conteúdo e permissões/configuração do armazenamento de arquivos.
4. Confirmar que o usuário autenticado pode atualizar o avatar e que a persistência retorna os campos de usuário que o frontend espera.

O status 500 comprova uma falha no processamento do servidor, mas a causa específica depende dos logs. O frontend já remove o `Content-Type` fixo nessa chamada para permitir que o navegador defina o boundary multipart.

## Contrato atual e validação

- Contrato atualizado: `PUT /api/users/avatar`, com os mesmos campos multipart `user_id` e `file`.
- O cliente usa `PUT` e deixa o navegador gerar o `Content-Type` com boundary.
- Validação local: `PATCH` respondeu `404`; `PUT` com PNG respondeu `200`; `GET /api/users/profile` respondeu `200` e confirmou que o avatar permaneceu salvo.
- Build e lint do cliente passaram. TypeScript, lint e 30 testes unitários do backend passaram.
- A exceção original do `500` não estava disponível nos logs quando a reprodução foi investigada; o upload voltou a funcionar com a configuração atual de região do Supabase Storage. Não é possível atribuir o 500 original a uma exceção específica sem aquele stack trace.
