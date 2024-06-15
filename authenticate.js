function checkAuthenticated(req, res, next) {
  // console.log("Entered checkAuthenticated middleware");

  if (req.isAuthenticated()) {
    // console.log("User is authenticated");
    return next();
  } else {
    console.log("User is not authenticated, redirecting to login page");
    req.session.redirectTo = req.originalUrl; // Store the original URL the user wanted to access
    return res.redirect('/'); // Redirect to the login page
  }
}

module.exports = checkAuthenticated;
