const users = require('../data/users');

const login = (req, res) => {

  const { username, password } = req.body;

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Credenciales incorrectas"
    });
  }

  return res.json({
    success: true,
    message: "Login exitoso",
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
};

module.exports = { login };