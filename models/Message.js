const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
    },
    sender: {
      type: String,
    },
    text: {
      type: String,
    },
    seens: {
      type: Array,
    },
    seen: {
      type: Boolean,
      default: false, 
    }
  },
  { timestamps: true },
  {
    writeConcern: {
      j: true,
      wtimeout: 1000
    }
  }
);

module.exports = mongoose.model("Message", MessageSchema);
