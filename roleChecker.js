// Function to check and log the user's role
function checkUserRole(user) {
    if (user && user.role) {
      console.log(`User Role: ${user.role}`);
    } else {
      console.log('User role not found or user is undefined');
    }
  }
  
  // Export the function
  module.exports = checkUserRole;
  