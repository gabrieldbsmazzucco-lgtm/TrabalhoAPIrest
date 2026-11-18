const express = require("express");
const Disponibilidade = require("../models/Disponibilidade");
const Reserva = require("../models/Reserva");
const Sala = require("../models/Sala");
const { randomUUID } = require("crypto");

const authMiddleware = require("../middlewares/authMiddleware");
const permissaoMiddleware = require("../middlewares/permissaoMiddleware");

const router = express.Router();

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function timeToMinutes(time) {
  const [h, m] = String(time).split(":");
  return Number(h) * 60 + Number(m);
}

function parseDia(value) {
  const dia =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  return Number.isInteger(dia) && dia >= 0 && dia <= 6 ? dia : null;
}

function validarJanela({
  day_of_week,
  start_time,
  end_time,
  is_external_allowed,
}) {
  const dia = parseDia(day_of_week);

  if (dia === null) {
    return {
      erro: "day_of_week deve ser um número inteiro de 0 (domingo) a 6 (sábado).",
    };
  }

  if (
    !HORA_REGEX.test(String(start_time)) ||
    !HORA_REGEX.test(String(end_time))
  ) {
    return {
      erro: "start_time e end_time devem estar no formato HH:MM (ex: 08:00).",
    };
  }

  if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
    return {
      erro: "start_time deve ser anterior a end_time.",
    };
  }

  if (typeof is_external_allowed !== "boolean") {
    return {
      erro: "is_external_allowed deve ser true ou false.",
    };
  }

  return {
    dados: {
      day_of_week: dia,
      start_time,
      end_time,
      is_external_allowed,
    },
  };
}

// Verifica conflitos somente com disponibilidades ativas.
// Documentos antigos sem is_active são considerados ativos.
async function findConflict(
  space_id,
  day_of_week,
  start_time,
  end_time,
  ignoreId,
) {
  const inicio = timeToMinutes(start_time);
  const fim = timeToMinutes(end_time);

  const filtro = {
    space_id,
    day_of_week,
    is_active: { $ne: false },
    ...(ignoreId ? { id: { $ne: ignoreId } } : {}),
  };

  const disponibilidades = await Disponibilidade.find(filtro);

  return disponibilidades.find(
    (d) =>
      inicio < timeToMinutes(d.end_time) && fim > timeToMinutes(d.start_time),
  );
}

// Verifica se alguma reserva utiliza o intervalo da disponibilidade.
// Considera todos os status, inclusive CANCELLED e REJECTED.
async function possuiReservaVinculada(disponibilidade) {
  const reservas = await Reserva.find({
    space_id: disponibilidade.space_id,
  });

  const inicioDisponibilidade = timeToMinutes(disponibilidade.start_time);
  const fimDisponibilidade = timeToMinutes(disponibilidade.end_time);

  return reservas.some((reserva) => {
    const inicio = new Date(reserva.start_datetime);
    const fim = new Date(reserva.end_datetime);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      return false;
    }

    if (inicio.getDay() !== disponibilidade.day_of_week) {
      return false;
    }

    if (
      inicio.getFullYear() !== fim.getFullYear() ||
      inicio.getMonth() !== fim.getMonth() ||
      inicio.getDate() !== fim.getDate()
    ) {
      return false;
    }

    const inicioReserva = inicio.getHours() * 60 + inicio.getMinutes();
    const fimReserva = fim.getHours() * 60 + fim.getMinutes();

    return (
      inicioReserva < fimDisponibilidade && fimReserva > inicioDisponibilidade
    );
  });
}

function tratarErro(res, erro) {
  console.error("Erro nas disponibilidades:", erro);

  if (erro.code === 11000) {
    return res.status(409).json({
      message: "Já existe uma disponibilidade com esse ID.",
    });
  }

  return res.status(500).json({
    message: "Erro interno ao processar a disponibilidade.",
  });
}

// ============================================
// DOCUMENTAÇÃO SWAGGER
// ============================================

/**
 * @swagger
 * tags:
 *   - name: Disponibilidades
 *     description: Gerenciamento de disponibilidades dos espaços
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Disponibilidade:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         space_id:
 *           type: string
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         start_time:
 *           type: string
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           example: "12:00"
 *         is_external_allowed:
 *           type: boolean
 *         is_active:
 *           type: boolean
 *           example: true
 *       example:
 *         id: "f75e23c0-6f4f-469c-aac3-cf40574d8758"
 *         space_id: "a1b2c3d4-1111-4222-8333-444455556666"
 *         day_of_week: 1
 *         start_time: "08:00"
 *         end_time: "12:00"
 *         is_external_allowed: true
 *         is_active: true
 *
 *     DisponibilidadeInput:
 *       type: object
 *       required:
 *         - space_id
 *         - day_of_week
 *         - start_time
 *         - end_time
 *       properties:
 *         space_id:
 *           type: string
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         start_time:
 *           type: string
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           example: "18:00"
 *         is_external_allowed:
 *           type: boolean
 *
 *     DisponibilidadeUpdate:
 *       type: object
 *       properties:
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         start_time:
 *           type: string
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           example: "18:00"
 *         is_external_allowed:
 *           type: boolean
 *         is_active:
 *           type: boolean
 *           description: Envie true para reativar uma disponibilidade inativa.
 */

// ============================================
// GET - LISTAR DISPONIBILIDADES
// ============================================

/**
 * @swagger
 * /disponibilidades:
 *   get:
 *     summary: Listar disponibilidades
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: query
 *         name: space_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *       - in: query
 *         name: is_external_allowed
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: include_inactive
 *         description: Permite que ADMIN e RECEPTION consultem também disponibilidades inativas.
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de disponibilidades retornada com sucesso
 */

router.get(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION", "CLIENT"),
  async (req, res) => {
    try {
      const { space_id, day_of_week, is_external_allowed, include_inactive } =
        req.query;

      const filtro = {};

      if (space_id) {
        filtro.space_id = space_id;
      }

      if (day_of_week !== undefined) {
        const dia = parseDia(day_of_week);

        if (dia === null) {
          return res.status(400).json({
            message: "day_of_week deve ser um número inteiro de 0 a 6.",
          });
        }

        filtro.day_of_week = dia;
      }

      if (is_external_allowed !== undefined) {
        if (is_external_allowed !== "true" && is_external_allowed !== "false") {
          return res.status(400).json({
            message: "is_external_allowed deve ser true ou false.",
          });
        }

        filtro.is_external_allowed = is_external_allowed === "true";
      }

      if (include_inactive !== undefined) {
        if (include_inactive !== "true" && include_inactive !== "false") {
          return res.status(400).json({
            message: "include_inactive deve ser true ou false.",
          });
        }
      }

      // CLIENT nunca pode consultar disponibilidades inativas.
      // ADMIN e RECEPTION podem usar include_inactive=true.
      if (req.usuario.role === "CLIENT" || include_inactive !== "true") {
        filtro.is_active = { $ne: false };
      }

      const disponibilidades = await Disponibilidade.find(filtro);

      return res.json(disponibilidades);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

// ============================================
// GET - BUSCAR POR ID
// ============================================

/**
 * @swagger
 * /disponibilidades/{id}:
 *   get:
 *     summary: Buscar disponibilidade por ID
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *       404:
 *         description: Disponibilidade não encontrada
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

      if (req.usuario.role === "CLIENT") {
        filtro.is_active = { $ne: false };
      }

      const disponibilidade = await Disponibilidade.findOne(filtro);

      if (!disponibilidade) {
        return res.status(404).json({
          message: "Disponibilidade não encontrada",
        });
      }

      return res.json(disponibilidade);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

// ============================================
// POST - CADASTRAR DISPONIBILIDADE
// ============================================

/**
 * @swagger
 * /disponibilidades:
 *   post:
 *     summary: Cadastrar nova disponibilidade
 *     description: Cadastra uma janela de horário para uma sala existente e ativa.
 *     tags: [Disponibilidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *     responses:
 *       201:
 *         description: Disponibilidade cadastrada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Sala não encontrada
 *       409:
 *         description: Conflito de horários
 */

router.post(
  "/",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const { space_id, day_of_week, start_time, end_time } = req.body;

      const is_external_allowed =
        req.body.is_external_allowed === undefined
          ? true
          : req.body.is_external_allowed;

      if (!space_id || day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({
          message:
            "Os campos space_id, day_of_week, start_time e end_time são obrigatórios.",
        });
      }

      const validacao = validarJanela({
        day_of_week,
        start_time,
        end_time,
        is_external_allowed,
      });

      if (validacao.erro) {
        return res.status(400).json({
          message: validacao.erro,
        });
      }

      const sala = await Sala.findOne({ id: space_id });

      if (!sala) {
        return res.status(404).json({
          message: "Sala não encontrada",
        });
      }

      if (!sala.is_active) {
        return res.status(400).json({
          message:
            "Não é possível cadastrar disponibilidade para uma sala inativa.",
        });
      }

      const conflito = await findConflict(
        space_id,
        validacao.dados.day_of_week,
        start_time,
        end_time,
      );

      if (conflito) {
        return res.status(409).json({
          message:
            "Já existe uma janela cadastrada que se sobrepõe a este horário para esta sala e dia.",
        });
      }

      const novaDisponibilidade = new Disponibilidade({
        id: randomUUID(),
        space_id,
        ...validacao.dados,
        is_active: true,
      });

      await novaDisponibilidade.save();

      return res.status(201).json(novaDisponibilidade);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

// ============================================
// PUT - ATUALIZAR OU REATIVAR DISPONIBILIDADE
// ============================================

/**
 * @swagger
 * /disponibilidades/{id}:
 *   put:
 *     summary: Atualizar ou reativar disponibilidade
 *     description: Atualiza os horários ou reativa uma disponibilidade inativa enviando is_active=true.
 *     tags: [Disponibilidades]
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
 *             $ref: '#/components/schemas/DisponibilidadeUpdate'
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada ou reativada com sucesso
 *       400:
 *         description: Dados inválidos ou sala inativa
 *       404:
 *         description: Disponibilidade não encontrada
 *       409:
 *         description: Conflito de horários
 */

router.put(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const atual = await Disponibilidade.findOne({
        id: req.params.id,
      });

      if (!atual) {
        return res.status(404).json({
          message: "Disponibilidade não encontrada",
        });
      }

      // A reativação só é aceita com o valor booleano true.
      // Para desativar, utilize a rota DELETE.
      if (
        req.body.is_active !== undefined &&
        req.body.is_active !== true &&
        req.body.is_active !== false
      ) {
        return res.status(400).json({
          message: "is_active deve ser true ou false.",
        });
      }

      if (req.body.is_active === false) {
        return res.status(400).json({
          message: "Para desativar uma disponibilidade, utilize DELETE.",
        });
      }

      const { day_of_week, start_time, end_time, is_external_allowed } =
        req.body;

      const validacao = validarJanela({
        day_of_week:
          day_of_week !== undefined ? day_of_week : atual.day_of_week,

        start_time: start_time !== undefined ? start_time : atual.start_time,

        end_time: end_time !== undefined ? end_time : atual.end_time,

        is_external_allowed:
          is_external_allowed !== undefined
            ? is_external_allowed
            : atual.is_external_allowed,
      });

      if (validacao.erro) {
        return res.status(400).json({
          message: validacao.erro,
        });
      }

      const { dados } = validacao;
      const desejaReativar = req.body.is_active === true;

      // Se estiver reativando, a sala também precisa estar ativa.
      if (desejaReativar) {
        const sala = await Sala.findOne({
          id: atual.space_id,
        });

        if (!sala) {
          return res.status(404).json({
            message:
              "A sala vinculada a esta disponibilidade não foi encontrada.",
          });
        }

        if (!sala.is_active) {
          return res.status(400).json({
            message:
              "Não é possível reativar a disponibilidade porque a sala está inativa. Reative a sala primeiro.",
          });
        }
      }

      // Verifica conflitos com outras disponibilidades ativas.
      const conflito = await findConflict(
        atual.space_id,
        dados.day_of_week,
        dados.start_time,
        dados.end_time,
        atual.id,
      );

      if (conflito) {
        return res.status(409).json({
          message:
            "Já existe uma janela cadastrada que se sobrepõe a este horário para esta sala e dia.",
        });
      }

      atual.day_of_week = dados.day_of_week;
      atual.start_time = dados.start_time;
      atual.end_time = dados.end_time;
      atual.is_external_allowed = dados.is_external_allowed;

      if (desejaReativar) {
        atual.is_active = true;
      }

      await atual.save();

      return res.json({
        message: desejaReativar
          ? "Disponibilidade reativada com sucesso."
          : "Disponibilidade atualizada com sucesso.",
        disponibilidade: atual,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

// ============================================
// DELETE - EXCLUIR OU DESATIVAR DISPONIBILIDADE
// ============================================

/**
 * @swagger
 * /disponibilidades/{id}:
 *   delete:
 *     summary: Excluir ou desativar disponibilidade
 *     description: Exclui permanentemente quando não existem reservas vinculadas. Caso existam, desativa e preserva o registro.
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Disponibilidade excluída ou desativada
 *       404:
 *         description: Disponibilidade não encontrada
 */

router.delete(
  "/:id",
  authMiddleware,
  permissaoMiddleware("ADMIN", "RECEPTION"),
  async (req, res) => {
    try {
      const disponibilidade = await Disponibilidade.findOne({
        id: req.params.id,
      });

      if (!disponibilidade) {
        return res.status(404).json({
          message: "Disponibilidade não encontrada",
        });
      }

      const possuiReserva = await possuiReservaVinculada(disponibilidade);

      if (possuiReserva) {
        if (disponibilidade.is_active === false) {
          return res.json({
            message:
              "A disponibilidade já está inativa e possui reservas vinculadas.",
            acao: "JA_INATIVA",
            disponibilidade,
          });
        }

        disponibilidade.is_active = false;

        await disponibilidade.save();

        return res.json({
          message:
            "A disponibilidade possui reservas vinculadas e foi desativada. O histórico foi preservado.",
          acao: "DESATIVADA",
          disponibilidade,
        });
      }

      await Disponibilidade.deleteOne({
        id: disponibilidade.id,
      });

      return res.json({
        message: "Disponibilidade excluída permanentemente.",
        acao: "EXCLUIDA",
        disponibilidade,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  },
);

module.exports = router;
