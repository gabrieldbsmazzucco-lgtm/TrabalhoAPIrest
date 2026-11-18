const express = require("express");
const router = express.Router();

router.use("/empresas", require("./empresasRoutes"));
router.use("/salas", require("./salasRoutes"));
router.use("/reservas", require("./reservasRoutes"));
router.use("/disponibilidades", require("./disponibilidadesRoutes"));
router.use("/usuarios", require("./usuarioRoutes"));
router.use("/auth", require("./authRoutes"));

module.exports = router;
