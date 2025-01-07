const jwt = require("jsonwebtoken");
const User = require("../models/userModels");

const jwtToken = async (req, res, next) => {
  console.log("Middleware 'jwtToken' invoked");

  // Ensure cookies are parsed and logged
  console.log("Cookies received:", req.cookies);

  // Extract token from cookies
  const token = req.cookies?.token;
  console.log("Token extracted from cookies:", token);

  // If token is missing, return an error
  if (!token) {
    console.log("Token is missing from cookies.");
    return res.status(401).send({
      success: false,
      message: "Not authorized, token not provided",
    });
  }

  try {
    // Verify the token
    console.log("Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log("Decoded token:", decoded);

    // Fetch user data from the database
    console.log("Fetching user data...");
    const userData = await User.findById(decoded.id);

    // Handle user not found
    if (!userData) {
      console.log("User not found in the database.");
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Handle blocked users
    if (userData.isBlocked) {
      console.log("User is blocked.");
      return res.status(403).send({
        success: false,
        message: "Your account has been blocked. Please contact the administrator.",
      });
    }

    // Attach user data to request object for further use
    console.log("User authenticated successfully.");
    req.user = userData;
    next();
  } catch (err) {
    // Log and handle token verification or user lookup errors
    console.log("Error during token verification or user lookup:", err.message);
    res.status(401).send({
      success: false,
      message: "Not authorized, token verification failed",
    });
  }
};

module.exports = { jwtToken };
