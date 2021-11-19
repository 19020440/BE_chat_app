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
  { timestamps: true }
);

module.exports = mongoose.model("Notify", NotifySchema);
