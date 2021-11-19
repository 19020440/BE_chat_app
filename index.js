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
  'mongodb://localhost:27017/chatting2',
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
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if(req.body.userId) {
      const result = await User.findByIdAndUpdate(req.body.userId, {profilePicture: `http://localhost:8800/images/${req.body.name}`});
    }
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

  socket.on("validLogin", () => {
    socket.emit("setvalidLogin", socket.id);
  })

  //first_join_room
  socket.on("first_join_room", data => {
    console.log(data);
    socket.join(data);
  })

  //join room
  socket.on("join_room", async ({senderId, conversationId}) => { 
    try {


            const updateStatusSeen = await Messenger.updateMany(
              {$and:[{conversationId},{'seens.id': senderId}, {'seens.seen': false}]},
              {$set: {seen: true,"seens.$.seen": true}});

            const updateConversation = await Conversation.update(
              {$and: [{_id: conversationId}, {'lastText.seens.id': senderId}]},
              
                {
                $set:  {'lastText.seens.$.seen': true },
              }
                ) 
          
    } catch(err) {
      console.log(err);
    }
    // socket.join(conversationId);
    console.log("conversation join room: ",conversationId);
    socket.to(conversationId).emit("setJoin_room", {senderId, conversationId});
  })

  //invite_join_group
  socket.on('invite_to_group', async ({name,members}) => {
      try {
        const newConversation = new Conversation({
          name: name,
          members,
          lastText: {
            sender: "",
            text: "",
            seens: members
          }
        });
        newConversation.save();

       
      } catch(err) {
        console.log(err);
      }
  })
 

  //out ROOM
  socket.on("out_room", ({senderId, conversationId}) => {
    console.log("out room with socket: ", {senderId, conversationId});
    // socket.leave(conversationId);
    socket.to(conversationId).emit("setout_room", {senderId, conversationId});
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
  socket.on("sendMessage", async (res) => {
    try {
      socket.to(res.conversationId).emit("getMessage", res);
    }catch(err) {

    }
    
  });

//OOFLINE
  socket.on("userOffline", async({userId,arrCov}) => {
    // console.log("this is offline :" ,userId);
    socket.to(arrCov).emit("setUserOffline", {userId, arrCov});
  })

  //ONLINE
  socket.on("online", async ({email, id,arrCovId}) => {
    console.log("email is: ", id);
    try {
     
      const removeSocketId = await User.findOneAndUpdate({email}, {socketId: id});
      removeSocketId && socket.to(arrCovId).emit('setOnline', {arrCovId, userOnlineId: removeSocketId._id.toString()})
     

    } catch(err) {

    }
 
  })
  //ANSWER_ONLINE
  socket.on("answerOnline", ({covId, userId}) => {
    console.log("answser online:", userId);
    socket.to(covId).emit("receive_anwerOnline", {covId, userId})
  })

  //call video
  socket.on("join room", async ({roomId,from,newRoomId,status}) => {
    socket.join(newRoomId)
    if (users[newRoomId]) {
      const length = users[newRoomId].length;
      if (length === 4) {
          socket.emit("room full");
          return;
      }
      users[newRoomId].push(socket.id);
      } else {
          users[newRoomId] = [socket.id];
      }
      console.log("user in room: ", users);
      socketToRoom[socket.id] = newRoomId;
      const usersInThisRoom = users[newRoomId].filter(id => id !== socket.id);
      socket.emit("all users", usersInThisRoom);

      
      try {
        if(status != 1) {
          const userF = await User.findById(from).exec();
          socket.to(roomId).emit("callUser", {roomId,from: userF});
        }
        
      } catch(err) {
        console.log(err);
      }

  });

  socket.on("sending signal", payload => {

    socket.to(payload.roomID).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
});



  socket.on("returning signal", payload => {
    socket.to(payload.roomID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
});




  //when disconnect
  socket.on("disconnect", async () => {
    console.log("DISCONEXT!");
    try { 
      
      const removeSocketId = await User.findOneAndUpdate({socketId: socket.id}, {socketId: "",status: false});
     const id = removeSocketId._id.toString();
     
      const conversations = await Conversation.find({
        members: { $elemMatch: {id: id} },
      });
      const arrCov = conversations.map((value) => {
        return value._id.toString();
      })
     
      socket.to(arrCov).emit("setUserOffline",{userId: id, arrCov});
    }catch(err) {
      console.log(err);
    }
    

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
