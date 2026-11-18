const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const reservaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID,
      unique: true,
      immutable: true,
    },
    space_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    number_of_people: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "A quantidade de pessoas deve ser um número inteiro.",
      },
    },
    start_datetime: {
      type: String,
      required: true,
    },
    end_datetime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      uppercase: true,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    created_at: {
      type: String,
      required: true,
      immutable: true,
    },
  },
  {
    versionKey: false,
  },
);

reservaSchema.index({ space_id: 1, start_datetime: 1 });
reservaSchema.index({ user_id: 1 });
reservaSchema.index({ status: 1 });

const Reserva = mongoose.model("Reserva", reservaSchema);

module.exports = Reserva;
