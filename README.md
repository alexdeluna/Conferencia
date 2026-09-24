# Conferência Patrimonial

PWA para conferência dos 177 dispositivos pela coluna **Tombo legado**.

1. Firebase Authentication: habilite Email/Password e cadastre os usuários manualmente.
2. Crie o Cloud Firestore e publique `firestore.rules`.
3. Abra o projeto por servidor local (ex.: Live Server), não por `file://`.
4. `base.js` contém somente os 177 tombos da coluna solicitada.

O estado de conferência é compartilhado no Firestore entre os usuários autenticados.


## Fluxo de conferência

1. Digite o Tombo Legado.
2. Clique em **Pesquisar**.
3. Se o tombo existir, o sistema informa que ele foi encontrado.
4. O usuário deve clicar em **Confirmar encontrado**.
5. Somente nesse momento o tombo é gravado no Firestore e o contador é incrementado.
6. Se o usuário pesquisar um tombo já conferido, ele não poderá ser registrado novamente.


## Pesquisa pelos 4 últimos dígitos

O usuário não precisa digitar o tombo completo. Como os tombos da base seguem o padrão `520000XXXX`, basta informar os **4 últimos dígitos**.

Exemplo:
- Entrada: `7297`
- Tombo encontrado: `5200007297`

A confirmação continua obrigatória. A pesquisa sozinha não grava nada no Firestore.

Se os mesmos 4 últimos dígitos corresponderem a mais de um tombo, o sistema não escolherá automaticamente: informará a duplicidade para evitar uma conferência incorreta.
