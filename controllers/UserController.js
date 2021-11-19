const {getLessProfile} = require('../helper/funtion')
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Conversation = require('../models/Conversation')
module.exports  = new class UserController {


    //update User
   async updateUser(req, res, next) {

            if (req.body.userId === req.params.id || req.body.isAdmin) {
              if (req.body.password) {
                try {
                  const salt = await bcrypt.genSalt(10);
                  req.body.password = await bcrypt.hash(req.body.password, salt);
                } catch (err) {
                  return res.status(500).json(err);
                }
              }
              try {
                const user = await User.findByIdAndUpdate(req.params.id, {
                  $set: req.body,
                });
                res.status(200).json("Account has been updated");
              } catch (err) {
                return res.status(500).json(err);
              }
            } else {
              return res.status(403).json("You can update only your account!");
            }
    }
    
    // DELETE USER
    async deleteUser(req, res, next) {

            if (req.body.userId === req.params.id || req.body.isAdmin) {
              try {
                await User.findByIdAndDelete(req.params.id);
                res.status(200).json("Account has been deleted");
              } catch (err) {
                return res.status(500).json(err);
              }
            } else {
              return res.status(403).json("You can delete only your account!");
            }

    }

    //GET USER
    async getUser(req, res,next) {

            // const userId = req.query.userId;
            // const username = req.query.username;
            // try {
            //   const user = userId
            //     ? await User.findById(userId)
            //     : await User.findOne({ username: username });
            //   const { password, updatedAt, ...other } = user._doc;
            //   res.status(200).json(other);
            // } catch (err) {
            //   res.status(500).json(err);
            // }
            try{
              const result = await User.findById(req.query.userId).exec();
              !result && res.status(200).json({status: 0, content: "We can not find this user !"});
              const {password, updatedAt,...response} = result._doc;
              res.status(200).json({status: 1, content: response});
            } catch(err) {
              res.status(500).json({content: err, status: 0});
            }
    }
    //GET FRIEND
    async getFriends(req, res, next) {
            try {
              const user = await User.findById(req.params.userId);
              const friends = await Promise.all(
                user.followings.map((friendId) => {
                  return User.findById(friendId);
                })
              );
              let friendList = [];
              friends.map((friend) => {
                const { _id, username, profilePicture } = friend;
                friendList.push({ _id, username, profilePicture });
              });
              res.status(200).json({content: friendList, status: 1})
            } catch (err) {
              res.status(500).json(err);
            }
    }

    //follow user 
    async followerUser(req, res, next) {

            if (req.body.userId !== req.params.id) {
              try {
                const user = await User.findById(req.params.id);
                const currentUser = await User.findById(req.body.userId);
                const member1 = {
                  id: req.body.userId,
                  profilePicture: currentUser.profilePicture,
                  username: currentUser.username,
                }

                const member2 = {
                  id: req.params.id,
                  profilePicture: user.profilePicture,
                  username: user.username,
                }

                const lastText1 = {
                  id:req.body.userId,
                  profilePicture: currentUser.profilePicture,
                  seen: false,
                }

                const lastText2 = {
                  id: req.params.id,
                  profilePicture: user.profilePicture,
                  seen: false,
                }


                const newConversation = new Conversation({
                  members: [member1, member2],
                  lastText: {
                    sender: "",
                    text: "",
                    seens: [lastText1,lastText2]
                  }
                });

                if (!user.followers.includes(req.body.userId)) {
                 
                  // await user.updateOne({ $push: { followings: req.body.userId } });
                  Promise.all([await newConversation.save(), await user.updateOne({ $push: { followings: req.body.userId } }),  await currentUser.updateOne({ $push: { followings: req.params.id } })])
                  res.status(200).json({content: "user has been followed", status: 1});
                } else {
                  res.status(403).json({content: "you allready follow this user", status: 0});
                }
              } catch (err) {
                res.status(500).json({content: err, status: 0});
              }
            } else {
              res.status(403).json({content: "you cant follow yourself", status: 0});
            }
          }
//unfollow a user

          async unFollowUser(req, res, next){
                if (req.body.userId !== req.params.id) {
                  try {
                    const user = await User.findById(req.params.id);
                    const currentUser = await User.findById(req.body.userId);
                    if (user.followers.includes(req.body.userId)) {
                      await user.updateOne({ $pull: { followers: req.body.userId } });
                      await currentUser.updateOne({ $pull: { followings: req.params.id } });
                      res.status(200).json({status: 1,content: "user has been unfollowed"});
                    } else {
                      res.status(403).json({content: "you dont follow this user", status: 0});
                    }
                  } catch (err) {
                    res.status(500).json({content: err,status: 0});
                  }
                } else {
                  res.status(403).json({content: "you cant unfollow yourself", status: 0});
                }

          }
          //searchUser
          async searchUser(req, res, next) {
            try {
              const result =  await User.find( { 'username' : { '$regex' : req.body.word, '$options' : 'i' } } );
              const rs = getLessProfile(result)
              res.json({content: rs, status: 1})
            } catch(err) {
              res.json({content: err, status: 0});
            }T
            
          }

          //get List invite
          async getListInvite(req, res, next) {
            const {userId} = req.body;
            try {
              const [allUser, user] = await Promise.all([ User.find(),  User.findById(userId).exec()])
              const result = allUser.filter(value => user.followings.includes(value._id.toString()) == 0 && userId != value._id.toString() );
              res.status(200).json({content: result, status: 1})
            } catch(err) {
              res.json(err)
            }
          }
            //Update Profile
            async update_profile(req, res, next) {
              const {userId, data} = req.body;
              try {
                const user = await User.findById(userId).exec();
                
                const validPassword = await bcrypt.compare(data.password, user.password);
                !validPassword && res.status(200).json({content: "Mật khẩu sai !",status:0});
                // res.status(200).json({content: user.password,status: 1})
                const salt = await bcrypt.genSalt(10);
               const hashedPassword = await bcrypt.hash(data.newpassword, salt);
                const newPass = await User.findOneAndUpdate(userId, {password: hashedPassword});
                if(data.username) User.findOneAndUpdate(userId, {username: data.username});
                newPass && res.status(200).json({content: "Cập nhật thông tin thành công", status: 1})
              } catch(err) {

                res.status(500).json({content: err, status: 0})

              }
            }
}