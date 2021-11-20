const mongoose = require("mongoose");

const NotifySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    listNotify: {
      type: Array
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

module.exports = mongoose.model("Notify", NotifySchema);
