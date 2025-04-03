var express = require("express");
var userHelper = require("../helper/userHelper");
var adminHelper = require("../helper/adminHelper");

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;

const userMessage = [
   ["hi", "hey", "hello"],
    ["sure", "yes", "no"],
    ["room availability", "is there any room available", "can I book a room"],
    ["rooms" ,"room types", "what kind of rooms do you have"],
    ["offers", "do you have any discounts", "any special deals"],
    ["contact", "how can I reach you"],
];

const botReply = [
   ["Hello!", "Hi!", "Hey!", "Hi there!"],
    ["Okay"],
    ["Please provide check-in date, check-out date, and number of guests."],
    ["We have Single, Double, and Suite rooms. Check here: http://localhost:4001/filter-rooms"],
    ["Check out our latest offers here: http://localhost:4001/offers"],
    ["You can contact us at /contact"],
];

const fallbackReply = "I did not get that, please contact support.";

const verifySignedIn = (req, res, next) => {
  if (req.session.signedIn) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  let categories = await adminHelper.getAllCategories();
  adminHelper.getAllrooms().then((rooms) => {
    res.render("users/home", { admin: false, rooms, categories, user });
  });
});
router.post("/chatbot", async (req, res) => {
  console.log(req.body,"chat::",req.body.message)
  const userInput = req.body.message.toLowerCase();
  
  let reply = fallbackReply;
  for (let i = 0; i < userMessage.length; i++) {
      if (userMessage[i].some(msg => userInput.includes(msg))) {
          reply = botReply[i][0];
          break;
      }
  }
  
  if (userInput.includes("room availability")) {
      const { checkin, checkout, guests } = req.query;
      if (!checkin || !checkout || !guests) {
          return res.json({ reply: "Please provide check-in date, check-out date, and number of guests." });
      }
      try {
          const response = await axios.get(`https://api.example.com/rooms?checkin=${checkin}&checkout=${checkout}&guests=${guests}`);
          reply = response.data.length ? `Available rooms: ${response.data.map(r => r.name).join(", ")}` : "No rooms available.";
      } catch (error) {
          reply = "Error fetching availability. Please try again later.";
      }
  }
  console.log("reppp ",reply)
  res.json({ reply });
});

router.get("/check-availability", async (req, res) => {
  try {
    console.log("!!!!!!!!!---checkkkkkkkkkkkkkk")
    const { roomId, checkin, checkout } = req.query;
      console.log("!!!!!!!!!checkkkkkkkkkkkkkkk",roomId, checkin, checkout)

      if (!roomId || !checkin) {
          return res.status(400).json({ error: "Missing roomId or selecteddate" });
      }

      const isAvailable = await userHelper.checkRoomAvailability(roomId, checkin, checkout);

      if (isAvailable) {
          return res.json({ available: true, message: "available" });
      } else {
          return res.json({ available: false, message: "Room is not available" });
      }
  } catch (error) {
      console.error("Error checking room availability:", error);
      res.status(500).json({ error: "Internal server error" });
  } 
});



router.get("/all-rooms", async function (req, res, next) {
  let user = req.session.user;
  let categories = await adminHelper.getAllCategories();
  adminHelper.getAllrooms().then((rooms) => {
    res.render("users/all-rooms", { admin: false, categories, rooms, user });
  });
});


router.get("/offers", async function (req, res, next) {
  let user = req.session.user;
  let offers = await adminHelper.getAllDiscounts();
  adminHelper.getAllrooms().then((rooms) => {
    res.render("users/offers", { admin: false, offers, rooms, user });
  });
});


router.get("/rooms/:id", async (req, res) => {
  let user = req.session.user;
  try {
    let categoryId = req.params.id; // Get category ID from URL
    const settings = await db.get().collection(collections.SETTINGS_COLLECTION).findOne({});
    const currentSeason = settings?.currentSeason || "normal"; // Default to "normal" if not set

    let rooms = await adminHelper.getRoomsByCategory(categoryId,currentSeason); // Fetch rooms

    res.render("users/rooms", { admin: false, rooms, user }); // Render the rooms page
  } catch (error) {
    console.error("Error fetching rooms by category:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/notifications", verifySignedIn, function (req, res) {
  let user = req.session.user;  // Get logged-in user from session

  // Use the user._id to fetch notifications for the logged-in user
  userHelper.getnotificationById(user._id).then((notifications) => {
    res.render("users/notifications", { admin: false, notifications, user });
  }).catch((err) => {
    console.error("Error fetching notifications:", err);
    res.status(500).send("Error fetching notifications");
  });
});

router.get("/about", async function (req, res) {
  let user = req.session.user;
  res.render("users/about", { admin: false, user });
})


router.get("/contact", async function (req, res) {
  let user = req.session.user;

  res.render("users/contact", { admin: false, user });
})

router.get("/service", async function (req, res) {
  let user = req.session.user;

  res.render("users/service", { admin: false, user });
})


router.post("/add-feedback", async function (req, res) {
  let user = req.session.user; // Ensure the user is logged in and the session is set
  let feedbackText = req.body.text; // Get feedback text from form input
  let username = req.body.username; // Get username from form input
  let roomId = req.body.roomId; // Get room ID from form input
  let staffId = req.body.staffId; // Get staff ID from form input

  if (!user) {
    return res.status(403).send("User not logged in");
  }

  try {
    const feedback = {
      userId: ObjectId(user._id), // Convert user ID to ObjectId
      roomId: ObjectId(roomId), // Convert room ID to ObjectId
      staffId: ObjectId(staffId), // Convert staff ID to ObjectId
      text: feedbackText,
      username: username,
      createdAt: new Date() // Store the timestamp
    };

    await userHelper.addFeedback(feedback);
    res.redirect("/single-room/" + roomId); // Redirect back to the room page
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).send("Server Error");
  }
});



router.get("/single-room/:id", async function (req, res) {
  let user = req.session.user;
  const roomId = req.params.id;

  try {
    const room = await userHelper.getRoomById(roomId);

    if (!room) {
      return res.status(404).send("Room not found");
    }
    const feedbacks = await userHelper.getFeedbackByRoomId(roomId); // Fetch feedbacks for the specific room

    res.render("users/single-room", {
      admin: false,
      user,
      room,
      feedbacks
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/single-room/:id/:code", async function (req, res) {
  let user = req.session.user;
  const roomId = req.params.id;
  const code= req.params.code;

  try {
    const room = await userHelper.getRoomById(roomId);

    if (!room) {
      return res.status(404).send("Room not found");
    }
    const feedbacks = await userHelper.getFeedbackByRoomId(roomId); // Fetch feedbacks for the specific room

    res.render("users/single-room", {
      admin: false,
      user,
      room,
      feedbacks
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).send("Server Error");
  }
});




////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let user = req.session.user;
  res.render("users/profile", { admin: false, user });
});

////////////////////USER TYPE////////////////////////////////////
router.get("/usertype", async function (req, res, next) {
  res.render("users/usertype", { admin: false, layout: 'empty' });
});





router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signup", { admin: false, layout: 'empty' });
  }
});

router.post("/signup", async function (req, res) {
  const { Fname, Email, Phone, Address, Pincode, District, Password } = req.body;
  let errors = {}; 
  console.log(req.body,"posttttt-sign")
  // Check if email already exists
  const existingEmail = await db.get()
    .collection(collections.USERS_COLLECTION)
    .findOne({ Email });
    console.log(existingEmail,"*****-sign")

  if (existingEmail) {
    errors.email = "This email is already registered.";
  }

  // Validate phone number length and uniqueness

  if (!Phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!/^\d{10}$/.test(Phone)) {
    errors.phone = "Phone number must be exactly 10 digits.";
  } else {
    const existingPhone = await db.get()
      .collection(collections.USERS_COLLECTION)
      .findOne({ Phone });

    if (existingPhone) {
      errors.phone = "This phone number is already registered.";
    }
  }
  // Validate Pincode
  if (!Pincode) {
    errors.pincode = "Please enter your pincode.";
  } else if (!/^\d{6}$/.test(Pincode)) {
    errors.pincode = "Pincode must be exactly 6 digits.";
  }

  if (!Fname) errors.fname = "Please enter your first name.";
  if (!Email) errors.email = "Please enter your email.";
  if (!Address) errors.address = "Please enter your address.";
  if (!District) errors.district = "Please enter your city.";

  // Password validation
  if (!Password) {
    errors.password = "Please enter a password.";
  } else {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    if (!strongPasswordRegex.test(Password)) {
      errors.password = "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
    }
  }
  console.log(errors,"errrrrrrrr")

  if (Object.keys(errors).length > 0) {
    return res.render("users/signup", {
      admin: false,
      layout: 'empty',
      errors,
      Fname,
      Email,
      Phone,
      Address,
      Pincode,
      District,
      Password
    });
  }

  // Proceed with signup
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/");
  }).catch((err) => {
    console.error("Signup error:", err);
    res.status(500).send("An error occurred during signup.");
  });
});


router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});


router.post("/signin", function (req, res) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    req.session.signInErr = "Please fill in all fields.";
    return res.render("users/signin", {
      admin: false,
      layout: 'empty',
      signInErr: req.session.signInErr,
      email: Email,
      password: Password,
    });
  }

  userHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      // If the user is disabled, display the message
      req.session.signInErr = response.msg || "Invalid Email/Password";
      res.render("users/signin", {
        admin: false,
        layout: 'empty',
        signInErr: req.session.signInErr,
        email: Email
      });
    }
  });
});




router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/edit-profile/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let userProfile = await userHelper.getUserDetails(userId);
  res.render("users/edit-profile", { admin: false, userProfile, user });
});

router.post("/edit-profile/:id", verifySignedIn, async function (req, res) {
  try {
    const { Fname, Lname, Email, Phone, Address, District, Pincode } = req.body;
    let errors = {};

    // Validate first name
    if (!Fname || Fname.trim().length === 0) {
      errors.fname = 'Please enter your first name.';
    }

    if (!District || District.trim().length === 0) {
      errors.district = 'Please enter your first name.';
    }

    // Validate last name
    if (!Lname || Lname.trim().length === 0) {
      errors.lname = 'Please enter your last name.';
    }

    // Validate email format
    if (!Email || !/^\S+@\S+\.\S+$/.test(Email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate phone number
    if (!Phone) {
      errors.phone = "Please enter your phone number.";
    } else if (!/^\d{10}$/.test(Phone)) {
      errors.phone = "Phone number must be exactly 10 digits.";
    }


    // Validate pincode
    if (!Pincode) {
      errors.pincode = "Please enter your pincode.";
    } else if (!/^\d{6}$/.test(Pincode)) {
      errors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!Fname) errors.fname = "Please enter your first name.";
    if (!Lname) errors.lname = "Please enter your last name.";
    if (!Email) errors.email = "Please enter your email.";
    if (!Address) errors.address = "Please enter your address.";
    if (!District) errors.district = "Please enter your district.";

    // Validate other fields as needed...

    // If there are validation errors, re-render the form with error messages
    if (Object.keys(errors).length > 0) {
      let userProfile = await userHelper.getUserDetails(req.params.id);
      return res.render("users/edit-profile", {
        admin: false,
        userProfile,
        user: req.session.user,
        errors,
        Fname,
        Lname,
        Email,
        Phone,
        Address,
        District,
        Pincode,
      });
    }

    // Update the user profile
    await userHelper.updateUserProfile(req.params.id, req.body);

    // Fetch the updated user profile and update the session
    let updatedUserProfile = await userHelper.getUserDetails(req.params.id);
    req.session.user = updatedUserProfile;

    // Redirect to the profile page
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).send("An error occurred while updating the profile.");
  }
});





router.get('/place-order/:id', verifySignedIn, async (req, res) => {
  const roomId = req.params.id;
  const settings = await db.get().collection(collections.SETTINGS_COLLECTION).findOne({});
  const currentSeason = settings?.currentSeason || "normal";

  // Validate the room ID
  if (!ObjectId.isValid(roomId)) {
    return res.status(400).send('Invalid room ID format');
  }

  let user = req.session.user;

  // Fetch the product details by ID
  let room = await userHelper.getRoomDetails(roomId,currentSeason);

  // If no room is found, handle the error
  if (!room) {
    return res.status(404).send('Room not found');
  }

  // Render the place-order page with room details
  res.render('users/place-order', { user, room });
});

router.post('/place-order', async (req, res) => {
  let user = req.session.user;
  let roomId = req.body.roomId;
  const settings = await db.get().collection(collections.SETTINGS_COLLECTION).findOne({});
  const currentSeason = settings?.currentSeason || "normal"; 

  // Fetch room details
  let room = await userHelper.getRoomDetails(roomId,currentSeason);
  if (!room) {
    return res.status(404).send("Room not found");
  }

  let totalPrice = room.Price; // Default: Full price
  let advanceAmount = room.AdvPrice; // Advance payment amount
  let selectedPaymentMethod = req.body["payment-method"];

  // Determine the amount to charge based on the payment method
  let paymentAmount = selectedPaymentMethod === "ADVANCE" ? advanceAmount : totalPrice;

  // Call placeOrder function
  userHelper.placeOrder(req.body, room, paymentAmount, user)
    .then((orderId) => {
      if (selectedPaymentMethod === "COD") {
        res.json({ codSuccess: true });
      } else {
        // Pass the correct amount to Razorpay (Advance or Full)
        userHelper.generateRazorpay(orderId, paymentAmount).then((response) => {
          res.json(response);
        });
      }
    })
    .catch((err) => {
      console.error("Error placing order:", err);
      res.status(500).send("Internal Server Error");
    });
});




router.post("/verify-payment", async (req, res) => {
  console.log(req.body);

  userHelper
    .verifyPayment(req.body)
    .then(() => {
      // Ensure the correct order ID is updated
      userHelper.changePaymentStatus(req.body["order[receipt]"], req.body.amountPaid).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});


router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  // le = await userHelper.g(userId);
  res.render("users/order-placed", { admin: false, user });
});

router.post("/check-discount-code", async (req, res) => {
  try {
      const { code,room } = req.body;
      console.log("disssssssssss",code)

      const discount = await db.get()
          .collection(collections.DISCOUNTS_COLLECTION)
          .findOne({ code: code,room:ObjectId(room) });

      if (!discount) {
          return res.json({ success: false, message: "Invalid or expired discount code" });
      }

      return res.json({ success: true, percentage: discount.percentage });
  } catch (error) {
      console.error("Error checking discount code:", error);
      res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  // Fetch user orders
  let orders = await userHelper.getUserOrder(userId);
  res.render("users/orders", { admin: false, user, orders });
});

router.get("/view-ordered-rooms/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let orderId = req.params.id;

  // Log the orderId to see if it's correctly retrieved
  console.log("Retrieved Order ID:", orderId);

  // Check if orderId is valid
  if (!ObjectId.isValid(orderId)) {
    console.error('Invalid Order ID format:', orderId);  // Log the invalid ID
    return res.status(400).send('Invalid Order ID');
  }

  try {
    let rooms = await userHelper.getOrderRooms(orderId);
    res.render("users/order-rooms", {
      admin: false,
      user,
      rooms,
    });
  } catch (err) {
    console.error('Error fetching ordered rooms:', err);
    res.status(500).send('Internal Server Error');
  }
});



router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});


router.get("/updateorder/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let orderId = req.params.id;
  let order = await userHelper.getorderDetails(orderId);
  res.render("users/updateorder", { admin: false, order, user });
});

router.post("/updateorder/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;

  // Update order details
  userHelper.updateorder(orderId, req.body).then(() => {
    res.redirect("/orders");
  }).catch((err) => {
    console.error("Error updating order:", err);
    res.status(500).send("Failed to update order.");
  });
});



router.get("/filter-rooms", async (req, res) => {
  let user = req.session.user;
  const settings = await db.get().collection(collections.SETTINGS_COLLECTION).findOne({});
  const currentSeason = settings?.currentSeason || "normal"; 

  console.log(req.query,"--req.query,body---", req.body); // Debugging

  try {
    let { priceRange, category, roomname } = req.query;
    let filters = {};

    // ✅ Handle price range filter (convert Price to number)
    if (priceRange) {
      let [minPrice, maxPrice] = priceRange.split("-").map(Number);
      filters.Price = { $gte: minPrice, $lte: maxPrice };
    }

    // ✅ Handle category filter
    if (category) filters.category = new ObjectId(category);

    // ✅ Handle room name search
    if (roomname) filters.roomname = { $regex: new RegExp(roomname, "i") };

    console.log("Filters applied:", filters); // Debugging

    // Fetch rooms and categories
    let categories = await adminHelper.getAllCategories();
    let rooms = await adminHelper.getFilteredRooms(filters,priceRange,currentSeason);

    res.render("users/filter-rooms", {
      admin: false,
      layout: "layout",
      rooms,
      categories,
      user,
    });
  } catch (error) {
    console.error("Error filtering rooms:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/feedback/:id", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  let id = req.params.id;
  res.render("users/feedback", { admin: false, user,id, });
});

router.post("/feedback", verifySignedIn, async (req, res) => {
  try {
    const { Id, rating, username, feedback } = req.body;
    const finalRating = rating ? parseInt(rating) : 0;
 
    const userId = req.session.user._id;
    const cmp= await userHelper.getorderDetails(Id);
    const room= cmp.room.name;
    const roomNumber=cmp.room.roomnumber;
    
    await db.get().collection(collections.FEEDBACK_COLLECTION)
      .updateOne(
        { orderId:Id, userId }, // filter: find a feedback for this complaint by this user
        { $set: {
          orderId:Id,
           userId,
            rating: finalRating,
            feedback,   
            room,
            roomNumber,
            updatedBy:username,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    
    res.redirect("/orders")
  } catch (error) {
    console.error("Error rating complaint", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


module.exports = router;
