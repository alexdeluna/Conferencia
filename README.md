# Conferência Patrimonial PWA

PWA para conferência dos 177 Tombos Legado e cadastro de equipamentos encontrados fora da relação original.

## Conferência original
- Pesquisa pelos 4 últimos dígitos do Tombo Legado.
- A pesquisa não confirma automaticamente.
- O botão "Confirmar encontrado" grava a conferência no Firestore.
- A base original permanece separada dos novos equipamentos.

## Cadastro de novos equipamentos
- Sem leitor de câmera.
- Tipo, Marca e Modelo podem ser salvos como configurações reutilizáveis.
- O usuário pode alternar entre configurações enquanto retira equipamentos da sala em qualquer ordem.
- Tombo começa com `N/A`.
- Serial começa com `N/A`.
- Tombo aceita somente números ou `N/A`.
- Serial aceita caracteres alfanuméricos ou `N/A`.
- O cadastro é bloqueado somente se Tombo e Serial forem `N/A`.
- Local/Sala é mantido no registro do equipamento.

## Excel
O botão "Exportar Excel" gera três abas:
- Resumo
- Conferencia Original
- Novos Equipamentos

A biblioteca SheetJS é carregada do CDN somente no momento da exportação.

## Firestore
Coleções usadas:
- `conferencias`
- `novosEquipamentos`
- `configuracoesCadastro`

Publique as regras de `firestore.rules` no Firebase antes de usar as novas funções.
