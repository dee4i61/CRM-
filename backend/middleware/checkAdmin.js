const checkAdmin = (req, res, next) => {
  console.log('req.body', req.body)
  try {
    const userData = req.user;
    if(userData.role !== "admin" ){
        return res.status(401).json({error: "Admin access required"})
    }
    next();
  } catch (err) {
    console.log('err', err)
    return res.status(500).send({
      error: err.message
    });
  }
};

module.exports = checkAdmin;
