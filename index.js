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
const fs = require('fs')
const { promisify } = require('util')

const unlinkAsync = promisify(fs.unlink)
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
    return res.status(200).json({content: req.body.name , status: 1});
  } catch (error) {
    console.error(error);
  }
});

app.post("/api/upload/delete",upload.single("file"),async (req, res) => {
    await unlinkAsync(path.join(__dirname, `public/images/${req.body.path}`))
    res.json({content: "succes", status: 1})
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);


//SOCKETIO
const users = {};
const socketToRoom = {};


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
    try {
      const updateSocketId = await User.findByIdAndUpdate(userId, {socketId: socket.id});
    } catch(err) {
      console.log(err);
    }
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

  //call video
  socket.on("join room", async ({roomID,from}) => {
    
      try {
        const userF = await User.findById(from).exec();
        if (users[roomID]) {
          const length = users[roomID].length;
          if (length === 4) {
              socket.emit("room full");
              return;
          }
          users[roomID].push(socket.id);
        } else {
              users[roomID] = [socket.id];
              const memberInRoom = await Conversation.findById(roomID).exec();
              
              !memberInRoom && socket.emit('log bug', "Conversation not exist");
              const membersA = memberInRoom.members.filter(item => item!=from);
              membersA.forEach(async (item) => {
                const user = await User.findById(item).exec();
                io.to(user?.socketId).emit("callUser", {roomID,from: userF});
              })
              socket.on("callUser", (data) => {

              })
        }
       
      socketToRoom[socket.id] = roomID;
      const usersInThisRoom = users[roomID].filter(id => id !== socket.id);
  
      socket.emit("all users", usersInThisRoom);
      } catch(err) {
        console.log(err);
      }
    
  

   
    
});

socket.on("sending signal", payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
});

socket.on("returning signal", payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
});




  //when disconnect
  socket.on("disconnect", async () => {
    console.log("a user disconnected!", socket.id);
    try { 
      const removeSocketId = await User.findOneAndUpdate({socketId: socket.id}, {socketId: "",status: false});
      console.log(removeSocketId);
      // const updateStatus = await User.findOneAndUpdate({socketId: socket.id}, {status: false});
    }catch(err) {

    }
    io.emit("setUserOffline");

    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
        room = room.filter(id => id !== socket.id);
        users[roomID] = room;
    }
  });
});


server.listen(8800, () => {
  console.log("Backend server is running!");
});
