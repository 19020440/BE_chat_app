const User = require("../models/User");
const Conversation = require('../models/Conversation')
const router = require("express").Router();
const bcrypt = require("bcrypt");
const UserController = require('../controllers/UserController')
//update user
router.put("/:id", UserController.updateUser);

//delete user
router.delete("/:id", UserController.deleteUser);

//get a user
router.get("/", UserController.getUser);

//get friends
router.get("/friends/:userId", UserController.getFriends);

//follow a user

router.put("/:id/follow", UserController.followerUser);

//unfollow a user

router.put("/:id/unfollow", UserController.unFollowUser);

//search user
router.post('/search', UserController.searchUser)

module.exports = router;
