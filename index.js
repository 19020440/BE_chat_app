const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const router = express.Router();
const path = require("path");
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
const server = http.createServer(app);
const User = require('./models/User');
const Messenger = require('./models/Message');
const Conversation = require("./models/Conversation");

const io  = new Server(server, {
  cors: {
      origin: 'http://localhost:3000',
      methods: ["get", "post", "delete"]
  }
})

dotenv.config();

mongoose.connect(
  'mongodb://localhost:27017/chatting',
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to MongoDB");
  }
);
app.use("/images", express.static(path.join(__dirname, "public/images")));

//middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

app.use(cors(
  {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST","DELETE","PUT"],
      credentials: true,
    }
));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, req.body.name);
  },
});

const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    return res.status(200).json({content: "File uploded successfully", status: 1});
  } catch (error) {
    console.error(error);
  }
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);


//SOCKETIO
let users = [];

// const addUser = (userId, socketId) => {
//   !users.some((user) => user.userId === userId) &&
//     users.push({ userId, socketId });
// };

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  //when ceonnect
  console.log("a user connected.", socket.id);

  socket.on("validLogin", () => {
    socket.emit("setvalidLogin", socket.id);
  })

  //join room
  socket.on("join_room", async ({socketId, conversationId,receiveId}) => {
    console.log("thíis is recevei: ", receiveId);
    try {
      const updateStatusSeen = await Messenger.updateMany(
        {$and:[{sender: receiveId},{seens:false}, {conversationId}]},
         {seens: true});
         const updateConversation = await Conversation.update(
           {$and: [{_id: conversationId}, {'lastText.sender': receiveId}]},
            {'lastText.seens': true })
    } catch(err) {
      console.log(err);
    }
   
    socket.to(socketId).emit("setJoin_room", conversationId);
  })

  //out ROOM
  socket.on("out_room", ({socketId, conversationId}) => {
    console.log("out room with socket: ", {socketId, conversationId});
    socket.to(socketId).emit("setout_room", conversationId);
  })

  //take userId and socketId from user
  socket.on("addUser", async (userId) => {
    // console.log(userId);
    try {
      const updateSocketId = await User.findByIdAndUpdate(userId, {socketId: socket.id});
    } catch(err) {
      console.log(err);
    }
    
    // addUser(userId, socket.id);
    // io.emit("getUsers", users);
  });

  //send and get message
  socket.on("sendMessage", async ({ senderId, receiverId, text,updatedAt,conversationId,seens }) => {

    try {
      const user = await User.findById(receiverId).exec();
      console.log("this is user: ",user);
      io.to(user.socketId).emit("getMessage", {
        senderId,
        text,
        updatedAt,
        conversationId,
        seens
      });
    }catch(err) {

    }
    
  });
//OOFLINE
  socket.on("userOffline", async(userId) => {
    console.log("this is offline :" ,userId);
    io.emit("setUserOffline", userId);
  })

  //ONLINE
  socket.on("online", async ({email, id}) => {
    console.log("email is: ", email);
    const removeSocketId = await User.findOneAndUpdate({email}, {socketId: id});
    
    io.emit('setOnline', "done")
  })

  //when disconnect
  socket.on("disconnect", async () => {
    console.log("a user disconnected!", socket.id);
    // removeUser(socket.id);
    // io.emit("getUsers", users);
    try { 
      const removeSocketId = await User.findOneAndUpdate({socketId: socket.id}, {socketId: "",status: false});
      console.log(removeSocketId);
      // const updateStatus = await User.findOneAndUpdate({socketId: socket.id}, {status: false});
    }catch(err) {

    }
    io.emit("setUserOffline");
  });
});


server.listen( process.env.PORT || 8800, () => {
  console.log("Backend server is running!");
});
