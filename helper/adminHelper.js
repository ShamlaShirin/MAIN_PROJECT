var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectID;
const { ObjectId } = require('mongodb'); // Import ObjectId for MongoDB

module.exports = {



  getFilteredRooms: async (filters, priceRange, season) => {
    console.log("priceRange:", priceRange, ":priceRange");

    try {
        return await db.get()
            .collection(collections.ROOM_COLLECTION)
            .aggregate([
                {
                    $addFields: {
                        Price: {
                            $toInt: {
                                $ifNull: [`$${season}Price`, "$normalPrice"]
                            }
                        },
                        AdvPrice: {
                            $toInt: {
                                $ifNull: [`$${season}AdvPrice`, "$normalAdvPrice"]
                            }
                        }
                    }
                },
                {
                    $match: filters
                },
                ...(priceRange
                    ? [
                        {
                            $match: {
                                Price: { $gte: priceRange.min, $lte: priceRange.max }
                            }
                        }
                    ]
                    : []
                )
            ])
            .toArray();
    } catch (error) {
        console.error("Error fetching filtered rooms:", error);
        return [];
    }
},





  getAllPayments: () => {
    return new Promise(async (resolve, reject) => {
      let payments = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(payments);
    });
  },


  getAllAssignedRooms: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let assignedrooms = await db
          .get()
          .collection(collections.ASSIGNED_ROOMS)
          .aggregate([
            {
              $lookup: {
                from: collections.ROOM_COLLECTION, // Join with ROOM_COLLECTION
                localField: "roomId",
                foreignField: "_id",
                as: "roomDetails"
              }
            },
            {
              $lookup: {
                from: collections.USERS_COLLECTION, // Join with USER_COLLECTION
                localField: "assignTo",
                foreignField: "_id",
                as: "userDetails"
              }
            },
            {
              $unwind: "$roomDetails" // Convert roomDetails array to object
            },
            {
              $unwind: "$userDetails" // Convert userDetails array to object
            },
            {
              $project: {
                _id: 1,
                assignDate: 1,
                "roomDetails.roomname": 1,
                "roomDetails.Price": 1,
                "roomDetails.roomnumber": 1,
                "userDetails.Fname": 1,
                "userDetails.Lname": 1,
                "userDetails.Email": 1,
                "userDetails.Phone": 1,
                "userDetails.Address": 1,
                "userDetails.Pincode": 1
              }
            }
          ])
          .toArray();

        resolve(assignedrooms);
      } catch (error) {
        reject(error);
      }
    });
  },

  addCategory: (category, callback) => {
    console.log(category);
    db.get()
      .collection(collections.CATEGORY_COLLECTION)
      .insertOne(category)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  getAllCategories: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(categories);
    });
  },

  ///////ADD staff/////////////////////                                         
  addnotification: (notification, callback) => {
    console.log(notification);

    // Convert userId to ObjectId if it's present
    if (notification.userId) {
      notification.userId = new objectId(notification.userId);
    }

    // Add createdAt field with the current timestamp
    notification.createdAt = new Date();

    db.get()
      .collection(collections.NOTIFICATIONS_COLLECTION)
      .insertOne(notification)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      })
      .catch((err) => {
        console.error("Error inserting notification:", err);
        callback(null);  // Handle error case by passing null
      });
  },


  ///////GET ALL Notifications/////////////////////                                            
  getAllnotifications: () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Fetch all notifications and join with users collection to get Fname
        let notifications = await db
          .get()
          .collection(collections.NOTIFICATIONS_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: collections.USERS_COLLECTION,  // Name of the users collection
                localField: "userId",  // Field in notifications collection (userId)
                foreignField: "_id",  // Field in users collection (_id)
                as: "userDetails",  // Name of the array where user data will be stored
              },
            },
            {
              $unwind: {
                path: "$userDetails",  // Flatten the userDetails array
                preserveNullAndEmptyArrays: true,  // If user not found, keep notification
              },
            },
          ])
          .toArray();

        // Map over the notifications and add user first name (Fname)
        notifications = notifications.map(notification => ({
          ...notification,
          userFname: notification.userDetails ? notification.userDetails.Fname : 'Unknown',  // Fname of user or 'Unknown' if no user found
        }));

        resolve(notifications);
      } catch (err) {
        reject(err);
      }
    });
  },

  deletenotification: (notificationId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.NOTIFICATIONS_COLLECTION)
        .removeOne({
          _id: objectId(notificationId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////ADD staff/////////////////////                                         
  addstaff: (staff, callback) => {
    // Add createdAt field with the current timestamp
    staff.createdAt = new Date();

    console.log(staff);
    db.get()
      .collection(collections.STAFF_COLLECTION)
      .insertOne(staff)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id); // For MongoDB driver < v4.0
      })
      .catch((err) => {
        console.error('Error inserting staff:', err);
      });
  },


  ///////GET ALL staff/////////////////////                                            
  getAllstaffs: () => {
    return new Promise(async (resolve, reject) => {
      let staffs = await db
        .get()
        .collection(collections.STAFF_COLLECTION)
        .find()
        .toArray();
      resolve(staffs);
    });
  },

  ///////ADD staff DETAILS/////////////////////                                            
  getstaffDetails: (staffId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.STAFF_COLLECTION)
        .findOne({
          _id: objectId(staffId)
        })
        .then((response) => {
          resolve(response);
        });
    });
  },

  ///////DELETE staff/////////////////////                                            
  deletestaff: (staffId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.STAFF_COLLECTION)
        .removeOne({
          _id: objectId(staffId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE staff/////////////////////                                            
  updatestaff: (staffId, staffDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.STAFF_COLLECTION)
        .updateOne(
          {
            _id: objectId(staffId)
          },
          {
            $set: {
              staffname: staffDetails.staffname,
              email: staffDetails.email,
              phone: staffDetails.phone,
              dept: staffDetails.dept,
              address: staffDetails.address,
              username: staffDetails.username,
              password: staffDetails.password,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL staff/////////////////////                                            
  deleteAllstaffs: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.STAFF_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },





  ///////ADD ROOOOOMS/////////////////////                                         
  addroom: (room, callback) => {
    try {
      // Convert category ID to ObjectId
      if (room.category) {
        room.category = new ObjectId(room.category);
      }

      // Ensure price is an integer
      room.Price = parseInt(room.Price);

      // Add createdAt field with the current timestamp
      room.createdAt = new Date();

      // Set default seat value
      room.seat = 1;

      console.log(room);

      db.get()
        .collection(collections.ROOM_COLLECTION)
        .insertOne(room)
        .then((data) => {
          console.log(data);
          callback(data.insertedId); // Correct for MongoDB v4+
        })
        .catch((err) => {
          console.error("Error inserting room:", err);
        });
    } catch (error) {
      console.error("Error processing room data:", error);
    }
  },


  ///////GET ALL room/////////////////////                                            
  getAllrooms: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let rooms = await db.get().collection(collections.ROOM_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: collections.CATEGORY_COLLECTION, // Collection to join
                localField: "category", // Field in ROOM_COLLECTION
                foreignField: "_id", // Field in CATEGORY_COLLECTION
                as: "categoryDetails" // Output array name
              }
            },
            {
              $unwind: {
                path: "$categoryDetails",
                preserveNullAndEmptyArrays: true // Keep rooms even if no matching category is found
              }
            },
            {
              $project: {
                _id: 1, // Room ID
                roomname: 1, // Room Name
                roomnumber: 1, // Room Price
                Price: 1, // Include description if exists
                AdvPrice: 1,

                in: 1,
                out: 1,
                ren: 1,
                desc: 1,
                fesilities: 1,
                createdAt: 1,
                seat: 1,

                images: 1, // Include images if exists
                categoryId: "$category", // Keep category ID
                categoryName: { $ifNull: ["$categoryDetails.name", "Unknown"] } // If category not found, show "Unknown"
              }
            }
          ])
          .toArray();

        resolve(rooms);
      } catch (error) {
        reject(error);
      }
    });
  },

  updateRoomPricingByCategory: (categoryId, pricingData) => {
    return new Promise(async (resolve, reject) => {
        try {
            let result = await db.get().collection(collections.ROOM_COLLECTION)
                .updateMany(
                    { category: new ObjectId(categoryId) }, // Match all rooms in the category
                    { 
                        $set: { 
                            Price: pricingData.normalPrice,
                            AdvPrice: pricingData.normalAdvPrice,
                            normalPrice: pricingData.normalPrice,
                            normalAdvPrice: pricingData.normalAdvPrice,
                            summerPrice: pricingData.summerPrice,
                            summerAdvPrice: pricingData.summerAdvPrice,
                            winterPrice: pricingData.winterPrice,
                            winterAdvPrice: pricingData.winterAdvPrice,
                            offseasonPrice: pricingData.offseasonPrice,
                            offseasonAdvPrice: pricingData.offseasonAdvPrice
                        } 
                    }
                );

            resolve(result.modifiedCount); // Return the number of rooms updated
        } catch (error) {
            reject(error);
        }
    });
},

roomsPerCategory: () => {
  return new Promise(async (resolve, reject) => {
      try {
          let rooms = await db.get().collection(collections.ROOM_COLLECTION)
              .aggregate([
                  {
                      $lookup: {
                          from: collections.CATEGORY_COLLECTION,
                          localField: "category",
                          foreignField: "_id",
                          as: "categoryDetails"
                      }
                  },
                  { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
                  {
                      $sort: { createdAt: -1 } // Optional: Sort by latest rooms first
                  },
                  {
                      $group: {
                          _id: "$category",
                          room: { $first: "$$ROOT" }, // Pick the first room for each category
                          categoryName: { $first: "$categoryDetails.name" }
                      }
                  },
                  {
                      $project: {
                          _id: "$room._id",
                          roomname: "$room.roomname",
                          roomnumber: "$room.roomnumber",
                          Price: "$room.Price",
                          AdvPrice: "$room.AdvPrice",
                          in: "$room.in",
                          out: "$room.out",
                          ren: "$room.ren",
                          desc: "$room.desc",
                          fesilities: "$room.fesilities",
                          createdAt: "$room.createdAt",
                          seat: "$room.seat",
                          images: "$room.images",
                          categoryId: "$_id",
                          categoryName: { $ifNull: ["$categoryName", "Unknown"] }
                      }
                  }
              ])
              .toArray();

          resolve(rooms);
      } catch (error) {
          reject(error);
      }
  });
},


getRoomsByCategory: (categoryId, currentSeason) => {
  return new Promise(async (resolve, reject) => {
      try {
          let rooms = await db.get().collection(collections.ROOM_COLLECTION)
              .aggregate([
                  {
                      $match: { category: new ObjectId(categoryId) } // Filter rooms by category ID
                  },
                  {
                      $lookup: {
                          from: collections.CATEGORY_COLLECTION,
                          localField: "category",
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
                      $project: {
                          _id: 1,
                          roomname: 1,
                          Price: { $ifNull: [`$${currentSeason}Price`, "$normalPrice"] }, // Use season price or fallback to normalPrice
                          AdvPrice: { $ifNull: [`$${currentSeason}AdvPrice`, "$normalAdvPrice"] }, // Use season advPrice or fallback
                          in: 1,
                          out: 1,
                          ren: 1,
                          desc: 1,
                          fesilities: 1,
                          createdAt: 1,
                          seat: 1,
                          images: 1,
                          categoryId: "$category",
                          categoryName: { $ifNull: ["$categoryDetails.name", "Unknown"] }
                      }
                  }
              ])
              .toArray();

          resolve(rooms);
      } catch (error) {
          reject(error);
      }
  });
},


  ///////ADD room DETAILS/////////////////////                                            
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

  ///////DELETE room/////////////////////                                            
  deleteroom: (roomId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .removeOne({
          _id: objectId(roomId)
        })
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  ///////UPDATE room/////////////////////                                            
  updateroom: (roomId, roomDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .updateOne(
          {
            _id: objectId(roomId)
          },
          {
            $set: {
              roomname: roomDetails.roomname,
              roomnumber: roomDetails.roomnumber,
              Price: roomDetails.Price,
              in: roomDetails.in,
              out: roomDetails.out,
              floor: roomDetails.floor,
              ren: roomDetails.ren,
              desc: roomDetails.desc,
              fesilities: roomDetails.fesilities,
              AdvPrice: roomDetails.AdvPrice,
              category: roomDetails.category,


            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  ///////DELETE ALL room/////////////////////                                            
  deleteAllrooms: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ROOM_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },

  getAllROOOMs: () => {
    return new Promise(async (resolve, reject) => {
      let rooms = await db
        .get()
        .collection(collections.ROOM_COLLECTION)
        .find()
        .toArray();
      resolve(rooms);
    });
  },



  doSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      if (adminData.Code == "admin123") {
        adminData.Password = await bcrypt.hash(adminData.Password, 10);
        db.get()
          .collection(collections.ADMIN_COLLECTION)
          .insertOne(adminData)
          .then((data) => {
            resolve(data.ops[0]);
          });
      } else {
        resolve({ status: false });
      }
    });
  },

  doSignin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let admin = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt.compare(adminData.Password, admin.Password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.admin = admin;
            response.status = true;
            resolve(response);
          } else {
            console.log("Login Failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("Login Failed");
        resolve({ status: false });
      }
    });
  },
  getDiscountDetails:(categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.DISCOUNTS_COLLECTION)
        .findOne({ _id: objectId(categoryId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
 


  getCategoryDetails: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CATEGORY_COLLECTION)
        .findOne({ _id: objectId(categoryId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

 

  
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const users = await db
          .get()
          .collection(collections.USERS_COLLECTION)
          .find()
          .sort({ createdAt: -1 })  // Sort by createdAt in descending order
          .toArray();

        resolve(users);
      } catch (err) {
        reject(err);  // Handle any error during fetching
      }
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

  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      try {
        // Convert the userId to ObjectId if it's not already
        const objectId = new ObjectId(userId);

        // Use updateOne to set isDisable to true
        db.get().collection(collections.USERS_COLLECTION).updateOne(
          { _id: objectId }, // Find user by ObjectId
          { $set: { isDisable: true } }, // Set the isDisable field to true
          (err, result) => {
            if (err) {
              reject(err); // Reject if there's an error
            } else {
              resolve(result); // Resolve if the update is successful
            }
          }
        );
      } catch (err) {
        reject(err); // Catch any error in case of an invalid ObjectId format
      }
    });
  },
  updateDiscounts:(categoryId, Details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CATEGORY_COLLECTION)
        .updateOne(
          { _id: objectId(categoryId) },
          {
            $set: {
                name:Details.name,
                subname:Details.subname,
                code:Details.code,
                percentage:parseFloat(Details.percentage),
                desc:Details.desc,
                offerVisibility:Details.offerVisibility
            }
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },


  updateCategory: (categoryId, categoryDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CATEGORY_COLLECTION)
        .updateOne(
          { _id: objectId(categoryId) },
          {
            $set: {
              name: categoryDetails.name,
              desc: categoryDetails.desc,
              fesilities: categoryDetails.fesilities,
              Description: categoryDetails.Description,
            },
          }
        )
        .then((response) => {
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

  getAllOrders: (filters) => {
    return new Promise(async (resolve, reject) => {
      try {
        let query = {};

        // Date Range Filtering (fromDate and toDate)
        if (filters.fromDate && filters.toDate) {
          const adjustedToDate = new Date(filters.toDate);
          adjustedToDate.setDate(adjustedToDate.getDate() + 1);

          query.date = {
            $gte: new Date(filters.fromDate),
            $lt: adjustedToDate
          };
        }

        // Selected Date Filtering
        // if (filters.selecteddate) {
        //   query["deliveryDetails.selecteddate"] = filters.selecteddate;
        // }

        // Total Amount Filtering
        // if (filters.totalAmount) {
        //   query.totalAmount = parseFloat(filters.totalAmount); // Ensure it's a number
        // }

        // Placed By (User ID) Filtering
        // if (filters.userId) {
        //   query["user._id"] = filters.userId;
        // }

        // Room Number Filtering
        // if (filters.roomNumber) {
        //   query["room.roomnumber"] = filters.roomNumber;
        // }

        let orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find(query)
          .toArray();

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    });
  },



  getOrdersByDateRange: (fromDate, toDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        const orders = await db.get()
          .collection(collections.ORDER_COLLECTION)
          .find({
            createdAt: {
              $gte: new Date(fromDate), // Greater than or equal to the fromDate
              $lte: new Date(toDate)    // Less than or equal to the toDate
            }
          })
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

  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const dbInstance = db.get();

        // 1️⃣ Find the order to get roomId
        const order = await dbInstance
          .collection(collections.ORDER_COLLECTION)
          .findOne({ _id: objectId(orderId) });

        if (!order) {
          return reject("Order not found");
        }

        const roomId = order.room._id; // Extract roomId

        // 2️⃣ Remove the order entry
        const deleteResponse = await dbInstance
          .collection(collections.ORDER_COLLECTION)
          .deleteOne({ _id: objectId(orderId) });

        if (deleteResponse.deletedCount === 0) {
          return reject("Failed to cancel order");
        }

        // 3️⃣ Fetch the current seat value and ensure it's a number
        const roomData = await dbInstance
          .collection(collections.ROOM_COLLECTION)
          .findOne({ _id: objectId(roomId) });

        if (!roomData || isNaN(Number(roomData.seat))) {
          return reject("Invalid seat value in database");
        }

        // 4️⃣ Convert seat to a number and increment it
        await dbInstance.collection(collections.ROOM_COLLECTION).updateOne(
          { _id: objectId(roomId) },
          { $set: { seat: Number(roomData.seat) + 1 } } // Convert & update
        );

        console.log("Order canceled and seat count updated.");
        resolve(true);
      } catch (error) {
        console.error("Error canceling order:", error);
        reject(error);
      }
    });
  },


  cancelAllOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .remove({})
        .then(() => {
          resolve();
        });
    });
  },
  getAllassigns: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let assignstaffs = await db
          .get()
          .collection(collections.ASSIGN_STAFF)
          .aggregate([
            {
              $lookup: {
                from: collections.ORDER_COLLECTION, // Join with Orders collection
                localField: 'order',
                foreignField: '_id',
                as: 'orderDetails',
              },
            },
            { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: collections.ROOM_COLLECTION, // Join with Orders collection
                localField: 'room',
                foreignField: '_id',
                as: 'roomDetails',
              },
            },
            { $unwind: { path: '$roomDetails', preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: collections.STAFF_COLLECTION, // Join with Staff collection
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
                "orderDetails.deliveryDetails.Fname": 1, // Get user's first name
                "orderDetails.deliveryDetails.Email": 1,
                "orderDetails.deliveryDetails.Phone": 1,
                "orderDetails.deliveryDetails.selecteddate": 1,
                "orderDetails.room.selecteddate": 1,
                "orderDetails.room.roomnumber": 1,
                "orderDetails.room.Price": 1,
                "orderDetails.room.AdvPrice": 1,
                "orderDetails.room.desc": 1,
                "staffDetails._id": 1,
                "staffDetails.staffname": 1,
                "staffDetails.role": 1,
                "roomDetails.roomnumber": 1,
                // "roomDetails._id": 1,
                // "roomDetails._id": 1,
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
        console.error('Error fetching assigned staff:', error);
        reject(error);
      }
    });
  },



  assignstaff: (assignstaff, callback) => {
    try {
      assignstaff.order = new ObjectId(assignstaff.order);
      assignstaff.staff = new ObjectId(assignstaff.staff);

      assignstaff.createdAt = new Date();

      console.log(assignstaff);

      db.get()
        .collection(collections.ASSIGN_STAFF)
        .insertOne(assignstaff)
        .then((data) => {
          console.log(data);
          callback(data.insertedId);
        })
        .catch((err) => {
          console.error('Error inserting staff:', err);
        });
    } catch (error) {
      console.error('Invalid ObjectId:', error);
    }
  },



  addDiscount: (discount, callback) => {
    console.log(discount);
    discount.createdAt = new Date();
    if (discount.room) {
      discount.room = discount.room;
    }


    db.get()
      .collection(collections.DISCOUNTS_COLLECTION)
      .insertOne(discount)
      .then((data) => {
        console.log(data);
        callback(data.ops[0]._id);
      });
  },

  getAllDiscounts: () => {
    return new Promise(async (resolve, reject) => {
      let discounts = await db
        .get()
        .collection(collections.DISCOUNTS_COLLECTION)
        .find()
        .toArray();
      resolve(discounts);
    });
  },
  getAllFeedbacks:()=>{
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collections.FEEDBACK_COLLECTION)
        .find()
        .sort({ 
          createdAt: -1 // Sorting in descending order
        })
        .toArray();
      resolve(result);
    });

  },

}
