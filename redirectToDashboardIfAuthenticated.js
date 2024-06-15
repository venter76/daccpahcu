function redirectToDashboardIfAuthenticated(req, res, next) {
    console.log("Checking if user is already authenticated");
    if (req.isAuthenticated()) {
    //   console.log("User is authenticated");
      return res.redirect('/base');
    } else {
    //   console.log("User is not authenticated");
    }
    next();
  }
  
  module.exports = redirectToDashboardIfAuthenticated;
