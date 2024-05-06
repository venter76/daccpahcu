const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const mongoose = require("mongoose");
const moment = require('moment-timezone');
require('dotenv').config();
const MongoStore = require('connect-mongo');
const checkAuthenticated = require('./authenticate.js');
const checkUserRole = require('./roleChecker');
const useragent = require("express-useragent");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const findOrCreate = require('mongoose-findorcreate');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const redirectToDashboardIfAuthenticated = require('./redirectToDashboardIfAuthenticated');
const { v4: uuidv4 } = require('uuid');






 

const app = express();
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(useragent.express());


//Nodemailer setup for email verification:


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});


transporter.verify(function (error, success) {
  if(error) {
      console.log(error);
  } else {
      console.log('Server validation done and ready for messages.')
  }
});






const db_username = process.env.DB_USERNAME;
const db_password = process.env.DB_PASSWORD;
const db_cluster_url = process.env.DB_CLUSTER_URL;
const db_name = process.env.DB_NAME;


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`mongodb+srv://${db_username}:${db_password}@${db_cluster_url}/${db_name}?retryWrites=true&w=majority`, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });

    console.log('Connected to MongoDB Atlas:', conn.connection.host);
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    process.exit(1);
  }
};

// Define the schema for PACU bookings
const pacuBookingSchema = new mongoose.Schema({
    patientFirstName: {
      type: String,
      required: true
    },
    patientSurname: {
      type: String,
      required: true
    },
    folderNumber: {
      type: String,
      required: true
    },
    procedure: {
      type: String,
      required: true
    },
    reasonForBooking: {
      type: String,
      required: true
    },
    anaesthetist: {
      type: String,
      required: true
    },
    
    selectedDate: {
      type: Date,
      required: true
    },
    booked: {
      type: Date,
      required: true,
      default: Date.now
    },
    confirmed: {
      type: String,
      default: 'no'
    },
    // New field for colour
    colour: {
      type: String,
      default: 'card text-bg-danger mb-3'  
    },
    // New field for booking person's name
    bookingPerson: {
      type: String,
      required: true
    },
    confirmPerson: {
        type: String,
        default: 'None',
        required: true
      },
      allocatePerson: {
        type: String,
        default: 'None',
        required: true
      }
});

const PacuBooking = mongoose.model('PacuBooking', pacuBookingSchema);





const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  verificationToken: String, // Field for verification token
  resetPasswordToken: String, // Field for password reset token
  resetPasswordExpires: Date, // Field for token expiration time
  firstname: String,
  surname: String,
  date: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    default: "edit"
  },
  active: { // 'active' field to indicate if the account is active
    type: Boolean,
    default: false
  }
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);











//Session cookie setup:


app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: `mongodb+srv://${db_username}:${db_password}@${db_cluster_url}/${db_name}?retryWrites=true&w=majority`,
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // must be 'none' to enable cross-site delivery
      httpOnly: true, // prevents JavaScript from making changes
      

    },
    rolling: true, // Enable the rolling behavior
  }));


  app.use((req, res, next) => {
    console.log("Inactivity timeout middleware entered.");
    
    // Check if session exists and has an expiry time
    if (req.session && req.session.cookie && req.session.cookie.expires) {
      // Calculate time left until session expires
      const timeLeft = new Date(req.session.cookie.expires) - new Date();
      console.log(`Time left for session expiry: ${timeLeft}ms`);
  
      // If time left is less than or equal to 0, destroy the session
      if (timeLeft <= 0) {
        console.log("Session expired due to inactivity.");
        req.session.destroy((err) => {
          if (err) console.error('Error destroying session:', err);
          // Optionally, redirect to login or handle session expiration
        });
      }
    }
  
    next();
  });
  



  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  
  passport.use(User.createStrategy());
  
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


app.use(flash());

  




  const rateLimit = require('express-rate-limit');

  // Define a limiter middleware for login attempts
  const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again in 15 minutes.'
  });
  
  // Apply the rate limiter middleware to your login route
  app.use('/login', loginLimiter);












  


 





  app.get('/checkOnline', (req, res) => {
    console.log('Entered checkOnline route');
    res.status(200).send('Online');
});


// Authentication Route code************:


app.get('/', (req, res, next) => {
  console.log("'/' route hit, checking authentication next");
  next(); // Proceed to the next middleware (redirectToDashboardIfAuthenticated)
}, redirectToDashboardIfAuthenticated, (req, res) => {
  console.log("Going home");
  res.render('home');
});









app.get('/login', (req, res) => {
  console.log("Login get route hit");

  // Retrieve and log both success and error flash messages
  const successMessages = req.flash('success');
  const errorMessages = req.flash('error');
  console.log("Success flash messages available:", successMessages);
  console.log("Error flash messages available:", errorMessages);

  res.render('login', { 
    success: successMessages,
    error: errorMessages
  });
});




app.post("/login", loginLimiter, function(req, res, next) {
  console.log("Login post route hit");

  passport.authenticate("local", function(err, user, info) {
    if (err) {
      console.log("Passport authentication error:", err);
      return next(err); // Pass the error to the next middleware
    }

    if (!user) {
      console.log("Authentication failed, user not found or incorrect credentials");
      req.flash('error', 'Incorrect username or password');
      console.log("Flash message set"); // Debugging
      return res.redirect("/login");
    }

    if (!user.active) {  // User exists but hasn't verified their email
      console.log("User email not verified");
      req.flash('error', 'Please verify your email to complete registration. If you cannot find the email, then register again as a new user.');
      return res.redirect("/verifytoken");
    }

    req.login(user, function(err) {
      if (err) {
        console.log("Error during req.login:", err);
        return next(err); // Pass the error to the next middleware
      }

      // At this point, the user is successfully authenticated.
      console.log(`User ${user.email} logged in successfully, redirecting...`);
      req.session.isLoggedIn = true;

      // Set the session cookie maxAge based on user's role
      if (user.role === "edit") {
        req.session.cookie.maxAge = 2160000; // 6 hours (for "edit" role)
        console.log("Session maxAge set to 6 hours for 'edit' role.");
      } else if (user.role === "none") {
        req.session.cookie.maxAge = 86400000; // 24 hours (for "none" role)
        console.log("Session maxAge set to 24 hours for 'none' role.");
      } else {
        console.log("Default session maxAge used.");
      }

      // Redirect based on user's first login status
      if (!user.firstname) {
        console.log("Redirecting first-time user to welcome page");
        return res.redirect("/welcome");
      } else {
        console.log("Redirecting returning user to the main page");
        return res.redirect("/base");
      }
    });
  })(req, res, next);
});





app.get('/verifytoken', (req, res) => {
  res.render('verifytoken', { 
    success: req.flash('success'),
    error: req.flash('error') 
  });
});








app.get("/welcome", function(req, res){
  res.render("welcome");
});




app.post('/welcome', async (req, res) => {
  // Log req.session and req.user
  // console.log('req.session:', req.session);
  // console.log('req.user:', req.user);

  const { firstName, surname } = req.body;

  console.log(req.body);


  if (!req.user) {
      return res.status(400).send("You must be logged in to access this route.");
  }

  const userId = req.user._id;

  try {
      // Update the user and fetch the updated document
      const user = await User.findByIdAndUpdate(
          userId,
          {
              firstname: firstName,
              surname: surname
          },
          { new: true }
      );

      // User information has been updated successfully
      // Redirect or render the next page here
      res.redirect('/base');

  } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while updating user information.");
  }
});


app.get('/register', function(req, res) {

  console.log('Entered register GET route');
  res.render('register', { 
    success: req.flash('success'),
    error: req.flash('error') 
  });
  });




app.post('/register', async function(req, res) {
  console.log('Entered register POST route');
  // Check if passwords match
  if (req.body.password !== req.body.passwordConfirm) {
      console.log('Passwords do not match');
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/register');
  }

  const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@#$%^&*()_+!]{7,}$/;

    if (!passwordPattern.test(req.body.password)) {
        console.log('Password does not meet requirements.');
        req.flash('error', 'Password must be minimum 7 characters with at least 1 capital letter and 1 number.');
        return res.redirect("/register");
    }

    try {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
          if (!existingUser.active) {
              // The user exists but hasn't been verified yet, remove them and allow re-registration
              await User.deleteOne({ username: req.body.username });
          } else {
              // The user is active and verified, redirect them to login
              req.flash('error', 'User already exists. Please login.');
              return res.redirect('/login');
          }
      }

  

      const user = await User.register({ username: req.body.username, active: false }, req.body.password);

      // Generate a verification token
      const verificationToken = uuidv4();
      user.verificationToken = verificationToken;

      await user.save();

      // Send verification email
      const verificationLink = `${process.env.APP_URL}/verify?token=${verificationToken}`;
      const email = {
          from: 'brayroadapps@gmail.com',
          to: user.username,
          subject: 'Email Verification',
          text: `To register for the DaccPahcu App, please copy and paste this code into text box:    ${verificationToken}`,
          // text: `Please click the following link to verify your email address: ${verificationLink}`,
      };

      try {
          await transporter.sendMail(email);
          console.log('Verification email sent');
          req.flash('success', 'Verification email has been sent - check your email inbox');
          res.redirect('/verifytoken');
      } catch (mailError) {
          console.log('Error sending email:', mailError);
          req.flash('error', 'Failed to send verification email.');
          res.redirect('/register');
      }
  } catch (err) {
      console.log(err);
      req.flash('error', 'An unexpected error occurred.');
      return res.redirect('/home');
  }
});




app.post('/verify', async function(req, res) {
  console.log('Verification route entered');

  // Get the verification token from the form data
  const verificationToken = req.body.verificationToken;

  try {
      // Find the user with the matching verification token
      const user = await User.findOne({ verificationToken: verificationToken });

      if (!user) {
          // Invalid or expired token
          console.log('Token not found or expired');
          res.status(401).send('Unauthorized: Token not found or expired');
          return; // Ensure no further execution after response
      }

      // Update the user's verification status
      user.active = true;
      user.verificationToken = null; // Clear the verification token

      await user.save();
      console.log('Email verified for user2555555555555');
      req.flash('success', 'Email verified for user. Please login.');
      console.log('Redirecting to login page');
      return res.redirect('/login'); // Use return to exit after sending response
  } catch (err) {
      console.log('Error during verification:', err);
      // Avoid sending multiple responses: only one response should be sent
      if (!res.headersSent) {
          res.status(500).send('Error processing request');
      }
  }
});

// Below is origional link code for clickable link from email:


// app.get('/verify', async function(req, res) {
//   console.log('Vefification route entered');
//   const verificationToken = req.query.token;

//   try {
//       // Find the user with the matching verification token
//       const user = await User.findOne({ verificationToken: verificationToken });

    


app.get('/forgotpassword', function(req, res) {
  let message = req.query.message;  // Extract message from the URL parameters.
  res.render('forgotpassword', { message: message });  // Pass message to the view.
});



app.post('/forgotpassword', async function(req, res, next) {
  try {
      const buf = await crypto.randomBytes(20);
      const token = buf.toString('hex');

      const user = await User.findOne({ username: req.body.username });

      if (!user) {
          console.log('No user with this email address');
          return res.redirect('/forgotpassword?message=No%20user%20registered%20with%20this%20email%20address');
      }

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 10800000; // 3 hours
      console.log(new Date(user.resetPasswordExpires));

      await user.save(); // Use await here instead of the callback



      const mailOptions = {
        to: user.username,
        from: 'brayroadapps@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please copy the following token and paste it into the appropriate field on the password reset page:\n\n' +
        token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    };
    




      // const mailOptions = {
      //     to: user.username,
      //     from: 'brayroadapps@gmail.com',
      //     subject: 'Node.js Password Reset',
      //     text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
      //     'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      //     'http://' + req.headers.host + '/reset/' + token + '\n\n' +
      //     'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      // };

      // Convert sendMail to Promise
      const info = await new Promise((resolve, reject) => {
          transporter.sendMail(mailOptions, (error, result) => {
              if (error) reject(error);
              else resolve(result);
          });
      });

      console.log('Password reset email sent');

      // Redirect to the reset page
      res.redirect('/reset');
  } catch (error) {
      console.error("Error occurred:", error);
      res.redirect('/forgotpassword?message=An%20error%20occurred');
  }
});

    

// app.get('/reset/:token', async function(req, res, next) {
//   try {
//     const user = await User.findOne({ 
//       resetPasswordToken: req.params.token, 
//       resetPasswordExpires: { $gt: Date.now() } 
//     });

//     if (!user) {
//       // handle error: no user with this token, or token expired
//       console.log('Password reset token is invalid or has expired.');
//       return res.redirect('/forgotpassword?message=Password%20reset%20token%20is%20invalid%20or%20has%20expired');
//     }

//     // if user found, render a password reset form
//     res.render('reset', {
//       token: req.params.token,
//       error: req.flash('error')
//     });
//   } catch (err) {
//     console.error("Error occurred:", err);
//     next(err); // pass the error to your error-handling middleware, if you have one
//   }
// });


app.get('/reset', function(req, res) {
  res.render('reset', { error: req.flash('error') });
});




app.post('/reset', async function(req, res, next) {
  try {
    const user = await User.findOne({ 
      resetPasswordToken: req.body.token, // Get token from form body
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      console.log('Password reset token is invalid or has expired.');
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgotpassword');
    }

    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@#$%^&*()_+!]{7,}$/;
    if (!passwordPattern.test(req.body.password)) {
        console.log('Password does not meet requirements.');
        req.flash('error', 'Password must be minimum 7 characters with at least 1 capital letter and 1 number.');
        return res.redirect("/reset");
    }

    // Check if passwords match
    if (req.body.password !== req.body.passwordConfirm) {
      console.log('Passwords do not match');
      req.flash('error', 'Passwords do not match');
      return res.redirect("/reset");
    }

    // Assuming you have an asynchronous setPassword function. 
    await user.setPassword(req.body.password);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Wrap req.logIn in a promise
    await new Promise((resolve, reject) => {
      req.logIn(user, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.redirect('/');

  } catch (err) {
    console.error("Error occurred:", err);
    req.flash('error', 'An error occurred during password reset.');
    res.redirect('/reset');
  }
});


      
  

    












































  

  app.get('/base', checkAuthenticated, async (req, res) => {
    console.log("Entered base route");
    try {
      
      res.render('base', { user: req.user });
    } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  
  app.post('/dateselect', checkAuthenticated, async (req, res) => {
    try {
        // User's selected date in local time (e.g., '2023-12-15')
        const selectedDateString = req.body.date;
        
        // Append a default time (08:00 AM) to the selected date
        const selectedDateWithTime = new Date(selectedDateString + "T08:00:00");

        console.log('Selected Date with default time:', selectedDateWithTime);

        // Format the date for the query parameter
        const formattedDate = selectedDateWithTime.toISOString().split('T')[0];

        // Redirect to the detail route with the formatted date
        res.redirect(`/detail?selectedDate=${formattedDate}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
    }
});






app.get('/detail', checkAuthenticated, async (req, res) => {
    console.log("GET /detail route hit");
  try {
      // Retrieve the selectedDate from query parameters
      const selectedDate = req.query.selectedDate;
      console.log('Selected Date for detail:', selectedDate);

      // Check if selectedDate is valid
      if (!selectedDate) {
        throw new Error("Invalid or missing date.");
      }

      // Parse the selectedDate to a Date object
      const dateObj = new Date(selectedDate);

      // Query for bookings with the specified selectedDate
      const bookings = await PacuBooking.find({ selectedDate: dateObj }).sort({ booked: 1 });

      console.log(`Number of bookings found for ${selectedDate}: ${bookings.length}`);
      if (bookings.length === 0) {
          req.flash('info', 'No bookings for this date yet');
      }

      // Render the detail page with the bookings
      res.render('detail', { selectedDate: selectedDate, bookings: bookings, message: req.flash('info') });
  } catch (error) {
      console.error('Error in /detail route:', error);
      res.status(500).send('Error retrieving bookings');
  }
});

 



app.get('/editBooking', checkAuthenticated, async (req, res) => {
  console.log("GET editBooking route hit"); 

  // Retrieve selectedDate from query parameters
  const selectedDate = req.query.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }
  
  try {
      const bookingId = req.query.id;

      const booking = await PacuBooking.findById(bookingId);
      if (!booking) {
          return res.status(404).send('Booking not found');
      }

      res.render('edit', { booking: booking, selectedDate: selectedDate });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});




app.post('/confirmBooking', checkAuthenticated, async (req, res) => {
  console.log("POST confirmation route hit"); 

  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

  // Check user role and proceed only if true is returned
  if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id;
      console.log(bookingId);
      const userSurname = req.user.surname; // Assuming the surname is stored in req.user.surname
      console.log(userSurname);

      // Get the selectedDate as a Date object
      const selectedDateObj = new Date(selectedDate);

      // Get the current date
      const currentDate = new Date();

      // Check if the selectedDate is not the same as the current date
      if (selectedDateObj.getDate() !== currentDate.getDate() ||
          selectedDateObj.getMonth() !== currentDate.getMonth() ||
          selectedDateObj.getFullYear() !== currentDate.getFullYear()) {
        // Set a flash message
        req.flash('info', 'You may only confirm on the day');
        // Redirect back to the detail page
        return res.redirect(`/detail?selectedDate=${selectedDate}`);
      }

      // If the dates are the same, proceed with confirmation
      const update = {
          confirmed: 'yes',
          confirmPerson: userSurname,
          colour: 'card text-bg-warning mb-3'
      };

      await PacuBooking.findByIdAndUpdate(bookingId, update);

      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error confirming booking');
  }
});




app.post('/allocateBooking', checkAuthenticated, async (req, res) => {
  console.log("POST allocation route hit"); 

  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id;
      console.log(bookingId);
      const userSurname = req.user.surname; // Assuming the surname is stored in req.user.surname
      console.log(userSurname);

      // Get the selectedDate as a Date object
      const selectedDateObj = new Date(selectedDate);

      // Get the current date
      const currentDate = new Date();

      // Check if the selectedDate is not the same as the current date
      if (selectedDateObj.getDate() !== currentDate.getDate() ||
          selectedDateObj.getMonth() !== currentDate.getMonth() ||
          selectedDateObj.getFullYear() !== currentDate.getFullYear()) {
        req.flash('info', 'You may only allocate on the day');
        return res.redirect(`/detail?selectedDate=${selectedDate}`);
      }

      // First, retrieve the current booking to check its confirmation status
      const currentBooking = await PacuBooking.findById(bookingId);
      if (!currentBooking) {
          throw new Error('Booking not found');
      }

      // Check if the booking is already confirmed
      if (currentBooking.confirmed !== 'yes') {
          req.flash('info', 'The booking needs to be confirmed before it is allocated');
          return res.redirect(`/detail?selectedDate=${selectedDate}`);
      }

      // Proceed to update the booking since it is confirmed
      const update = {
          confirmed: 'allocated',
          allocatePerson: userSurname,
          colour: 'card text-bg-success mb-3'
      };

      await PacuBooking.findByIdAndUpdate(bookingId, update);

      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error('Error allocating booking:', error);
      req.flash('error', 'Error allocating booking');
      res.redirect(`/detail?selectedDate=${req.body.selectedDate}`);
  }
});








app.get('/moveBooking', checkAuthenticated, async (req, res) => {
  try {
      const bookingId = req.query.id;
      const selectedDate = req.query.selectedDate;

      if (!bookingId) {
          throw new Error('Booking ID not provided');
      }

      // Check user role and proceed only if true is returned
      if (!checkUserRole(req.user, req, res, selectedDate)) {
        return; // Stop executing as response has been sent
      }

      // Find the booking in the database
      const booking = await PacuBooking.findById(bookingId);

      if (!booking) {
          throw new Error('Booking not found');
      }

      // Render the movebooking.ejs page with the booking and selectedDate
      res.render('movebooking', { booking: booking, selectedDate: selectedDate });
  } catch (error) {
      console.error('Error in moveBooking:', error);
      res.status(500).send('Internal Server Error');
  }
});
















app.get('/newBooking', checkAuthenticated, (req, res) => {
  console.log('GET newBooking route hit');

  // Retrieve selectedDate from query parameters
  const selectedDate = req.query.selectedDate;
  console.log('Selected Date:', selectedDate);

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  // Proceed with the rest of the logic if user role is appropriate
  res.render('new', { selectedDate: selectedDate });
});


















app.post('/createBooking', checkAuthenticated, async (req, res) => {
  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      // Convert string to Date and check for valid date
      const selectedDateObj = new Date(selectedDate);
      console.log('Selected Date2:', selectedDate);
      if (isNaN(selectedDateObj)) {
          throw new Error('Invalid date format');
      }

      // Construct new booking data
      const newBookingData = {
          patientFirstName: req.body.patientFirstName,
          patientSurname: req.body.patientSurname,
          folderNumber: req.body.folderNumber,
          procedure: req.body.procedure,
          reasonForBooking: req.body.reasonForBooking,
          anaesthetist: req.body.anaesthetist,
          selectedDate: selectedDateObj,
          bookingPerson: req.body.bookingPerson,
          confirmPerson: req.body.confirmPerson || 'None',
          confirmed: req.body.confirmed || 'no',
          allocatePerson: req.body.allocatePerson || 'None',
          colour: req.body.colour || 'card text-bg-danger mb-3'
      };

      // Save the new booking
      const newBooking = new PacuBooking(newBookingData);
      await newBooking.save();

      // Redirect to detail page with the selected date
      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error creating new booking');
  }
});





app.post('/updateBooking', checkAuthenticated, async (req, res) => {
  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id; // Extract the booking ID
      const updatedData = {
          patientFirstName: req.body.patientFirstName,
          patientSurname: req.body.patientSurname,
          folderNumber: req.body.folderNumber,
          procedure: req.body.procedure,
          reasonForBooking: req.body.reasonForBooking,
          anaesthetist: req.body.anaesthetist,
          bookingPerson: req.body.bookingPerson,
          // booked field is not updated
          confirmed: req.body.confirmed
      };

      // Update the booking in the database
      await PacuBooking.findByIdAndUpdate(bookingId, updatedData);

      // Redirect to the /detail route with the selectedDate
      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error updating booking');
  }
});







app.post('/deleteBooking', checkAuthenticated, async (req, res) => {
  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      // Extract the booking ID from the request body
      const bookingId = req.body.id;

      if (!bookingId) {
          throw new Error('Booking ID not provided');
      }

      // Delete the booking from the database
      await PacuBooking.findByIdAndDelete(bookingId);

      // Redirect back to the detail page with the selected date
      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).send('Internal Server Error');
  }
});


app.post('/newdate', checkAuthenticated, async (req, res) => {
  // Retrieve the new date from request body
  const newDateString = req.body.selectedDate;

  // Check user role and proceed only if true is returned
  if (!checkUserRole(req.user, req, res, newDateString)) {
      return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id;

      if (!bookingId || !newDateString) {
          throw new Error('Missing booking ID or new date');
      }

      const newDate = new Date(newDateString);
      if (isNaN(newDate)) {
          throw new Error('Invalid date format');
      }

      // Define the default colour
      const defaultColour = 'card text-bg-danger mb-3';

      // Update the booking in the database
      await PacuBooking.findByIdAndUpdate(bookingId, {
          selectedDate: newDate,
          colour: defaultColour // Resetting the colour to the default
      });
      
      // Redirect back to the detail page with the new date as a query parameter
      res.redirect(`/detail?selectedDate=${newDateString}`);
  } catch (error) {
      console.error('Error updating booking date:', error);
      res.status(500).send('Internal Server Error');
  }
});



// app.post('/newdate', checkAuthenticated, async (req, res) => {
//   // Retrieve the new date from request body
//   const newDateString = req.body.newDate;

//    // Check user role and proceed only if true is returned
//    if (!checkUserRole(req.user, req, res, selectedDate)) {
//     return; // Stop executing as response has been sent
//   }

//   try {
//       const bookingId = req.body.id;

//       if (!bookingId || !newDateString) {
//           throw new Error('Missing booking ID or new date');
//       }

//       const newDate = new Date(newDateString);
//       if (isNaN(newDate)) {
//           throw new Error('Invalid date format');
//       }

//       // Define the default colour
//       const defaultColour = 'card text-bg-danger mb-3';

//       // Update the booking in the database
//       await PacuBooking.findByIdAndUpdate(bookingId, {
//           selectedDate: newDate,
//           colour: defaultColour // Resetting the colour to the default
//       });
      
//       // Redirect back to the detail page with the new date as a query parameter
//       res.redirect(`/detail?selectedDate=${newDateString}`);
//   } catch (error) {
//       console.error('Error updating booking date:', error);
//       res.status(500).send('Internal Server Error');
//   }
// });




app.post('/cancelConfirm', checkAuthenticated, async (req, res) => {
  console.log("POST cancel confirmation route hit"); 

  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

  // Check user role and proceed only if true is returned
  if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id;
      console.log('Cancelling confirmation for booking ID:', bookingId);

      // Define the update to cancel the confirmation
      const update = {
          confirmed: 'no',
          confirmPerson: 'none',
          colour: 'card text-bg-danger mb-3' // Red colour indicating cancellation
      };

      // Update the booking in the database
      await PacuBooking.findByIdAndUpdate(bookingId, update);

      // Redirect back to the detail page with the selected date
      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error('Error cancelling booking confirmation:', error);
      res.status(500).send('Error cancelling booking confirmation');
  }
});




app.post('/cancelAllocation', checkAuthenticated, async (req, res) => {
  console.log("POST cancel allocation route hit");

  // Retrieve selectedDate from request body
  const selectedDate = req.body.selectedDate;

   // Check user role and proceed only if true is returned
   if (!checkUserRole(req.user, req, res, selectedDate)) {
    return; // Stop executing as response has been sent
  }

  try {
      const bookingId = req.body.id;
      console.log('Cancelling allocation for booking ID:', bookingId);

      // First, retrieve the current booking to check its confirmation status
      const currentBooking = await PacuBooking.findById(bookingId);
      if (!currentBooking) {
          throw new Error('Booking not found');
      }

      // Check if the booking is already allocated
      if (currentBooking.confirmed !== 'allocated') {
          req.flash('info', 'The booking needs to be allocated before it can be cancelled');
          return res.redirect(`/detail?selectedDate=${selectedDate}`);
      }

      // Proceed to update the booking to cancel the allocation
      const update = {
          confirmed: 'yes', // Set back to 'yes' to indicate confirmed but not allocated
          allocatePerson: 'none', // Resetting allocatePerson to default
          colour: 'card text-bg-warning mb-3' // Yellow colour indicating warning
      };

      await PacuBooking.findByIdAndUpdate(bookingId, update);

      // Redirect back to the detail page with the selected date
      res.redirect(`/detail?selectedDate=${selectedDate}`);
  } catch (error) {
      console.error('Error cancelling booking allocation:', error);
      req.flash('error', 'Error cancelling booking allocation');
      res.redirect(`/detail?selectedDate=${req.body.selectedDate}`);
  }
});






app.get('/logo', (req, res) => {
    res.render('logo');
  });

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("listening for requests");
    })
  })