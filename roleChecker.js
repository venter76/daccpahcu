// Function to check and log the user's role
function checkUserRole(user, req, res, selectedDate) {
  if (user && user.role) {
      console.log(`User Role: ${user.role}`);
      console.log(selectedDate);
      if (user.role === "none") {
          req.flash('info', 'You do not have permission to perform this task');
          return res.redirect(`/detail?selectedDate=${selectedDate}`);
      }
  } else {
      console.log('User role not found or user is undefined');
  }
}

// Export the function
module.exports = checkUserRole;

  