const express = require("express");
const router = express.Router();
const Empresa = require("../models/Empresa");

const authMiddleware = require("../middlewares/authMiddleware");
const permissaoMiddleware = require("../middlewares/permissaoMiddleware");

// Somente ADMIN pode acessar o módulo de empresas.
router.use(authMiddleware, permissaoMiddleware("ADMIN"));

// Remove pontos, barras, traços e outros caracteres do CNPJ
function normalizarCNPJ(cnpj) {
  return String(cnpj || "").replace(/\D/g, "");
}

// Verifica se todos os campos obrigatórios foram informados
function dadosValidos(dados) {
  return (
    dados.Nome_corporativo &&
    dados.Nome_Trade &&
    dados.CNPJ &&
    dados.telefone &&
    dados.Data_criacao
  );
}

// Trata duplicidade de CNPJ
function tratarErro(res, erro) {
  console.error("Erro na rota de empresas:", erro);

  if (erro.code === 11000) {
    return res.status(409).json({
      message: "Já existe uma empresa com este CNPJ",
    });
  }

  return res.status(500).json({
    message: "Erro interno ao processar empresa",
  });
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       required:
 *         - Nome_corporativo
 *         - Nome_Trade
 *         - CNPJ
 *         - telefone
 *         - Data_criacao
 *       properties:
 *         ID:
 *           type: string
 *           format: uuid
 *         Nome_corporativo:
 *           type: string
 *         Nome_Trade:
 *           type: string
 *         CNPJ:
 *           type: string
 *         telefone:
 *           type: string
 *         Data_criacao:
 *           type: string
 *       example:
 *         Nome_corporativo: Empresa Exemplo
 *         Nome_Trade: Exemplo
 *         CNPJ: 12.345.678/0001-90
 *         telefone: (11) 1234-5678
 *         Data_criacao: 2023-01-01
 */

/**
 * @swagger
 * tags:
 *   name: Empresas
 *   description: API de Controle de Empresas
 */

/**
 * @swagger
 * /empresas:
 *   get:
 *     summary: Retorna todas as empresas
 *     tags: [Empresas]
 *     responses:
 *       200:
 *         description: Lista de empresas
 */
router.get("/", async (req, res) => {
  try {
    const empresas = await Empresa.find();
    res.json(empresas);
  } catch (erro) {
    tratarErro(res, erro);
  }
});

/**
 * @swagger
 * /empresas/nome/{nome}:
 *   get:
 *     summary: Busca empresas pelo nome
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de empresas encontradas
 *       404:
 *         description: Nenhuma empresa encontrada
 */
router.get("/nome/:nome", async (req, res) => {
  try {
    const termo = req.params.nome;

    const empresas = await Empresa.find({
      $or: [
        { Nome_corporativo: { $regex: termo, $options: "i" } },
        { Nome_Trade: { $regex: termo, $options: "i" } },
      ],
    });

    if (empresas.length === 0) {
      return res.status(404).json({
        message: "Nenhuma empresa encontrada",
      });
    }

    res.json(empresas);
  } catch (erro) {
    tratarErro(res, erro);
  }
});

/**
 * @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Retorna uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *       404:
 *         description: Empresa não encontrada
 */
router.get("/:id", async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ ID: req.params.id });

    if (!empresa) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    res.json(empresa);
  } catch (erro) {
    tratarErro(res, erro);
  }
});

/**
 * @swagger
 * /empresas:
 *   post:
 *     summary: Cria uma nova empresa
 *     tags: [Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Empresa'
 *     responses:
 *       200:
 *         description: Empresa criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: CNPJ já cadastrado
 */
router.post("/", async (req, res) => {
  try {
    const { Nome_corporativo, Nome_Trade, CNPJ, telefone, Data_criacao } =
      req.body;

    if (
      !dadosValidos({
        Nome_corporativo,
        Nome_Trade,
        CNPJ,
        telefone,
        Data_criacao,
      })
    ) {
      return res.status(400).json({
        message: "Dados da empresa inválidos",
      });
    }

    const cnpjNormalizado = normalizarCNPJ(CNPJ);

    if (!cnpjNormalizado) {
      return res.status(400).json({
        message: "CNPJ inválido",
      });
    }

    const empresa = new Empresa({
      Nome_corporativo,
      Nome_Trade,
      CNPJ,
      CNPJ_normalizado: cnpjNormalizado,
      telefone,
      Data_criacao,
    });

    await empresa.save();

    res.json({
      message: "Empresa criada com sucesso",
      empresa,
    });
  } catch (erro) {
    if (erro.name === "ValidationError") {
      return res.status(400).json({
        message: "Dados da empresa inválidos",
      });
    }

    tratarErro(res, erro);
  }
});

/**
 * @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa existente
 *     tags: [Empresas]
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
 *             $ref: '#/components/schemas/Empresa'
 *     responses:
 *       200:
 *         description: Empresa atualizada
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Empresa não encontrada
 *       409:
 *         description: CNPJ já cadastrado
 */
router.put("/:id", async (req, res) => {
  try {
    const { Nome_corporativo, Nome_Trade, CNPJ, telefone, Data_criacao } =
      req.body;

    if (
      !dadosValidos({
        Nome_corporativo,
        Nome_Trade,
        CNPJ,
        telefone,
        Data_criacao,
      })
    ) {
      return res.status(400).json({
        message: "Dados da empresa inválidos",
      });
    }

    const cnpjNormalizado = normalizarCNPJ(CNPJ);

    if (!cnpjNormalizado) {
      return res.status(400).json({
        message: "CNPJ inválido",
      });
    }

    const empresa = await Empresa.findOneAndUpdate(
      { ID: req.params.id },
      {
        Nome_corporativo,
        Nome_Trade,
        CNPJ,
        CNPJ_normalizado: cnpjNormalizado,
        telefone,
        Data_criacao,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!empresa) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    res.json({
      message: "Empresa atualizada com sucesso",
      empresa,
    });
  } catch (erro) {
    if (erro.name === "ValidationError") {
      return res.status(400).json({
        message: "Dados da empresa inválidos",
      });
    }

    tratarErro(res, erro);
  }
});

/**
 * @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Exclui uma empresa existente
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Empresa excluída com sucesso
 *       404:
 *         description: Empresa não encontrada
 */
router.delete("/:id", async (req, res) => {
  try {
    const empresa = await Empresa.findOneAndDelete({
      ID: req.params.id,
    });

    if (!empresa) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    res.json({
      message: "Empresa excluída com sucesso",
    });
  } catch (erro) {
    tratarErro(res, erro);
  }
});

module.exports = router;
