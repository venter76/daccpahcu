function checkAuthenticated(req, res, next) {
  console.log("Entered checkAuthenticated middleware");

  if (req.session && req.session.isLoggedIn) {
    console.log("Session exists and user is logged in");
    return next();
  } else {
    console.log("No active session or user not logged in, redirecting to login page");
    req.session.redirectTo = req.originalUrl;
    res.redirect('/'); // Redirect to login page
  }
}

module.exports = checkAuthenticated;
