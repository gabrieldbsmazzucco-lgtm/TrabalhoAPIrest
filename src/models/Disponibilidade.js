const mongoose = require("mongoose");

const disponibilidadeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    space_id: {
      type: String,
      required: true,
    },
    day_of_week: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      validate: {
        validator: Number.isInteger,
        message: "O dia da semana deve ser um número inteiro.",
      },
    },
    start_time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    end_time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    is_external_allowed: {
      type: Boolean,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false },
);

disponibilidadeSchema.index({
  space_id: 1,
  day_of_week: 1,
});

const Disponibilidade = mongoose.model(
  "Disponibilidade",
  disponibilidadeSchema,
);

module.exports = Disponibilidade;
