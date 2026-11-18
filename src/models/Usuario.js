const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

// Estrutura dos usuários no MongoDB
const usuarioSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID,
      unique: true,
      immutable: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    // Campo antigo: preservado, não utilizado no login.
    password_hash: {
      type: String,
      default: "",
      select: false,
    },

    // Novo campo: hash bcrypt utilizado na autenticação.
    login_password_hash: {
      type: String,
      default: "",
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "CLIENT", "RECEPTION"],
      uppercase: true,
    },

    cpf_cnpj: {
      type: String,
      default: null,
    },

    company_id: {
      type: String,
      default: null,
    },

    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  },
);

// Criação do model Usuario
const Usuario = mongoose.model("Usuario", usuarioSchema);

module.exports = Usuario;
