function redirectToDashboardIfAuthenticated(req, res, next) {
  console.log("Checking if user is already authenticated");
  if (req.session) {
      if (req.session.isLoggedIn) {
          console.log("Session exists and user is logged in");
          return res.redirect('/base');
      } else {
          console.log("Session exists but user is not logged in");
      }
  } else {
      console.log("Session does not exist");
  }
  next();
}

module.exports = redirectToDashboardIfAuthenticated;
