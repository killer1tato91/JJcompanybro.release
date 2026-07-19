// backend/routes/trades.routes.js

const express = require("express");
const router = express.Router();

const accounts = require("../store/accounts");
const { addTrade, getTrades } = require("../store/trades");

// MASTER envía trade
router.post("/send", (req, res) => {
  const trade = req.body;

  const masterTrade = {
    ...trade,
    from: accounts.master.name,
    timestamp: Date.now()
  };

  // Guardar trade
  addTrade(masterTrade);

  // Simular copia a SLAVES
  const copied = accounts.slaves.map(slave => ({
    ...masterTrade,
    to: slave.name
  }));

  res.json({
    message: "Trade enviado y copiado",
    master: masterTrade,
    slaves: copied
  });
});

// Ver trades
router.get("/", (req, res) => {
  res.json(getTrades());
});

module.exports = router;