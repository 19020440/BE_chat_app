const User = require("../models/User");

module.exports  = new class AuthController {


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
                if (!user.followers.includes(req.body.userId)) {
                  await user.updateOne({ $push: { followers: req.body.userId } });
                  await currentUser.updateOne({ $push: { followings: req.params.id } });
                  res.status(200).json("user has been followed");
                } else {
                  res.status(403).json("you allready follow this user");
                }
              } catch (err) {
                res.status(500).json(err);
              }
            } else {
              res.status(403).json("you cant follow yourself");
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
                      res.status(200).json("user has been unfollowed");
                    } else {
                      res.status(403).json("you dont follow this user");
                    }
                  } catch (err) {
                    res.status(500).json(err);
                  }
                } else {
                  res.status(403).json("you cant unfollow yourself");
                }

          }
          //searchUser
          async searchUser(req, res, next) {
          
            const result =  await User.find( { 'username' : { '$regex' : req.body.word, '$options' : 'i' } } );
            res.json({content: result, status: 1})
          }
   
}