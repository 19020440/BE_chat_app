const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    members: {
      type: Object,
    },
    lastText: {
      text: String,
      sender: String,
      seens: [
        {
          id: String,
          profilePicture: String,
          seen: Boolean,
        }
      ]
    },
    name: {
      type: String,
      default: null,
    },
    covImage: {
      type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
