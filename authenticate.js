function checkAuthenticated(req, res, next) {
  console.log("Entered checkAuthenticated middleware");
    if (req.session && req.session.isLoggedIn) {
      return next();
    } else {
        req.session.redirectTo = req.originalUrl;
      res.redirect('/'); // Redirect to login page
    }
  }

  module.exports = checkAuthenticated;