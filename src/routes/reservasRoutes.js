const express = require("express");
const { randomUUID } = require("crypto");

const Reserva = require("../models/Reserva");
const Usuario = require("../models/Usuario");
const Sala = require("../models/Sala");
const Disponibilidade = require("../models/Disponibilidade");

const authMiddleware = require("../middlewares/authMiddleware");
const permissaoMiddleware = require("../middlewares/permissaoMiddleware");

const router = express.Router();

const STATUS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function sameDay(start, end) {
  return (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  );
}

function validarDatas(start_datetime, end_datetime, exigirFuturo = true) {
  const inicio = new Date(start_datetime);
  const fim = new Date(end_datetime);

  if (
    !start_datetime ||
    !end_datetime ||
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fim.getTime())
  ) {
    return { erro: "Datas inválidas." };
  }

  if (fim <= inicio) {
    return { erro: "A data final deve ser posterior à data inicial." };
  }

  if (exigirFuturo && inicio <= new Date()) {
    return { erro: "A reserva deve começar em uma data futura." };
  }

  if (!sameDay(inicio, fim)) {
    return { erro: "A reserva deve começar e terminar no mesmo dia." };
  }

  return { inicio, fim };
}

function isExternal(usuario) {
  return !usuario.company_id;
}

// Considera somente disponibilidades ativas.
// Documentos antigos sem is_active são considerados ativos.
async function dentroDaDisponibilidade(space_id, inicio, fim, usuario) {
  const disponibilidades = await Disponibilidade.find({
    space_id,
    day_of_week: inicio.getDay(),
    is_active: { $ne: false },
  });

  const inicioMinutos = inicio.getHours() * 60 + inicio.getMinutes();
  const fimMinutos = fim.getHours() * 60 + fim.getMinutes();

  return disponibilidades.some((disponibilidade) => {
    const inicioDisponibilidade = timeToMinutes(disponibilidade.start_time);
    const fimDisponibilidade = timeToMinutes(disponibilidade.end_time);

    const horarioPermitido =
      inicioMinutos >= inicioDisponibilidade &&
      fimMinutos <= fimDisponibilidade;

    const acessoPermitido =
      !isExternal(usuario) || disponibilidade.is_external_allowed;

    return horarioPermitido && acessoPermitido;
  });
}

// Compara diretamente as strings armazenadas no MongoDB.
// Não usar toISOString() aqui, pois isso pode alterar o horário
// devido à conversão para UTC.
async function encontrarConflito(
  space_id,
  start_datetime,
  end_datetime,
  ignorarId = null,
) {
  const filtro = {
    space_id,
    status: "APPROVED",
    start_datetime: { $lt: end_datetime },
    end_datetime: { $gt: start_datetime },
  };

  if (ignorarId) {
    filtro.id = { $ne: ignorarId };
  }

  return Reserva.findOne(filtro);
}

// Rejeita automaticamente as reservas pendentes da mesma sala
// que tenham sobreposição com a reserva aprovada.
async function rejeitarPendentesConflitantes(
  space_id,
  start_datetime,
  end_datetime,
  ignorarId,
) {
  const resultado = await Reserva.updateMany(
    {
      space_id,
      id: { $ne: ignorarId },
      status: "PENDING",
      start_datetime: { $lt: end_datetime },
      end_datetime: { $gt: start_datetime },
    },
    {
      $set: {
        status: "REJECTED",
        rejection_reason:
          "Horário indisponível devido à aprovação de outra reserva.",
      },
    },
  );

  return resultado.modifiedCount ?? resultado.nModified ?? 0;
}

function tratarErro(res, erro) {
  console.error("Erro nas reservas:", erro);

  if (erro.code === 11000) {
    return res.status(409).json({
      mensagem: "Já existe uma reserva com esses dados.",
    });
  }

  return res.status(500).json({
    mensagem: "Erro interno ao processar a reserva.",
  });
}

/**
 * @swagger
 * tags:
 *   - name: Reservas
 *     description: Gerenciamento de reservas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Reserva:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "3afe4457-8d9f-4e70-a27f-5a27952b1ea7"
 *         space_id:
 *           type: string
 *           example: "a1b2c3d4-1111-4222-8333-444455556666"
 *         user_id:
 *           type: string
 *           example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         number_of_people:
 *           type: integer
 *           minimum: 1
 *           example: 5
 *         start_datetime:
 *           type: string
 *           example: "2026-11-16T09:00:00"
 *         end_datetime:
 *           type: string
 *           example: "2026-11-16T11:00:00"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           example: "PENDING"
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *           example: null
 *         created_at:
 *           type: string
 *           example: "2026-11-13T10:00:00.000Z"
 *
 *     ReservaInput:
 *       type: object
 *       required:
 *         - space_id
 *         - start_datetime
 *         - end_datetime
 *         - number_of_people
 *       properties:
 *         space_id:
 *           type: string
 *           example: "a1b2c3d4-1111-4222-8333-444455556666"
 *         user_id:
 *           type: string
 *           example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         number_of_people:
 *           type: integer
 *           minimum: 1
 *           example: 5
 *         start_datetime:
 *           type: string
 *           example: "2026-11-16T14:00:00"
 *         end_datetime:
 *           type: string
 *           example: "2026-11-16T16:00:00"
 *       example:
 *         space_id: "a1b2c3d4-1111-4222-8333-444455556666"
 *         user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         number_of_people: 5
 *         start_datetime: "2026-11-16T14:00:00"
 *         end_datetime: "2026-11-16T16:00:00"
 *
 *     ReservaUpdateInput:
 *       type: object
 *       properties:
 *         start_datetime:
 *           type: string
 *           example: "2026-11-16T14:00:00"
 *         end_datetime:
 *           type: string
 *           example: "2026-11-16T16:00:00"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           example: "APPROVED"
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *           example: null
 *       example:
 *         start_datetime: "2026-11-16T14:00:00"
 *         end_datetime: "2026-11-16T16:00:00"
 *         status: "APPROVED"
 *         rejection_reason: null
 */

/**
 * @swagger
 * /reservas:
 *   get:
 *     summary: Lista todas as reservas
 *     tags: [Reservas]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de reservas
 */
router.get(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const filtro = {};

      if (req.query.status) {
        const status = String(req.query.status).toUpperCase();

        if (!STATUS.includes(status)) {
          return res.status(400).json({
            mensagem: "Status inválido.",
          });
        }

        filtro.status = status;
      }

      if (req.query.space_id) {
        filtro.space_id = req.query.space_id;
      }

      // CLIENT só consulta as próprias reservas.
      if (req.usuario.role === "CLIENT") {
        filtro.user_id = req.usuario.id;
      } else if (req.query.user_id) {
        filtro.user_id = req.query.user_id;
      }

      const reservas = await Reserva.find(filtro).sort({
        created_at: -1,
      });

      return res.status(200).json(reservas);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /reservas/{id}:
 *   get:
 *     summary: Busca uma reserva pelo ID
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reserva encontrada
 *       404:
 *         description: Reserva não encontrada
 */
router.get(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const filtro = {
        id: req.params.id,
      };

      // CLIENT não pode consultar reserva de outro usuário.
      if (req.usuario.role === "CLIENT") {
        filtro.user_id = req.usuario.id;
      }

      const reserva = await Reserva.findOne(filtro);

      if (!reserva) {
        return res.status(404).json({
          mensagem: "Reserva não encontrada.",
        });
      }

      return res.status(200).json(reserva);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /reservas:
 *   post:
 *     summary: Cria uma nova reserva
 *     description: Cria uma solicitação de reserva para uma sala em um horário disponível. A reserva é criada com status PENDING.
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservaInput'
 *     responses:
 *       201:
 *         description: Reserva criada com sucesso
 *       400:
 *         description: Dados inválidos ou sala indisponível
 *       404:
 *         description: Usuário ou sala não encontrados
 *       409:
 *         description: Conflito com outra reserva aprovada
 */
router.post(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const { space_id, start_datetime, end_datetime, number_of_people } =
        req.body;

      // CLIENT sempre cria uma reserva para si mesmo.
      // ADMIN e RECEPTION podem informar o usuário.
      const user_id =
        req.usuario.role === "CLIENT" ? req.usuario.id : req.body.user_id;

      if (!space_id || !user_id || !start_datetime || !end_datetime) {
        return res.status(400).json({
          mensagem: "Informe sala, usuário, data inicial e data final.",
        });
      }

      if (
        number_of_people === undefined ||
        number_of_people === null ||
        String(number_of_people).trim() === "" ||
        !Number.isInteger(Number(number_of_people)) ||
        Number(number_of_people) < 1
      ) {
        return res.status(400).json({
          mensagem:
            "Informe uma quantidade válida de pessoas (número inteiro maior que zero).",
        });
      }

      const quantidadePessoas = Number(number_of_people);

      const validacao = validarDatas(start_datetime, end_datetime);

      if (validacao.erro) {
        return res.status(400).json({
          mensagem: validacao.erro,
        });
      }

      const usuario = await Usuario.findOne({ id: user_id });

      if (!usuario) {
        return res.status(404).json({
          mensagem: "Usuário não encontrado.",
        });
      }

      const sala = await Sala.findOne({ id: space_id });

      if (!sala) {
        return res.status(404).json({
          mensagem: "Sala não encontrada.",
        });
      }

      if (!sala.is_active) {
        return res.status(400).json({
          mensagem: "Esta sala está inativa.",
        });
      }

      if (
        !Number.isInteger(Number(sala.capacity)) ||
        Number(sala.capacity) < 1
      ) {
        return res.status(400).json({
          mensagem:
            "A capacidade desta sala não está configurada corretamente.",
        });
      }

      if (quantidadePessoas > Number(sala.capacity)) {
        return res.status(400).json({
          mensagem: `A quantidade de pessoas (${quantidadePessoas}) ultrapassa a capacidade da sala (${sala.capacity}).`,
        });
      }

      const disponivel = await dentroDaDisponibilidade(
        space_id,
        validacao.inicio,
        validacao.fim,
        usuario,
      );

      if (!disponivel) {
        return res.status(400).json({
          mensagem: "A sala não está disponível neste horário.",
        });
      }

      const conflito = await encontrarConflito(
        space_id,
        start_datetime,
        end_datetime,
      );

      if (conflito) {
        return res.status(409).json({
          mensagem: "Já existe uma reserva aprovada neste horário.",
        });
      }

      const novaReserva = await Reserva.create({
        id: randomUUID(),
        space_id,
        user_id,
        number_of_people: quantidadePessoas,
        start_datetime,
        end_datetime,
        status: "PENDING",
        rejection_reason: null,
        created_at: new Date().toISOString(),
      });

      return res.status(201).json(novaReserva);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /reservas/{id}:
 *   put:
 *     summary: Atualiza uma reserva
 *     description: Permite atualizar o horário ou alterar o status da reserva. Para aprovar, a sala deve continuar disponível.
 *     tags: [Reservas]
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
 *             $ref: '#/components/schemas/ReservaUpdateInput'
 *     responses:
 *       200:
 *         description: Reserva atualizada com sucesso
 *       400:
 *         description: Dados inválidos ou transição de status não permitida
 *       404:
 *         description: Reserva não encontrada
 *       409:
 *         description: Conflito com outra reserva aprovada
 */
router.put(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const filtro = {
        id: req.params.id,
      };

      // CLIENT só pode encontrar a própria reserva.
      if (req.usuario.role === "CLIENT") {
        filtro.user_id = req.usuario.id;
      }

      const reserva = await Reserva.findOne(filtro);

      if (!reserva) {
        return res.status(404).json({
          mensagem: "Reserva não encontrada.",
        });
      }

      // Regras específicas para CLIENT.
      if (req.usuario.role === "CLIENT") {
        const camposPermitidos = ["status"];
        const camposRecebidos = Object.keys(req.body);

        const possuiCampoNaoPermitido = camposRecebidos.some(
          (campo) => !camposPermitidos.includes(campo),
        );

        if (possuiCampoNaoPermitido) {
          return res.status(403).json({
            mensagem:
              "Você só pode cancelar uma reserva própria que esteja pendente.",
          });
        }

        if (
          req.body.status === undefined ||
          String(req.body.status).toUpperCase() !== "CANCELLED"
        ) {
          return res.status(400).json({
            mensagem: "Você só pode cancelar sua própria reserva.",
          });
        }

        if (reserva.status !== "PENDING") {
          return res.status(400).json({
            mensagem:
              "Somente reservas pendentes podem ser canceladas pelo cliente.",
          });
        }

        reserva.status = "CANCELLED";
        reserva.rejection_reason = null;

        await reserva.save();

        return res.status(200).json(reserva);
      }

      // Regras de atualização para ADMIN e RECEPTION.
      const novoStatus = req.body.status
        ? String(req.body.status).toUpperCase()
        : reserva.status;

      if (!STATUS.includes(novoStatus)) {
        return res.status(400).json({
          mensagem: "Status inválido.",
        });
      }

      if (
        ["REJECTED", "CANCELLED"].includes(reserva.status) &&
        novoStatus !== reserva.status
      ) {
        return res.status(400).json({
          mensagem:
            "Não é possível alterar uma reserva rejeitada ou cancelada.",
        });
      }

      if (
        reserva.status === "APPROVED" &&
        !["APPROVED", "CANCELLED"].includes(novoStatus)
      ) {
        return res.status(400).json({
          mensagem:
            "Uma reserva aprovada só pode permanecer aprovada ou ser cancelada.",
        });
      }

      const rejectionReason =
        req.body.rejection_reason !== undefined
          ? req.body.rejection_reason
          : reserva.rejection_reason;

      if (novoStatus === "REJECTED" && !rejectionReason) {
        return res.status(400).json({
          mensagem: "Informe o motivo da rejeição.",
        });
      }

      const start_datetime = req.body.start_datetime || reserva.start_datetime;

      const end_datetime = req.body.end_datetime || reserva.end_datetime;

      const alterouDatas =
        start_datetime !== reserva.start_datetime ||
        end_datetime !== reserva.end_datetime;

      const validacao = validarDatas(
        start_datetime,
        end_datetime,
        alterouDatas,
      );

      if (validacao.erro) {
        return res.status(400).json({
          mensagem: validacao.erro,
        });
      }

      const usuario = await Usuario.findOne({
        id: reserva.user_id,
      });

      if (!usuario) {
        return res.status(404).json({
          mensagem: "Usuário da reserva não encontrado.",
        });
      }

      const sala = await Sala.findOne({
        id: reserva.space_id,
      });

      if (!sala) {
        return res.status(404).json({
          mensagem: "Sala da reserva não encontrada.",
        });
      }

      if (!sala.is_active && novoStatus !== "CANCELLED") {
        return res.status(400).json({
          mensagem: "Esta sala está inativa.",
        });
      }

      if (novoStatus === "APPROVED" || alterouDatas) {
        const disponivel = await dentroDaDisponibilidade(
          reserva.space_id,
          validacao.inicio,
          validacao.fim,
          usuario,
        );

        if (!disponivel) {
          return res.status(400).json({
            mensagem: "A sala não está disponível neste horário.",
          });
        }

        const conflito = await encontrarConflito(
          reserva.space_id,
          start_datetime,
          end_datetime,
          reserva.id,
        );

        if (conflito) {
          return res.status(409).json({
            mensagem: "Já existe outra reserva aprovada neste horário.",
          });
        }
      }

      reserva.start_datetime = start_datetime;
      reserva.end_datetime = end_datetime;
      reserva.status = novoStatus;
      reserva.rejection_reason =
        novoStatus === "REJECTED" ? rejectionReason : null;

      await reserva.save();

      let reservasRejeitadas = 0;

      // Quando uma reserva é aprovada, rejeita as outras pendentes
      // da mesma sala que tenham sobreposição de horário.
      if (novoStatus === "APPROVED") {
        reservasRejeitadas = await rejeitarPendentesConflitantes(
          reserva.space_id,
          start_datetime,
          end_datetime,
          reserva.id,
        );
      }

      return res.status(200).json({
        ...reserva.toObject(),
        reservas_rejeitadas: reservasRejeitadas,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

/**
 * @swagger
 * /reservas/{id}:
 *   delete:
 *     summary: Exclui uma reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reserva excluída
 *       404:
 *         description: Reserva não encontrada
 */
router.delete(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const reserva = await Reserva.findOneAndDelete({
        id: req.params.id,
      });

      if (!reserva) {
        return res.status(404).json({
          mensagem: "Reserva não encontrada.",
        });
      }

      return res.status(200).json({
        mensagem: "Reserva excluída com sucesso.",
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

module.exports = router;
