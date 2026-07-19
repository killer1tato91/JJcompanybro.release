// backend/store/trades.js

const trades = [];

function addTrade(trade) {
  trades.push(trade);
}

function getTrades() {
  return trades;
}

module.exports = {
  trades,
  addTrade,
  getTrades
};