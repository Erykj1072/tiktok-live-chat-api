const express = require("express");
const socketIo = require("socket.io");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const feed = [];

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("client connected: ", socket.id);

  socket.join("tiktok-live");

  socket.on("disconnect", (reason) => {
    console.log(reason);
  });
});

setInterval(() => {
  io.to("tiktok-live").emit("feed", feed);
}, 1000);

app.post("/connect", (req, res) => {
  const { WebcastPushConnection } = require("tiktok-live-connector");

  let tiktokUsername = req.body.user;
  let tiktokLiveConnection = new WebcastPushConnection(tiktokUsername, {
    enableExtendedGiftInfo: true,
  });

  try {
    tiktokLiveConnection
      .connect()
      .then((state) => {
        console.info(`Connected to roomId ${state.roomId}`);
      })
      .catch((err) => {
        console.error("Failed to connect", err);
      });

    tiktokLiveConnection.on("chat", (data) => {
      console.log(`${data.uniqueId} writes: ${data.comment}`);
      feed.push({
        gift: false,
        uniqueId: data.uniqueId,
        comment: data.comment,
        time_stamp: data.timestamp,
      });
    });

    tiktokLiveConnection.on("gift", (data) => {
      if (data.giftType === 1 && !data.repeatEnd) {
        console.log(
          `${data.uniqueId} is sending gift ${data.giftName} x${data.repeatCount}`
        );
      } else {
        console.log(
          `${data.uniqueId} has sent gift ${data.giftName} x${data.repeatCount}`
        );
        feed.push({
          gift: true,
          uniqueId: data.uniqueId,
          diamond_count: data.extendedGiftInfo.diamond_count * data.repeatCount,
          image: data.giftPictureUrl,
          time_stamp: data.timestamp,
        });
      }
      res.status(200);
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

server.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log("Server running on Port ", PORT);
});
