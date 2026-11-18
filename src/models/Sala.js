const mongoose = require("mongoose");

const salaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["COWORKING", "LAB", "MEETING_ROOM"],
      uppercase: true,
    },
    capacity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "A capacidade deve ser um número inteiro.",
      },
      min: [1, "A capacidade deve ser maior que zero."],
    },
    description: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { versionKey: false },
);

const Sala = mongoose.model("Sala", salaSchema);

module.exports = Sala;
