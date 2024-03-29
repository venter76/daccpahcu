// Function to check and log the user's role
function checkUserRole(user, req, res, selectedDate) {
    if (user && user.role) {
        console.log(`User Role: ${user.role}`);
        console.log(selectedDate);
        if (user.role === "none") {
            req.flash('info', 'You do not have permission to perform this task');
            res.redirect(`/detail?selectedDate=${selectedDate}`);
            return false; // Indicates response has been sent
        }
        return true; // Indicates no response has been sent
    } else {
        console.log('User role not found or user is undefined');
        return true; // Indicates no response has been sent
    }
  }
  
  module.exports = checkUserRole;
  