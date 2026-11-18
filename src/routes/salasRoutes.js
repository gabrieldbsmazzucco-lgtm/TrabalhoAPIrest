const express = require("express");
const Sala = require("../models/Sala");
const Disponibilidade = require("../models/Disponibilidade");
const Reserva = require("../models/Reserva");
const { randomUUID } = require("crypto");

const authMiddleware = require("../middlewares/authMiddleware");
const permissaoMiddleware = require("../middlewares/permissaoMiddleware");

const router = express.Router();

const tiposValidos = ["COWORKING", "LAB", "MEETING_ROOM"];

function capacidadeValida(capacity) {
  return Number.isInteger(capacity) && capacity > 0;
}

function tratarErro(res, erro) {
  console.error("Erro nas salas:", erro);

  if (erro.code === 11000) {
    return res.status(409).json({
      message: "Já existe uma sala com esse ID.",
    });
  }

  return res.status(500).json({
    message: "Erro interno ao processar a sala.",
  });
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Sala:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *         capacity:
 *           type: integer
 *         description:
 *           type: string
 *         is_active:
 *           type: boolean
 *       example:
 *         id: "a1b2c3d4-1111-4222-8333-444455556666"
 *         name: "Sala de Reunião 1"
 *         type: "MEETING_ROOM"
 *         capacity: 10
 *         description: "Sala com projetor e ar-condicionado"
 *         is_active: true
 *
 *     SalaInput:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         name:
 *           type: string
 *           example: "Sala de Reunião 2"
 *         type:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           example: "MEETING_ROOM"
 *         capacity:
 *           type: integer
 *           example: 12
 *         description:
 *           type: string
 *           example: "Sala com mesa de reuniões e projetor"
 *         is_active:
 *           type: boolean
 *           example: true
 *       example:
 *         name: "Sala de Reunião 2"
 *         type: "MEETING_ROOM"
 *         capacity: 12
 *         description: "Sala com mesa de reuniões e projetor"
 *         is_active: true
 *
 *     SalaUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Sala de Reunião 2 - Atualizada"
 *         type:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           example: "MEETING_ROOM"
 *         capacity:
 *           type: integer
 *           example: 15
 *         description:
 *           type: string
 *           example: "Sala atualizada com capacidade para 15 pessoas"
 *         is_active:
 *           type: boolean
 *           example: true
 *       example:
 *         name: "Sala de Reunião 2 - Atualizada"
 *         type: "MEETING_ROOM"
 *         capacity: 15
 *         description: "Sala atualizada com capacidade para 15 pessoas"
 *         is_active: true
 */

/**
 * @swagger
 * tags:
 *   - name: Salas
 *     description: API de controle de salas/espaços (spaces)
 */

/**
 * @swagger
 * /salas:
 *   get:
 *     summary: Retorna a lista de salas
 *     tags: [Salas]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de salas obtida com sucesso
 */
router.get(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const { name, type, is_active } = req.query;
      const filtro = {};

      if (name) {
        filtro.name = { $regex: name, $options: "i" };
      }

      if (type) {
        filtro.type = String(type).toUpperCase();
      }

      if (is_active !== undefined) {
        if (is_active !== "true" && is_active !== "false") {
          return res.status(400).json({
            message: "O filtro is_active deve ser true ou false.",
          });
        }

        filtro.is_active = is_active === "true";
      }

      const salas = await Sala.find(filtro);

      return res.json(salas);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /salas/{id}:
 *   get:
 *     summary: Busca uma sala pelo ID
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sala encontrada
 *       404:
 *         description: Sala não encontrada
 */
router.get(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const sala = await Sala.findOne({ id: req.params.id });

      if (!sala) {
        return res.status(404).json({
          message: "Sala não encontrada",
        });
      }

      return res.json(sala);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /salas:
 *   post:
 *     summary: Cria uma nova sala
 *     description: Cria uma sala com ID gerado automaticamente.
 *     tags: [Salas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalaInput'
 *     responses:
 *       201:
 *         description: Sala criada com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const { name, type, capacity, description, is_active } = req.body;

      if (!name || !type || capacity === undefined) {
        return res.status(400).json({
          message: "Os campos name, type e capacity são obrigatórios.",
        });
      }

      if (!tiposValidos.includes(String(type).toUpperCase())) {
        return res.status(400).json({
          message: "Tipo inválido. Use COWORKING, LAB ou MEETING_ROOM.",
        });
      }

      if (!capacidadeValida(capacity)) {
        return res.status(400).json({
          message: "A capacidade deve ser um número inteiro maior que zero.",
        });
      }

      const novaSala = new Sala({
        id: randomUUID(),
        name,
        type: String(type).toUpperCase(),
        capacity,
        description: description || "",
        is_active: is_active !== undefined ? is_active : true,
      });

      await novaSala.save();

      return res.status(201).json(novaSala);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /salas/{id}:
 *   put:
 *     summary: Atualiza uma sala existente
 *     description: Atualiza os campos enviados para a sala identificada pelo ID.
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "a1b2c3d4-1111-4222-8333-444455556666"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalaUpdateInput'
 *     responses:
 *       200:
 *         description: Sala atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Sala não encontrada
 */
router.put(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const { type, capacity } = req.body;

      if (type && !tiposValidos.includes(String(type).toUpperCase())) {
        return res.status(400).json({
          message: "Tipo inválido. Use COWORKING, LAB ou MEETING_ROOM.",
        });
      }

      if (capacity !== undefined && !capacidadeValida(capacity)) {
        return res.status(400).json({
          message: "A capacidade deve ser um número inteiro maior que zero.",
        });
      }

      const dadosAtualizados = { ...req.body };

      delete dadosAtualizados.id;
      delete dadosAtualizados._id;

      if (type) {
        dadosAtualizados.type = String(type).toUpperCase();
      }

      const salaAtualizada = await Sala.findOneAndUpdate(
        { id: req.params.id },
        dadosAtualizados,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!salaAtualizada) {
        return res.status(404).json({
          message: "Sala não encontrada",
        });
      }

      return res.json(salaAtualizada);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /salas/{id}:
 *   delete:
 *     summary: Exclui ou desativa uma sala
 *     description: Exclui permanentemente se não houver disponibilidades ou reservas vinculadas. Caso existam, apenas desativa.
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sala excluída ou desativada com sucesso
 *       404:
 *         description: Sala não encontrada
 */
router.delete(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const sala = await Sala.findOne({
        id: req.params.id,
      });

      if (!sala) {
        return res.status(404).json({
          message: "Sala não encontrada.",
        });
      }

      // Verifica se existem disponibilidades vinculadas.
      const disponibilidadeExistente = await Disponibilidade.findOne({
        space_id: sala.id,
      });

      // Verifica se existem reservas vinculadas.
      const reservaExistente = await Reserva.findOne({
        space_id: sala.id,
      });

      // Se houver qualquer vínculo, apenas desativa a sala.
      if (disponibilidadeExistente || reservaExistente) {
        if (!sala.is_active) {
          return res.json({
            message: "A sala já está inativa.",
            acao: "INATIVA",
            sala,
          });
        }

        sala.is_active = false;

        await sala.save();

        return res.json({
          message:
            "A sala foi desativada porque possui disponibilidades ou reservas vinculadas.",
          acao: "DESATIVADA",
          sala,
        });
      }

      // Se não houver vínculos, exclui permanentemente.
      await Sala.findOneAndDelete({
        id: sala.id,
      });

      return res.json({
        message: "Sala excluída permanentemente.",
        acao: "EXCLUIDA",
        sala,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

module.exports = router;
