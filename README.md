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
