const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const empresaSchema = new mongoose.Schema(
  {
    ID: {
      type: String,
      default: randomUUID,
      unique: true,
      immutable: true,
    },
    Nome_corporativo: {
      type: String,
      required: true,
      trim: true,
    },
    Nome_Trade: {
      type: String,
      required: true,
      trim: true,
    },
    CNPJ: {
      type: String,
      required: true,
      trim: true,
    },
    CNPJ_normalizado: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    telefone: {
      type: String,
      required: true,
      trim: true,
    },
    Data_criacao: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

const Empresa = mongoose.model("Empresa", empresaSchema);

module.exports = Empresa;
