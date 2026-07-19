// backend/store/accounts.js

const accounts = {
  master: {
    id: "master-1",
    name: "MASTER",
    role: "master"
  },
  slaves: [
    { id: "slave-1", name: "SLAVE 1", role: "slave" },
    { id: "slave-2", name: "SLAVE 2", role: "slave" }
  ]
};

module.exports = accounts;