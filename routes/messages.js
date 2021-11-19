const router = require("express").Router();
const Message = require("../models/Message");
const Conversation = require('../models/Conversation')

//add

router.post("/", async (req, res) => {
  const newMessage = new Message(req.body);
  const {conversationId, ...lastText}= req.body;
  console.log();
  try {
    const savedMessage = await newMessage.save();
    const result = await Conversation.findByIdAndUpdate({_id: conversationId}, {lastText});
    res.status(200).json({content: savedMessage, status: 1});
  } catch (err) {
    res.status(500).json(err);
  }
});

//get

router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    });
    res.status(200).json({content: messages, status: 1});
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/delete", async(req, res) => {

  try {
    const mes = await Message.deleteMany();
  } catch(err) {

  }

})

module.exports = router;
