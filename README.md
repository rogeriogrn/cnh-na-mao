# CNH na Mão — página de vendas

Página responsiva em HTML, CSS e JavaScript, sem instalação ou etapa de compilação.

## Como enviar ao GitHub

1. Extraia o ZIP. Os arquivos index.html, README.md e a pasta img precisam estar na raiz do repositório, lado a lado.
2. Crie um repositório no GitHub e envie todos os arquivos extraídos, mantendo a pasta img.
3. No painel da Vercel, crie um projeto, importe o repositório e faça o deploy. Para este projeto estático, use Framework Preset: Other e deixe o comando de build vazio. A raiz do projeto é a pasta que contém index.html.
4. Ao conectar o repositório, novas alterações enviadas ao GitHub podem gerar novos deploys automaticamente.

## Como configurar os botões de checkout

Abra index.html e procure por CHECKOUT_URLS. Substitua cada string vazia pelo link HTTPS correto de cada oferta, mantendo as aspas:

    const CHECKOUT_URLS = { completo: 'LINK_DO_CHECKOUT_COMPLETO', essencial: 'LINK_DO_CHECKOUT_ESSENCIAL' };

Use somente links reais fornecidos pela sua plataforma. Com o campo vazio, o botão informa que o checkout está em preparação; nenhuma cobrança é realizada. Cadastre os dois e-books opcionais como order bumps na plataforma de checkout. A página não envia escolhas nem processa pagamentos por conta própria. Teste os dois caminhos e os adicionais antes da divulgação.

## Antes de divulgar

- Defina quais módulos e aulas compõem o plano essencial; os três primeiros estão apenas como sugestão de prévia.
- Confirme a entrega, a compatibilidade, as condições de acesso e a política de reembolso; revise os conteúdos antigos de legislação.
- Confira a relação e a autorização de uso dos depoimentos, que incluem relatos sobre a Autoescola Futura, não avaliações verificadas do CNH na Mão.
- Preencha os dados do responsável e os contatos e políticas necessários. A representação da plataforma é ilustrativa e não corresponde a capturas verificadas do produto.
- Conclua o checkout e faça um teste completo antes de vender.

## Estrutura

- index.html — página e configurações de checkout.
- img/ — imagens utilizadas, incluindo os depoimentos, armazenadas no projeto.
- README.md — este guia.

## Fluxo de conversão antes do preço

- O cabeçalho e o hero não têm chamada comercial, atalho à oferta ou preço. A barra fixa mobile foi removida para não antecipar a compra.
- A primeira chamada comercial aparece depois dos cards de apresentação, após o hero e os relatos. Os três CTAs editoriais usam exatamente `VER OFERTA ESPECIAL` e apontam para `#bonus`.
- A âncora `#bonus` fica imediatamente antes de `#oferta`. A rolagem suave é nativa do CSS e respeita a preferência por movimento reduzido; o destino aceita foco por teclado.
- Os dois botões de contratação dentro dos cards de preço mantêm suas copies e seu comportamento.

### Confirmações comerciais pendentes

O repositório e a copy de referência não identificam bônus gratuitos. Os dois e-books de placas são adicionais pagos separadamente. Por isso, `#bonus` contém provisoriamente um bloco neutro com o título **Conheça os materiais da oferta**, sem anunciar bônus, quantidade ou vencimento não confirmados.

Antes de substituir esse título, confirme quais materiais são bônus, em qual plano estão incluídos e se existe prazo real. Não utilize a data do dispositivo como vencimento que se renova diariamente. Se houver uma campanha com prazo verdadeiro, informe uma data de término fixa, o fuso horário e o comportamento após o encerramento.

### Verificações locais

Sem instalação de dependências ou compilação:

```sh
python3 tests/test_cro.py
node tests/scripts.test.cjs
node tests/utm.test.cjs
git diff --check
```

A suíte Python verifica estrutura, posição/copy dos CTAs, âncoras, oferta, imagens, CSS responsivo e preservação do Pixel. A suíte Node valida a sintaxe dos scripts e comportamentos com um DOM mínimo: checkout ainda não configurado, cliques repetidos, URLs válidas/inválidas e carrossel. Esses testes não substituem uma revisão visual em navegador.

Antes de publicar, valide em desktop e mobile: ausência de CTA na primeira tela, chegada dos três links ao início de `#bonus`, voltar/avançar, navegação por teclado, movimento reduzido, ausência de overflow horizontal e os dois avisos de checkout em preparação. A quantidade exata de telas varia com o dispositivo; o marco da primeira chamada é o término do bloco de apresentação.


## UTMs e Utmify

O script oficial da Utmify foi incluído uma única vez no `head`, com `async`, `defer`, `data-utmify-prevent-xcod-sck` e `data-utmify-prevent-subids`. É a versão legível equivalente ao arquivo `utmify-utms-script.txt` fornecido, sem executar o carregador ofuscado. O código é carregado de `https://cdn.utmify.com.br/scripts/utms/latest.js`, conforme a [documentação oficial da Utmify](https://utmify.help.center/article/1024-voce-esta-tendo-vendas-nao-trackeadas). Como o fornecedor mantém esse endereço, o código externo pode mudar.

Nos botões de compra, `buildCheckoutUrl` acrescenta somente `utm_source`, `utm_campaign`, `utm_medium`, `utm_content` e `utm_term` recebidos na URL da página. O destino sempre vem da configuração interna `CHECKOUT_URLS`, nunca de um parâmetro recebido. A função aceita apenas HTTPS sem credenciais na URL, preserva oferta, afiliado, cupom e fragmento já configurados e não encaminha nome, e-mail, CPF, telefone, parâmetros desconhecidos ou redirecionamentos.

- Uma UTM recebida válida substitui apenas a mesma UTM previamente configurada; `URLSearchParams.set` evita duplicação.
- Valores vazios, duplicados, com caracteres de controle, maiores que 1.000 caracteres ou ainda contendo `{{...}}` são ignorados. Espaços, acentos, `&`, `+` e `|` são codificados e preservados.
- A função nativa não cria cookies nem armazenamento persistente: lê a query atual no momento do clique. A Utmify possui seu próprio comportamento de armazenamento/rastreamento, autorizado separadamente.
- Os CTAs editoriais continuam sendo âncoras `#bonus`. A versão do script externo inspecionada ignora links com fragmento e não intercepta `location.assign`, utilizado pelos botões de compra. Assim, não há dois decoradores atuando no mesmo redirecionamento.
- `CHECKOUT_URLS` continua vazio até a identificação comercial dos links. Os exemplos dos testes existem somente no ambiente de teste.

### Parâmetros no anúncio Meta

Configure no campo de parâmetros de URL do anúncio, não como valores fixos inventados pela landing page:

```text
utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}
```

A landing page não resolve essas macros: recebe os valores finais enviados pelo anúncio. Teste com um clique real do anúncio e confira a URL de chegada. A navegação interna por `#bonus` preserva a query.

Instalar o script não comprova atribuição de vendas. A integração de conta, produtos e eventos entre Cakto e Utmify precisa ser configurada e validada separadamente no painel, conforme a [orientação oficial da Cakto](https://ajuda.cakto.com.br/pt-br/articles/92-como-integrar-o-utmify-na-cakto). Nenhuma compra de teste foi realizada.


Para repetir a verificação de compatibilidade com uma cópia local atual, previamente inspecionada, do script oficial:

```sh
node tests/utmify-compat.test.cjs /caminho/para/utmify-latest.js
```

Esse teste executa o código externo em um DOM mínimo sem rede e verifica que as âncoras e o redirecionamento de compra não recebem UTMs duplicadas. A revisão em navegador publicado continua necessária para confirmar carregamento real e layout.
