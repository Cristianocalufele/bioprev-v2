# Configuração da loja e da área de administração

Este guia descreve o que falta para activar a loja de Bioprev depois de o código estar publicado. As chaves do Turso e da Cloudinary não são necessárias para executar a aplicação, mas são necessárias para guardar produtos e enviar imagens.

## 1. O que já está preparado

- A página `/admin` é a área de gestão da loja.
- A autenticação é feita pelo Clerk; os pedidos de gestão são novamente validados no servidor.
- Apenas endereços de email autorizados e verificados podem gerir artigos e categorias.
- `ADMIN_EMAIL` já identifica `bioprevloja@site.ao` como primeira conta autorizada.
- A loja usa uma base Turso própria, separada da configuração PostgreSQL/Drizzle que possa existir noutras partes do projecto.
- As imagens são enviadas ao servidor e daí para a Cloudinary. A chave secreta da Cloudinary nunca é enviada ao navegador.
- O catálogo público e o painel de administração usam os mesmos registos.
- A primeira inicialização cria as tabelas e adiciona três categorias e seis artigos de referência. A carga inicial só acontece uma vez; voltar a executar o comando não repõe artigos apagados nem altera os existentes.

## 2. Criar a base de dados Turso

1. Crie uma base de dados SQLite no Turso.
2. Copie o URL da base e crie um token de autenticação com permissão para ler e escrever.
3. No painel **Secrets** do Replit, adicione:
   - `TURSO_DATABASE_URL` — URL da base Turso.
   - `TURSO_AUTH_TOKEN` — token de acesso da base.
4. Não coloque estes valores no código, no Git, em ficheiros `.env` enviados ao projecto ou em mensagens.
5. Depois de guardar ambos os Secrets, execute na raiz do projecto:

   ```bash
   npm run db:store:setup
   ```

   O comando cria `store_categories`, `store_products` e `store_setup_state`, os índices necessários e o catálogo inicial. Não executa `drizzle-kit push` nem altera a base usada por outras funções do site.
6. Abra `/loja` e `/admin`. O catálogo deve apresentar as categorias e os artigos iniciais.

### Esquema da loja

**`store_categories`**

- `id`: identificador único.
- `name` e `slug`: nome apresentado e endereço legível.
- `description`: texto opcional da categoria.
- `is_active`: determina se a categoria aparece publicamente.
- `sort_order`: ordem manual de apresentação.
- `created_at` e `updated_at`: datas de criação e alteração.

**`store_products`**

- `id`, `name` e `slug`: identificação do artigo.
- `category_id`: relação obrigatória à categoria.
- `short_description` e `description`: resumo do cartão e descrição completa.
- `image_public_id`: identificador do ficheiro na Cloudinary; a imagem não é guardada no Turso.
- `is_active`: artigos inactivos ficam apenas no painel.
- `sort_order`, `created_at` e `updated_at`: ordenação e datas.

**`store_setup_state`** regista a carga inicial. Não apague esta tabela para “reiniciar” o catálogo: fazê-lo pode voltar a adicionar artigos de demonstração. Para alterar dados, use `/admin`.

## 3. Ligar as imagens à Cloudinary

1. Crie ou seleccione uma conta e um ambiente de produto na Cloudinary.
2. No painel da Cloudinary, obtenha o nome do ambiente, a chave da API e o segredo da API.
3. Adicione estes valores em **Settings → Environment Variables** no projecto Vercel e seleccione o ambiente usado pelo site (por exemplo, **Production**):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. O segredo da API permanece exclusivamente no servidor. Não o use em variáveis `VITE_*` nem no código do navegador.
5. Depois de adicionar ou alterar variáveis, crie um novo deployment na Vercel: os valores só ficam disponíveis nos deployments seguintes. No painel, clique em **Verificar ligações**.
6. Edite ou adicione um artigo e seleccione uma imagem. São aceites JPG, PNG, WebP e AVIF até 5 MB. O servidor verifica o tipo e o conteúdo, guarda a imagem na pasta `bioprev/products` e grava apenas o identificador no Turso.
7. Ao substituir ou apagar um artigo, o sistema tenta remover a imagem anterior da Cloudinary. Se o fornecedor estiver temporariamente indisponível, o artigo é guardado/apagado e o painel mostra um aviso para permitir a limpeza posterior.

## 4. Primeiro acesso de administrador

1. Confirme que a autenticação Clerk provisionada para o projecto está activa.
2. Abra `/sign-up` e registe a conta com `bioprevloja@site.ao`.
3. Conclua a verificação de email no Clerk.
4. Entre em `/admin`. O servidor confirma que o email da sessão é verificado e está na lista de administradores.
5. A autorização não depende de botões ou estados do navegador. A API bloqueia pedidos de contas não autorizadas.

`ADMIN_EMAIL` autoriza a conta inicial. Para autorizar mais contas, defina `ADMIN_EMAILS` como uma lista separada por vírgulas. Cada conta adicional tem de se registar e verificar o seu email no Clerk. Nunca remova o único administrador até confirmar que outra conta autorizada consegue entrar.

## 5. Separar desenvolvimento e produção

O desenvolvimento e a publicação podem usar conjuntos de variáveis diferentes na Vercel. Defina em cada ambiente o URL e token do Turso correspondentes e execute `npm run db:store:setup` no ambiente da base que pretende inicializar. Faça o mesmo para as três chaves da Cloudinary e para a lista de emails administradores; crie um novo deployment sempre que alterar variáveis.

Para impedir que dados de teste apareçam na loja publicada, use bases Turso separadas para desenvolvimento e produção. O script é idempotente, mas não copia dados entre ambientes.

## 6. Diagnóstico

- **“A ligação à base da loja ainda não está configurada”**: confirme a presença de `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` nos Secrets do ambiente actual.
- **“A base da loja existe, mas ainda não foi inicializada”**: execute `npm run db:store:setup` com as credenciais do mesmo ambiente.
- **“A conta administradora ainda não foi configurada”**: confirme `ADMIN_EMAIL` ou `ADMIN_EMAILS`.
- **“Esta conta não tem autorização”**: entre com o email verificado autorizado. Não tente resolver isto removendo a validação no servidor.
- **Upload indisponível**: confirme as três chaves `CLOUDINARY_*`, o tamanho (máximo 5 MB) e o formato do ficheiro.
- **A imagem não foi apagada**: o registo da loja foi removido ou actualizado; verifique a Cloudinary e apague manualmente apenas o identificador indicado pelo artigo afectado.

As respostas da API nunca incluem URLs, tokens ou segredos das integrações.
