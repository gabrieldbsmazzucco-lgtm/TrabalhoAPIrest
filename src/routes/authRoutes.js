const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Usuario = require("../models/Usuario");

const router = express.Router();

// ============================================
// LOGIN
// ============================================

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realizar login
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: gabriel@email.com
 *               password:
 *                 type: string
 *                 example: MinhaSenha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: E-mail ou senha inválidos
 *       500:
 *         description: Erro interno
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica os campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({
        message: "Informe o e-mail e a senha.",
      });
    }

    // Procura o usuário e seleciona o hash protegido
    const usuario = await Usuario.findOne({
      email: email.trim(),
    }).select("+login_password_hash");

    if (!usuario) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    // Compara a senha digitada com o hash armazenado
    const senhaCorreta = await bcrypt.compare(
      password,
      usuario.login_password_hash || "",
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    // Verifica se a chave JWT está configurada
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurada no .env");
    }

    // Gera o token de autenticação
    const token = jwt.sign(
      {
        id: usuario.id,
        role: usuario.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "2h",
      },
    );

    // Retorna os dados básicos do usuário
    return res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        role: usuario.role,
        company_id: usuario.company_id,
      },
    });
  } catch (erro) {
    console.error("Erro no login:", erro.message);

    return res.status(500).json({
      message: "Erro ao realizar login.",
    });
  }
});

module.exports = router;
