require("dotenv").config();

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const routes = require("./src/routes");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

// Configurações gerais
app.use(cors());
app.use(express.json());

// Configuração do Swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Reservamento de salas",
      version: "1.0.0",
      description: "API para realizar reservas de salas",
      license: {
        name: "Licenciado para DA 2",
      },
      contact: {
        name: "José Henrique Pereira Pimentel, Gabriel de Bona, Matheus Miguel, Pablo Augusto e Davi Zapellini",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Configuração dos cabeçalhos
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

// Rotas da API
app.use("/", routes);

// Conexão com MongoDB e inicialização do servidor
async function iniciarServidor() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI não foi definida no arquivo .env");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("Conectado ao MongoDB com sucesso!");

    app.listen(PORT, function () {
      console.log(`Aplicação executando na porta ${PORT}!`);
    });
  } catch (erro) {
    console.error("Erro ao conectar ao MongoDB:", erro.message);
    process.exit(1);
  }
}

iniciarServidor();
