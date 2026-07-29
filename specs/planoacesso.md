# Plano de controle de acesso a páginas

Precisamos de um controle de acesso de usuários às paginas mais fino, ele será baseado em grupos onde existirá o grupo TODOS que será o grupo default para todas as páginas criadas.  

um admin poderá incluir grupos novos e tais grupos estarão disponíveis num combo na página de edição da página, assim será possível especificar que grupos de usuários tem acesso a tal página.   no gerenciamento de usuários será possível especificar um grupo específico para um usuário específico.

A busca deve obedecer o critério de controle de acesso de usuários das páginas, ou seja, usuários que não tem acesso a páginas de outros grupos não poderão ver na pesquisa tais informações.  Bem como um link não poderá ser visualizado por um usuário que não está no grupo correto designado para aquela página.

Perceba que se alterar o nome de um grupo isso será atualizado para todas as páginas que possuem esta designição, ou seja, precisamos usar um IDGRUPO para lidar com isso.


Também teremos que adicionar um tipo ao registro de usuário:

Tipo A = Admin (plenos poderes), acesso ao painel admin além dos poderes de todos os outros tipos.
Tipo B = Consumidor de paginas
Tipo C = Consumidor e Editor
Tipo D = Consumidor, Edita e Inclui páginas