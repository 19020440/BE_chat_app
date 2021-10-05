const User = require("../models/User");
const Conversation = require('../models/Conversation');

module.exports  = new class ConversationController {
    //new Cov
    async newCov(req, res, next) {
            const newConversation = new Conversation({
              members: [req.body.senderId, req.body.receiverId],
            });
          
            try {
              const savedConversation = await newConversation.save();
              res.status(200).json(savedConversation);
            } catch (err) {
              res.status(500).json(err);
            }
    }

    //get conv of a user

    async getCovOfUser(req, res, next) {
            try {
              const conversation = await Conversation.find({
                members: { $in: [req.params.userId] },
              });
              res.status(200).json({content: conversation, status: 1});
            } catch (err) {
              res.status(500).json(err);
            }
    }

    //Find conv by 2 userId
    async findCovByTwoId(req, res,next) {
            try {
              const conversation = await Conversation.findOne({
                members: { $all: [req.params.firstUserId, req.params.secondUserId] },
              });
              if(conversation) res.status(200).json({content: conversation, status: 1});
              const newCov = new Conversation({
                members: [req.params.firstUserId, req.params.secondUserId],
              })
              try {
                const savedConversation = await newCov.save();
                res.status(200).json({content: savedConversation, status: 1});
              } catch (err) {
                res.status(500).json(err);
              }
            } catch (err) {
              res.status(500).json(err);
            }
    }
    //updateConversation
    async update(req, res) {
      const {id, lastText} = req.body;
      try {
        const updateConversation = await Conversation.findByIdAndUpdate(id, {lastText});
        !updateConversation && res.status(500).json({content: "update fail", status: 0})
        res.status(200).json({content: "update sucees !", status: 1}); 
      } catch(err) {
        res.status(500).json({content: err, status:0})
      }
    }

}