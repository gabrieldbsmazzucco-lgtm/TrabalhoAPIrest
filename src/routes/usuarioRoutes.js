const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

const authMiddleware = require("../middlewares/authMiddleware");
const permissaoMiddleware = require("../middlewares/permissaoMiddleware");

const router = express.Router();

const rolesValidas = ["ADMIN", "CLIENT", "RECEPTION"];

// Todas as rotas exigem autenticação.
router.use(authMiddleware);

// Remove campos de senha das respostas da API.
function usuarioSemSenhas(usuario) {
  const dados = usuario.toObject();

  delete dados.password_hash;
  delete dados.login_password_hash;

  return dados;
}

// Validação das senhas.
function senhaValida(senha) {
  return typeof senha === "string" && senha.length >= 6;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, RECEPTION]
 *         cpf_cnpj:
 *           type: string
 *           nullable: true
 *         company_id:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     UserInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           example: "Novo Usuário"
 *         email:
 *           type: string
 *           example: "novo@email.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "abc123"
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, RECEPTION]
 *           example: CLIENT
 *         cpf_cnpj:
 *           type: string
 *           example: "123.456.789-00"
 *         company_id:
 *           type: string
 *           example: "1"
 *
 *     UserUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Usuário Atualizado"
 *         email:
 *           type: string
 *           example: "atualizado@email.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "xyz789"
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, RECEPTION]
 *           example: CLIENT
 *         cpf_cnpj:
 *           type: string
 *           example: "123.456.789-00"
 *         company_id:
 *           type: string
 *           example: "1"
 */

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: API de Controle de Usuarios
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Retorna a lista de usuários
 *     description: ADMIN e RECEPTION podem consultar a lista de usuários.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrar por nome
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, CLIENT, RECEPTION]
 *         description: Filtrar por perfil
 *     responses:
 *       200:
 *         description: Lista de usuários obtida com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso permitido somente para ADMIN ou RECEPTION
 */
router.get("/", permissaoMiddleware("ADMIN", "RECEPTION"), async (req, res) => {
  try {
    const { name, role } = req.query;

    const filtro = {};

    if (name) {
      filtro.name = { $regex: name, $options: "i" };
    }

    if (role) {
      if (!rolesValidas.includes(role.toUpperCase())) {
        return res.status(400).json({
          message: "Role inválida.",
        });
      }

      filtro.role = role.toUpperCase();
    }

    const usuarios = await Usuario.find(filtro);

    res.json(usuarios.map(usuarioSemSenhas));
  } catch (error) {
    res.status(500).json({
      message: "Erro ao buscar usuários.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     description: ADMIN e RECEPTION podem consultar um usuário.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso permitido somente para ADMIN ou RECEPTION
 *       404:
 *         description: Usuário não encontrado
 */
router.get(
  "/:id",
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const usuario = await Usuario.findOne({
        id: req.params.id,
      });

      if (!usuario) {
        return res.status(404).json({
          message: "Usuário não encontrado.",
        });
      }

      res.json(usuarioSemSenhas(usuario));
    } catch (error) {
      res.status(500).json({
        message: "Erro ao buscar usuário.",
        error: error.message,
      });
    }
  },
);

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso permitido somente para ADMIN
 */
router.post("/", permissaoMiddleware("ADMIN"), async (req, res) => {
  try {
    const { name, email, password, role, cpf_cnpj, company_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Nome, e-mail, senha e perfil são obrigatórios.",
      });
    }

    if (!senhaValida(password)) {
      return res.status(400).json({
        message: "A senha deve ter no mínimo 6 caracteres.",
      });
    }

    if (
      typeof role !== "string" ||
      !rolesValidas.includes(role.toUpperCase())
    ) {
      return res.status(400).json({
        message: "Role inválida. Use ADMIN, CLIENT ou RECEPTION.",
      });
    }

    const loginPasswordHash = await bcrypt.hash(password, 10);

    const novoUsuario = new Usuario({
      name,
      email,
      login_password_hash: loginPasswordHash,
      role: role.toUpperCase(),
      cpf_cnpj: cpf_cnpj || null,
      company_id: company_id || null,
    });

    await novoUsuario.save();

    res.status(201).json(usuarioSemSenhas(novoUsuario));
  } catch (error) {
    res.status(500).json({
      message: "Erro ao cadastrar usuário.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso permitido somente para ADMIN
 *       404:
 *         description: Usuário não encontrado
 */
router.put("/:id", permissaoMiddleware("ADMIN"), async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      id: req.params.id,
    }).select("+login_password_hash");

    if (!usuario) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const { name, email, password, role, cpf_cnpj, company_id } = req.body;

    const camposPermitidos = ["name", "email", "cpf_cnpj", "company_id"];

    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        usuario[campo] = req.body[campo];
      }
    }

    if (role !== undefined) {
      if (
        typeof role !== "string" ||
        !rolesValidas.includes(role.toUpperCase())
      ) {
        return res.status(400).json({
          message: "Role inválida. Use ADMIN, CLIENT ou RECEPTION.",
        });
      }

      usuario.role = role.toUpperCase();
    }

    if (password !== undefined) {
      if (!senhaValida(password)) {
        return res.status(400).json({
          message: "A senha deve ter no mínimo 6 caracteres.",
        });
      }

      usuario.login_password_hash = await bcrypt.hash(password, 10);
    }

    await usuario.save();

    res.json(usuarioSemSenhas(usuario));
  } catch (error) {
    res.status(400).json({
      message: "Erro ao atualizar usuário.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso permitido somente para ADMIN
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/:id", permissaoMiddleware("ADMIN"), async (req, res) => {
  try {
    const usuarioRemovido = await Usuario.findOneAndDelete({
      id: req.params.id,
    });

    if (!usuarioRemovido) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    res.json({
      message: "Usuário removido com sucesso.",
      user: usuarioSemSenhas(usuarioRemovido),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao remover usuário.",
      error: error.message,
    });
  }
});

module.exports = router;
