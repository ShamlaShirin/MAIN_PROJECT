var express = require("express");
var staffHelper = require("../helper/staffHelper");
var fs = require("fs");
const userHelper = require("../helper/userHelper");
const adminHelper = require("../helper/adminHelper");

var router = express.Router();
var db = require("../config/connection");
var collections = require("../config/collections");
const ObjectId = require("mongodb").ObjectID;


const verifySignedIn = (req, res, next) => {
  if (req.session.signedInStaff) {
    next();
  } else {
    res.redirect("/staff/signin");
  }
};

/* GET admins listing. */
router.get("/", verifySignedIn,async function (req, res, next) {
  let staff = req.session.staff;
  let acount= await staffHelper.getAssignedCountById(staff._id)
  res.render("staff/home", { staff: true, layout: "admin-layout", staff ,acount});
});

router.get("/view-room/:orderId", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  const orderId= req.params.orderId;
  let order = await staffHelper.getOrderDetailsById(orderId);
  console.log(";;;;;",order,orderId)
  res.render("staff/rooms/view-room", { admin: false, layout: "admin-layout", order, staff });
});

router.get("/assigned/:staffId", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  let users = await adminHelper.getAllUsers();
  const staffId = req.params.staffId;
  let assignedrooms = await staffHelper.getAllassignsById(staffId);
  res.render("staff/rooms/assigned", { admin: false, layout: "admin-layout", assignedrooms, users, staff });
});
router.get("/checkin/:staffId", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  let users = await adminHelper.getAllUsers();
  const staffId = req.params.staffId;
  let assignedrooms = await staffHelper.getAllassignsCheckinById(staffId);
  console.log(assignedrooms,"assignedroomsassignedrooms")
  res.render("staff/rooms/checkin", { admin: false, layout: "admin-layout", assignedrooms, users, staff });
});
router.get("/checkout/:staffId", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  let users = await adminHelper.getAllUsers();
  const staffId = req.params.staffId;
  let assignedrooms = await staffHelper.getAllassignsCheckoutById(staffId);

  res.render("staff/rooms/checkout", { admin: false, layout: "admin-layout", assignedrooms, users, staff });
});
router.post("/set-checkout", async (req, res) => {
  console.log("settttttttttttiiiiiii",req.body,"ttt&&&&&")
  try {
      let { orderId, scheduledTime, status } = req.body;

      if (!orderId || !scheduledTime || !status) {
          return res.status(400).json({ success: false, message: "All fields are required" });
      }

      let order = await db.get().collection(collections.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId) });

      console.log( order)

      if (!order) {
          return res.status(404).json({ success: false, message: "not found" });
      }

      await db.get().collection(collections.ORDER_COLLECTION).updateOne(
          { _id: ObjectId(orderId) },
          { $set: {"deliveryDetails.checkout": new Date(scheduledTime), "deliveryDetails.checkoutStatus": status } }
      );
      await db.get().collection(collections.ASSIGN_STAFF).updateOne(
        { order: ObjectId(orderId) },
        { $set: {"checkout": new Date(scheduledTime), "checkoutStatus": "CheckOut" } }
    );

      // Notify Government Official

      res.json({ success: true, message: "updated successfully!" });
  } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.post("/set-checkin", async (req, res) => {
  console.log("settttttttttttiiiiiii",req.body,"ttt&&&&&")
  try {
      let { orderId, scheduledTime, status } = req.body;

      if (!orderId || !scheduledTime || !status) {
          return res.status(400).json({ success: false, message: "All fields are required" });
      }

      let order = await db.get().collection(collections.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId) });

      console.log( order)

      if (!order) {
          return res.status(404).json({ success: false, message: "not found" });
      }

      await db.get().collection(collections.ORDER_COLLECTION).updateOne(
          { _id: ObjectId(orderId) },
          { $set: {"deliveryDetails.checkin": new Date(scheduledTime), "deliveryDetails.checkinStatus": status } }
      );
      await db.get().collection(collections.ASSIGN_STAFF).updateOne(
        { order: ObjectId(orderId) },
        { $set: {"checkin": new Date(scheduledTime), "checkinStatus": status } }
    );

      // Notify Government Official

      res.json({ success: true, message: "updated successfully!" });
  } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/delete-assign/:id", verifySignedIn, async function (req, res) {
  await db.get().collection(collections.ASSIGN_STAFF).deleteOne({ _id: ObjectId(req.params.id) });
  res.redirect("/staff");
});

router.get("/cancel-room/:id", verifySignedIn, function (req, res) {
  let assignId = req.params.id;
  staffHelper.cancelAssign(assignId).then(() => {
    res.redirect("/staff/assigned");
  });
});

router.get("/cancel-booking/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  adminHelper.cancelOrder(orderId).then(() => {
    res.redirect("/staff/bookings");
  });
});


router.get("/change-status/", verifySignedIn, function (req, res) {
  let status = req.query.status;
  let orderId = req.query.orderId;
  staffHelper.changeStatus(status, orderId).then(() => {
    res.redirect("/staff/all-orders");
  });
});


////////////////////PROFILE////////////////////////////////////
router.get("/profile", async function (req, res, next) {
  let staff = req.session.staff;
  res.render("staff/profile", { staff: true, layout: "layout", staff });
});

router.get("/signup", function (req, res) {
  if (req.session.signedInStaff) {
    res.redirect("/staff");
  } else {
    res.render("staff/signup", {
      staff: true, layout: "empty",
      signUpErr: req.session.signUpErr,
    });
  }
});

router.post("/signup", async function (req, res) {
  const { Companyname, Email, Phone, Address, City, Pincode, Password } = req.body;
  let errors = {};

  // Field validations
  if (!Companyname) errors.Companyname = "Please enter your company name.";
  if (!Email) errors.email = "Please enter your email.";
  if (!Phone) errors.phone = "Please enter your phone number.";
  if (!Address) errors.address = "Please enter your address.";
  if (!City) errors.city = "Please enter your city.";
  if (!Pincode) errors.pincode = "Please enter your pincode.";
  if (!Password) errors.password = "Please enter a password.";

  // Check if email or company name already exists
  const existingEmail = await db.get()
    .collection(collections.STAFF_COLLECTION)
    .findOne({ Email });
  if (existingEmail) errors.email = "This email is already registered.";

  const existingCompanyname = await db.get()
    .collection(collections.STAFF_COLLECTION)
    .findOne({ Companyname });
  if (existingCompanyname) errors.Companyname = "This company name is already registered.";

  // Validate Pincode and Phone
  if (!/^\d{6}$/.test(Pincode)) errors.pincode = "Pincode must be exactly 6 digits.";
  if (!/^\d{10}$/.test(Phone)) errors.phone = "Phone number must be exactly 10 digits.";
  const existingPhone = await db.get()
    .collection(collections.STAFF_COLLECTION)
    .findOne({ Phone });
  if (existingPhone) errors.phone = "This phone number is already registered.";

  // If there are validation errors, re-render the form
  if (Object.keys(errors).length > 0) {
    return res.render("staff/signup", {
      staff: true,
      layout: 'empty',
      errors,
      Companyname,
      Email,
      Phone,
      Address,
      City,
      Pincode,
      Password
    });
  }

  staffHelper.dosignup(req.body).then((response) => {
    if (!response) {
      req.session.signUpErr = "Invalid Admin Code";
      return res.redirect("/staff/signup");
    }

    // Extract the id properly, assuming it's part of an object (like MongoDB ObjectId)
    const id = response._id ? response._id.toString() : response.toString();

    // Ensure the images directory exists
    const imageDir = "./public/images/staff-images/";
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }

    // Handle image upload
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      let imagePath = imageDir + id + ".png";  // Use the extracted id here

      console.log("Saving image to:", imagePath);  // Log the correct image path

      image.mv(imagePath, (err) => {
        if (!err) {
          // On successful image upload, redirect to pending approval
          req.session.signedInStaff = true;
          req.session.staff = response;
          res.redirect("/staff/pending-approval");
        } else {
          console.log("Error saving image:", err);  // Log any errors
          res.status(500).send("Error uploading image");
        }
      });
    } else {
      // No image uploaded, proceed without it
      req.session.signedInStaff = true;
      req.session.staff = response;
      res.redirect("/staff/pending-approval");
    }
  }).catch((err) => {
    console.log("Error during signup:", err);
    res.status(500).send("Error during signup");
  });
}),


  router.get("/signin", function (req, res) {
    if (req.session.signedInStaff) {
      res.redirect("/staff");
    } else {
      res.render("staff/signin", {
        staff: true, layout: "empty",
        signInErr: req.session.signInErr,
      });
      req.session.signInErr = null;
    }
  });

router.post("/signin", function (req, res) {
  const { username, password } = req.body;

  // Validate Email and password
  if (!username || !password) {
    req.session.signInErr = "Please fill all fields.";
    return res.redirect("/staff/signin");
  }

  staffHelper.doSignin(req.body)
    .then((response) => {
      if (response.status === true) {
        req.session.signedInStaff = true;
        req.session.staff = response.staff;
        res.redirect("/staff");
      } else {
        req.session.signInErr = "Invalid Username/Password";
        res.redirect("/staff/signin");
      }
    })
    .catch((error) => {
      console.error(error);
      req.session.signInErr = "An error occurred. Please try again.";
      res.redirect("/staff/signin");
    });
});




router.get("/signout", function (req, res) {
  req.session.signedInStaff = false;
  req.session.staff = null;
  res.redirect("/staff");
});


router.get("/all-orders", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;

  // Ensure you have the staff's ID available
  let staffId = staff._id; // Adjust based on how staff ID is stored in session

  // Pass staffId to getAllOrders
  let orders = await staffHelper.getAllOrders(staffId);

  res.render("staff/all-orders", {
    staff: true,
    layout: "layout",
    orders,
    staff
  });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let staff = req.session.staff;
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("staff/order-products", {
      staff: true, layout: "layout",
      workspace,
      products,
    });
  }
);



router.get("/bookings", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  let { fromDate, toDate } = req.query;
  let users = await adminHelper.getAllUsers();
  let orders = await adminHelper.getAllOrders(fromDate, toDate);
  res.render("staff/rooms/bookings", { admin: false, layout: "admin-layout", orders, users, staff });
});


router.get("/all-rooms", verifySignedIn, async function (req, res) {
  let staff = req.session.staff;
  let users = await adminHelper.getAllUsers();
  let rooms = await adminHelper.getAllrooms();
  res.render("staff/rooms/all-rooms", { admin: false, layout: "admin-layout", rooms, users, staff });
});


///////ADD notification/////////////////////                                         
router.post("/assign-room", function (req, res) {
  staffHelper.assignRoomToUser(req.body, (id) => {
    res.redirect("/staff/rooms/all-rooms");
  });
});

router.get("/feedback/:id", verifySignedIn, async function (req, res) {
  
  let staff = req.session.staff;
  let staffId=staff._id;
  console.log("feeddd",staff._id)
  let assignedOrders = await db.get().collection(collections.ASSIGN_STAFF).find({
    staff: new ObjectId(staffId)
}).toArray();

let orderIds = assignedOrders.map(order => order.order.toString());

// Get feedbacks only for the assigned orders
let feedbacks = await db.get().collection(collections.FEEDBACK_COLLECTION).find({
    orderId: { $in: orderIds }
}).toArray();
  console.log("feedbacks************", feedbacks,"*****)")
  res.render("admin/feedbacks", { admin: false, layout: "admin-layout", staff, feedbacks});
});


module.exports = router;
