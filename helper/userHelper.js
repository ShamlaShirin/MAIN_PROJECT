var db = require("../config/connection");
var collections = require("../config/collections");
const bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const Razorpay = require("razorpay");
const ObjectId = require('mongodb').ObjectId; // Required to convert string to ObjectId


var instance = new Razorpay({
  key_id: "rzp_test_8NokNgt8cA3Hdv",
  key_secret: "xPzG53EXxT8PKr34qT7CTFm9",
});

module.exports = {



  updateUserOrder: (userId, updatedData) => {
    return new Promise(async (resolve, reject) => {
      try {
        let order = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .findOneAndUpdate(
            { "user._id": objectId(userId) }, // Find order by userId
            { $set: updatedData }, // Update fields with new data
            { returnDocument: "after" } // Return the updated document
          );

        if (!order.value) {
          resolve({ success: false, message: "Order not found for this user." });
        } else {
          resolve({ success: true, message: "Order updated successfully.", data: order.value });
        }
      } catch (error) {
        reject({ success: false, message: "Failed to update order.", error: error.message });
      }
    });
  },



  ///////ADD order DETAILS/////////////////////                                            
  getorderDetails: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .findOne({
          _id: objectId(orderId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },


  ///////UPDATE order/////////////////////                                            
  updateorder: (orderId, orderDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "deliveryDetails.selecteddate": orderDetails.selecteddate,
              "deliveryDetails.bedsheet": orderDetails.bedsheet,
              "deliveryDetails.beds": orderDetails.beds,
              "deliveryDetails.Note": orderDetails.Note,
            },
          }
        )
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },






  getnotificationById: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications based on userId (converted to ObjectId)
        const notifications = await db.get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .find({ userId: ObjectId(userId) }) // Filter by logged-in userId
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },


  addFeedback: (feedback) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .insertOne(feedback);
        resolve(); // Resolve the promise on success
      } catch (error) {
        reject(error); // Reject the promise on error
      }
    });
  },




  getFeedbackByRoomId: (roomId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ roomId: ObjectId(roomId) }) // Convert roomId to ObjectId
          .toArray();

        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },


  getStaffById: (staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const staff = await db.get()
          .collection(collections.STAFF_COLLECTION)
          .findOne({ _id: ObjectId(staffId) });
        resolve(staff);
      } catch (error) {
        reject(error);
      }
    });
  },








  ///////GET ALL room/////////////////////     

  getAllrooms: () => {
    return new Promise(async (resolve, reject) => {
      let rooms = await db
        .get()
        .collection(collections.ROOM_COLLECTION)
        .find()
        .toArray();
      resolve(rooms);
    });
  },

  getRoomById: (roomId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const room = await db.get()
          .collection(collections.ROOM_COLLECTION)
          .findOne({ _id: ObjectId(roomId) }); // Convert roomId to ObjectId
        resolve(room);
      } catch (error) {
        reject(error);
      }
    });
  },

  // getAllrooms: (staffId) => {
  //   return new Promise(async (resolve, reject) => {
  //     let rooms = await db
  //       .get()
  //       .collection(collections.ROOM_COLLECTION)
  //       .find({ staffId: objectId(staffId) }) // Filter by staffId
  //       .toArray();
  //     resolve(rooms);
  //   });
  // },

  /////// room DETAILS/////////////////////                                            
  getroomDetails: (roomId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .findOne({
          _id: objectId(roomId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        userData.Password = await bcrypt.hash(userData.Password, 10);

        // Set default values
        userData.isDisable = false;  // User is not disabled by default
        userData.createdAt = new Date();  // Set createdAt to the current date and time
console.log("dosi------------")
        // Insert the user into the database
        db.get()
          .collection(collections.USERS_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            // Resolve with the inserted user data
            console.log("resolved ^^^^^^^^^^^")
            resolve(data.ops[0]);
          })
          .catch((err) => {
            // Reject with any error during insertion
            reject(err);
          });
      } catch (err) {
        reject(err);  // Reject in case of any error during password hashing
      }
    });
  },

  doSignin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};

      // Find user by email
      let user = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ Email: userData.Email });

      // If user exists, check if the account is disabled
      if (user) {
        if (user.isDisable) {
          // If the account is disabled, return the msg from the user collection
          response.status = false;
          response.msg = user.msg || "Your account has been disabled.";
          return resolve(response);
        }

        // Compare passwords
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.user = user;
            response.status = true;
            resolve(response);  // Successful login
          } else {
            console.log("Login Failed");
            resolve({ status: false });  // Invalid password
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });  // User not found
      }
    });
  },

  getUserDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((user) => {
          resolve(user);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  updateUserProfile: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              Fname: userDetails.Fname,
              Lname: userDetails.Lname,
              Email: userDetails.Email,
              Phone: userDetails.Phone,
              Address: userDetails.Address,
              District: userDetails.District,
              Pincode: userDetails.Pincode,
            },
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  getRoomDetails: (roomId,currentSeason) => {
    return new Promise((resolve, reject) => {
      if (!ObjectId.isValid(roomId)) {
        reject(new Error('Invalid room ID format'));
        return;
      }

      db.get()
        .collection(collections.ROOM_COLLECTION)
        .findOne({ _id: ObjectId(roomId) })
        .then((room) => {
          if (!room) {
            reject(new Error('Room not found'));
          } else {
            // Assuming the room has a staffId field
            room.Price = room[`${currentSeason}Price`] ?? room.normalPrice;
            room.AdvPrice = room[`${currentSeason}AdvPrice`] ?? room.normalAdvPrice;
            resolve(room);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  checkRoomAvailability: async (roomId, checkin, checkout) => {
    let bookingsCollection = await db.get().collection(collections.ORDER_COLLECTION);

    // Ensure dates are in string format for comparison
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    console.log("chhh",checkinDate,checkoutDate)

    // Check if there are any bookings for the given roomId that overlap with the selected dates
    const overlappingBooking = await bookingsCollection.findOne({
        "room._id": ObjectId(roomId),  // Ensure roomId is correctly matched
        $or: [
            { 
                "deliveryDetails.checkin": { $lte: checkoutDate }, 
                "deliveryDetails.checkout": { $gte: checkinDate } 
            }, // Overlap check
            { "deliveryDetails.checkin": checkin }, // Exact same check-in date
            { "deliveryDetails.checkout": checkout } // Exact same check-out date
        ]
    });

    console.log("existingBooking:", overlappingBooking);
    return !overlappingBooking; // If overlappingBooking exists, return false (room is not available)
},




  placeOrder: (order, room, total, user) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(order, room, total);
        let status = order["payment-method"] === "COD" ? "placed" : "pending";

        // Get the room document to check the current seat value
        const roomDoc = await db.get()
          .collection(collections.ROOM_COLLECTION)
          .findOne({ _id: objectId(room._id) });

        // Check if the room exists and the seat field is present
        if (!roomDoc || !roomDoc.seat) {
          return reject(new Error("Room not found or seat field is missing."));
        }

        // Convert seat from string to number and check availability
        let seatCount = Number(roomDoc.seat);
        if (isNaN(seatCount) || seatCount <= 0) {
          return reject(new Error("Seat is not available."));
        }

        // Handle Advance Payment
        let paymentAmount = order["payment-method"] === "ADVANCE" ? room.AdvPrice : total;

        // Create the order object
        let orderObject = {
          deliveryDetails: {
            Fname: order.Fname,
            Lname: order.Lname,
            Email: order.Email,
            Phone: order.Phone,
            Address: order.Address,
            District: order.District,
            State: order.State,
            Pincode: order.Pincode,
            checkin: new Date(order.checkin),  // Convert string to Date object
            checkout: new Date(order.checkout),
            bedsheet: order.bedsheet,
            beds: order.beds,
            Note: order.Note,
          },
          userId: objectId(order.userId),
          user: user,
          paymentMethod: order["payment-method"],
          room: room,
          totalAmount: paymentAmount,  // Stores either Full or Advance Amount
          fullAmount: total, // Stores full price for later reference
          status: status,
          date: new Date(),
          staffId: room.staffId, // Store the staff's ID
        };

        // Insert the order into the database
        const response = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .insertOne(orderObject);

        // Decrement the seat count
        seatCount -= 1; // Decrement the seat count

        // Update the room collection with selecteddate (not as an array)
        await db.get()
          .collection(collections.ROOM_COLLECTION)
          .updateOne(
            { _id: objectId(room._id) },
            {
              $set: {
                seat: seatCount.toString(),  // Convert number back to string
                bookedDate: order.selecteddate // Store the selected date as a single value
              }
            }
          );

        resolve(response.insertedId); // Return order ID properly
      } catch (error) {
        console.error("Error placing order:", error);
        reject(error);
      }
    });
  },



  getUserOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { userId: ObjectId(userId) }
            },
            {
              $lookup: {
                from: collections.CATEGORY_COLLECTION, // Replace with actual category collection name
                localField: "room.category",
                foreignField: "_id",
                as: "categoryDetails"
              }
            },
            {
              $unwind: {
                path: "$categoryDetails",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                "room.categoryName": "$categoryDetails.name"
              }
            },
            {
              $project: {
                categoryDetails: 0
              }
            }
          ])
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },
  getOrderRooms: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let rooms = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate([
            {
              $match: { _id: objectId(orderId) }, // Match the order by its ID
            },
            {
              $project: {
                // Include room, user, and other relevant fields
                room: 1,
                user: 1,
                paymentMethod: 1,
                totalAmount: 1,
                status: 1,
                date: 1,
                deliveryDetails: 1, // Add deliveryDetails to the projection

              },
            },
          ])
          .toArray();

        resolve(rooms[0]); // Fetch the first (and likely only) order matching this ID
      } catch (error) {
        reject(error);
      }
    });
  },

  generateRazorpay: (orderId, amount) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          reject(err);
        } else {
          console.log("New Razorpay Order: ", order);
          resolve(order);
        }
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "xPzG53EXxT8PKr34qT7CTFm9");

      hmac.update(
        details["payment[razorpay_order_id]"] +
        "|" +
        details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");

      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: "placed",  // Fixed: Correctly updates status
            },
          }
        )
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },


  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch the order details before deletion
        const order = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .findOne({ _id: objectId(orderId) });

        if (!order) {
          return reject(new Error("Order not found."));
        }

        const roomId = order.room._id; // Get the room ID

        // Get the room details
        const room = await db.get()
          .collection(collections.ROOM_COLLECTION)
          .findOne({ _id: objectId(roomId) });

        if (!room) {
          return reject(new Error("Room not found."));
        }

        // Convert seat from string to number and increment it
        let seatCount = Number(room.seat);
        if (isNaN(seatCount)) seatCount = 0;

        seatCount += 1; // Increment seat count

        // Update the seat count in ROOM_COLLECTION
        await db.get()
          .collection(collections.ROOM_COLLECTION)
          .updateOne(
            { _id: objectId(roomId) },
            { $set: { seat: seatCount.toString() } } // Convert back to string
          );

        // Delete the order after updating the seat count
        await db.get()
          .collection(collections.ORDER_COLLECTION)
          .deleteOne({ _id: objectId(orderId) });

        resolve();
      } catch (error) {
        console.error("Error canceling order:", error);
        reject(error);
      }
    });
  },

};
