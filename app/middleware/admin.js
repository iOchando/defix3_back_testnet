const {
  handleErrorResponse,
  handleHttpError,
} = require("../utils/handleError");

const checkAuth = async (req, res, next) => {
  try {
    console.log(req.headers.authorization)
    if (!req.headers.authorization) {
        handleErrorResponse(res, "NOT_ALLOW", 409);
      return;
    }
    const token = req.headers.authorization.split(" ").pop();
    if (token === process.env.KEY_DJANGO) {
      next();
    } else {
      handleErrorResponse(res, "NOT_ALLOW", 409);
    }
  } catch (e) {
    handleHttpError(res, e);
  }
};

module.exports = checkAuth;
