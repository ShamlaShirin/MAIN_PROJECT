var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const { ObjectId } = require("mongodb");

module.exports = {


  ///////ADD notification/////////////////////   
  getOrderDetailsById:(id)=>{
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .findOne({
          _id: objectId(id)
        })
        .then((response) => {
          resolve(response);
        });
    });


  } ,         
  getStaffOrder:async (id)=>{
    return new Promise((resolve, reject) => {
       db.get().collection(collections.ASSIGN_STAFF).find(
        { staff: ObjectId(id) }).toArray()
        .then((response) => {
          resolve(response);
        });
    });
  } ,          
  getAllFeedbacks: async (staffId) => {
    console.log(staffId)
    return  await db.get().collection(collections.FEEDBACK_COLLECTION).aggregate([
      {
          $lookup: {
              from: collections.ASSIGN_STAFF,
              localField: "orderId",
              foreignField: "order",
              as: "assignedStaff"
          }
      },
      { $unwind: "$assignedStaff" },
      {
          $match: { "assignedStaff.staff": new ObjectId(staffId) }
      },
      {
          $project: {
              _id: 1,
              orderId: 1,
              userId: 1,
              createdAt: 1,
              feedback: 1,
              rating: 1,
              room: 1,
              roomNumber: 1,
              updatedBy: 1
          }
      }
  ]).toArray();

},                
  addnotification: (notification, callback) => {
    // Convert staffId and userId to ObjectId if they are provided in the notification
    if (notification.staffId) {
      notification.staffId = objectId(notification.staffId); // Convert staffId to objectId
    }

    if (notification.userId) {
      notification.userId = objectId(notification.userId); // Convert userId to ObjectId
    }

    notification.createdAt = new Date(); // Set createdAt as the current date and time

    console.log(notification);  // Log notification to check the changes

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);  // Log the inserted data for debugging
        callback(data.ops[0]._id);  // Return the _id of the inserted notification
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null, err);  // Pass error back to callback
      });
  },

  ///////GET ALL notification/////////////////////   

  getAllnotifications: (staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch notifications by staffId and populate user details
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            // Match notifications by staffId
            {
              $match: { "staffId": objectId(staffId) }
            },
            // Lookup user details based on userId
            {
              $lookup: {
                from: collections.USERS_COLLECTION, // Assuming your users collection is named 'USERS_COLLECTION'
                localField: "userId", // Field in notifications collection
                foreignField: "_id", // Field in users collection
                as: "userDetails" // Name of the array where the user details will be stored
              }
            },
            // Unwind the userDetails array to get a single document (since $lookup returns an array)
            {
              $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true }
            }
          ])
          .toArray();

        resolve(notifications);
      } catch (error) {
        reject(error);
      }
    });
  },


  ///////ADD notification DETAILS/////////////////////                                            
  getnotificationDetails: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .findOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE notification/////////////////////                                            
  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE notification/////////////////////                                            
  updatenotification: (notificationId, notificationDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .updateOne(
          {
            _id: objectId(notificationId)
          },
          {
            $set: {
              Name: notificationDetails.Name,
              Category: notificationDetails.Category,
              Price: notificationDetails.Price,
              Description: notificationDetails.Description,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL notification/////////////////////                                            
  deleteAllnotifications: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATION_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },



  getFeedbackByStaffId: (staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const feedbacks = await db.get()
          .collection(collections.FEEDBACK_COLLECTION)
          .find({ staffId: objectId(staffId) }) // Convert staffId to ObjectId
          .toArray();
        resolve(feedbacks);
      } catch (error) {
        reject(error);
      }
    });
  },

 
  assignRoomToUser: (room, callback) => {
    console.log(room);

    // Convert roomId and assignTo to ObjectId
    const roomId = ObjectId(room.roomId);
    const assignTo = ObjectId(room.assignTo);
    const assignDate = room.assignDate; // Ensure assignDate is included

    db.get()
      .collection(collections.ASSIGNED_ROOMS)
      .insertOne({ roomId, assignTo, assignDate }) // Store assignDate in DB
      .then((data) => {
        console.log("Room assigned:", data.insertedId);

        // Fetch the current seat value and ensure it's a number
        return db.get()
          .collection(collections.ROOM_COLLECTION)
          .findOne({ _id: roomId });
      })
      .then((roomData) => {
        if (!roomData || isNaN(roomData.seat)) {
          throw new Error("Invalid seat value in database");
        }

        // Convert seat to a number and decrement it
        return db.get()
          .collection(collections.ROOM_COLLECTION)
          .updateOne(
            { _id: roomId },
            { $set: { seat: Number(roomData.seat) - 1 } } // Convert & update
          );
      })
      .then(() => {
        console.log("Seat count updated successfully.");
        callback(true);
      })
      .catch((err) => {
        console.error("Error assigning room:", err);
        callback(false);
      });
  },

  

  dosignup: (staffData) => {
    return new Promise(async (resolve, reject) => {
      try {
        staffData.Password = await bcrypt.hash(staffData.Password, 10);
        staffData.approved = false; // Set approved to false initially
        const data = await db.get().collection(collections.STAFF_COLLECTION).insertOne(staffData);
        resolve(data.ops[0]);
      } catch (error) {
        reject(error);
      }
    });
  },


  doSignin: (staffData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};

      // Find staff by email
      let staff = await db
        .get()
        .collection(collections.STAFF_COLLECTION)
        .findOne({ username: staffData.username });

      // If staff exists, check if the account is disabled
      if (staff) {
        if (staff.isDisable) {
          // If the account is disabled, return the msg from the staff collection
          response.status = false;
          response.msg = staff.msg || "Your account has been disabled.";
          return resolve(response);
        }

        // Compare passwords
        // Plain text comparison
        if (staffData.password === staff.password) {
          console.log("Login Success");
          response.staff = staff;
          response.status = true;
          resolve(response); // Successful login
        } else {
          console.log("Login Failed - Invalid Password");
          resolve({ status: false }); // Invalid password
        }
      } else {
        console.log("Login Failed");
        resolve({ status: false });  // Staff not found
      }
    });
  },
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collections.USERS_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },

  removeUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .removeOne({ _id: objectId(userId) })
        .then(() => {
          resolve();
        });
    });
  },

  removeAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USERS_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let orders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find()
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },



  changeStatus: (status, orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              "status": status,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

 
  cancelAssign: (assignId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const dbInstance = db.get();

        // 1️⃣ Find the assigned room to get roomId
        const assignedRoom = await dbInstance
          .collection(collections.ASSIGNED_ROOMS)
          .findOne({ _id: ObjectId(assignId) });

        if (!assignedRoom) {
          return reject("Assigned room not found");
        }

        const roomId = assignedRoom.roomId; // Extract roomId

        // 2️⃣ Remove the assigned room entry
        const deleteResponse = await dbInstance
          .collection(collections.ASSIGNED_ROOMS)
          .deleteOne({ _id: ObjectId(assignId) });

        if (deleteResponse.deletedCount === 0) {
          return reject("Failed to cancel room assignment");
        }

        // 3️⃣ Increment the seat count in ROOM_COLLECTION
        await dbInstance.collection(collections.ROOM_COLLECTION).updateOne(
          { _id: roomId },
          { $inc: { seat: 1 } } // Add +1 to seat count
        );

        console.log("Assignment canceled and seat count updated.");
        resolve(true);
      } catch (error) {
        console.error("Error canceling assignment:", error);
        reject(error);
      }
    });
  },



  getAllassignsById: (staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let assignstaffs = await db
          .get()
          .collection(collections.ASSIGN_STAFF)
          .aggregate([
            {
              $match: { staff: new ObjectId(staffId) } // Filter by staffId
            },
            {
              $lookup: {
                from: collections.ORDER_COLLECTION,
                localField: 'order',
                foreignField: '_id',
                as: 'orderDetails',
              },
            },
            { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.ROOM_COLLECTION,
                localField: 'room',
                foreignField: '_id',
                as: 'roomDetails',
              },
            },
            { $unwind: { path: '$roomDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.STAFF_COLLECTION,
                localField: 'staff',
                foreignField: '_id',
                as: 'staffDetails',
              },
            },
            { $unwind: { path: '$staffDetails', preserveNullAndEmptyArrays: true } },

            {
              $project: {
                _id: 1,
                order: 1,
                staff: 1,
                "orderDetails._id": 1,
                "orderDetails.paymentMethod": 1,
                "orderDetails.totalAmount": 1,
                "orderDetails.fullAmount": 1,
                "orderDetails.status": 1,
                "orderDetails.deliveryDetails.Fname": 1,
                "orderDetails.deliveryDetails.Email": 1,
                "orderDetails.deliveryDetails.Phone": 1,
                "orderDetails.deliveryDetails.selecteddate": 1,
                "orderDetails.deliveryDetails.checkin": 1,
                "orderDetails.deliveryDetails.checkout": 1,
                "orderDetails.room.selecteddate": 1,
                "orderDetails.room.roomnumber": 1,
                "orderDetails.room.Price": 1,
                "orderDetails.room.AdvPrice": 1,
                "orderDetails.room.desc": 1,
                "staffDetails._id": 1,
                "staffDetails.staffname": 1,
                "staffDetails.role": 1,
                "roomDetails.roomnumber": 1,
                createdAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$createdAt",
                    timezone: "Asia/Kolkata",
                  },
                },
              },
            },
          ])
          .toArray();

        resolve(assignstaffs);
      } catch (error) {
        console.error("Error fetching assigned staff by ID:", error);
        reject(error);
      }
    });
  },
  getAllassignsCheckinById:(staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let assignstaffs = await db
          .get()
          .collection(collections.ASSIGN_STAFF)
          .aggregate([
            {
              $match: { staff: new ObjectId(staffId), 
                checkinStatus: { $ne: "CheckIn" }
                 } // Filter by staffId
            },
            {
              $lookup: {
                from: collections.ORDER_COLLECTION,
                localField: 'order',
                foreignField: '_id',
                as: 'orderDetails',
              },
            },
            { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.ROOM_COLLECTION,
                localField: 'room',
                foreignField: '_id',
                as: 'roomDetails',
              },
            },
            { $unwind: { path: '$roomDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.STAFF_COLLECTION,
                localField: 'staff',
                foreignField: '_id',
                as: 'staffDetails',
              },
            },
            { $unwind: { path: '$staffDetails', preserveNullAndEmptyArrays: true } },

            {
              $project: {
                _id: 1,
                order: 1,
                staff: 1,
                "orderDetails._id": 1,
                "orderDetails.paymentMethod": 1,
                "orderDetails.totalAmount": 1,
                "orderDetails.fullAmount": 1,
                "orderDetails.status": 1,
                "orderDetails.deliveryDetails.Fname": 1,
                "orderDetails.deliveryDetails.Email": 1,
                "orderDetails.deliveryDetails.Phone": 1,
                "orderDetails.deliveryDetails.selecteddate": 1,
                "orderDetails.deliveryDetails.checkin": 1,
                "orderDetails.deliveryDetails.checkout": 1,
                "orderDetails.room.selecteddate": 1,
                "orderDetails.room.roomnumber": 1,
                "orderDetails.room.Price": 1,
                "orderDetails.room.AdvPrice": 1,
                "orderDetails.room.desc": 1,
                "staffDetails._id": 1,
                "staffDetails.staffname": 1,
                "staffDetails.role": 1,
                "roomDetails.roomnumber": 1,
                createdAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$createdAt",
                    timezone: "Asia/Kolkata",
                  },
                },
              },
            },
          ])
          .toArray();

        resolve(assignstaffs);
      } catch (error) {
        console.error("Error fetching assigned staff by ID:", error);
        reject(error);
      }
    });
  },
  getAllassignsCheckoutById:(staffId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let assignstaffs = await db
          .get()
          .collection(collections.ASSIGN_STAFF)
          .aggregate([
            {
              $match: { staff: new ObjectId(staffId), 
                checkoutStatus: { $ne: "CheckOut" }
                 } // Filter by staffId
            },
            {
              $lookup: {
                from: collections.ORDER_COLLECTION,
                localField: 'order',
                foreignField: '_id',
                as: 'orderDetails',
              },
            },
            { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.ROOM_COLLECTION,
                localField: 'room',
                foreignField: '_id',
                as: 'roomDetails',
              },
            },
            { $unwind: { path: '$roomDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.STAFF_COLLECTION,
                localField: 'staff',
                foreignField: '_id',
                as: 'staffDetails',
              },
            },
            { $unwind: { path: '$staffDetails', preserveNullAndEmptyArrays: true } },

            {
              $project: {
                _id: 1,
                order: 1,
                staff: 1,
                "orderDetails._id": 1,
                "orderDetails.paymentMethod": 1,
                "orderDetails.totalAmount": 1,
                "orderDetails.fullAmount": 1,
                "orderDetails.status": 1,
                "orderDetails.deliveryDetails.Fname": 1,
                "orderDetails.deliveryDetails.Email": 1,
                "orderDetails.deliveryDetails.Phone": 1,
                "orderDetails.deliveryDetails.selecteddate": 1,
                "orderDetails.deliveryDetails.checkin": 1,
                "orderDetails.deliveryDetails.checkout": 1,
                "orderDetails.room.selecteddate": 1,
                "orderDetails.room.roomnumber": 1,
                "orderDetails.room.Price": 1,
                "orderDetails.room.AdvPrice": 1,
                "orderDetails.room.desc": 1,
                "staffDetails._id": 1,
                "staffDetails.staffname": 1,
                "staffDetails.role": 1,
                "roomDetails.roomnumber": 1,
                createdAt: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S",
                    date: "$createdAt",
                    timezone: "Asia/Kolkata",
                  },
                },
              },
            },
          ])
          .toArray();

        resolve(assignstaffs);
      } catch (error) {
        console.error("Error fetching assigned staff by ID:", error);
        reject(error);
      }
    });
  },
  getAssignedCountById: async (staffId) => {
    try {
      let count = await db
        .get()
        .collection(collections.ASSIGN_STAFF)
        .countDocuments({ staff: new ObjectId(staffId) });
  
      return count; // Return only the count
    } catch (error) {
      console.error("Error fetching assigned count by staff ID:", error);
      throw error;
    }
  }


};


