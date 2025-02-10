require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const dns = require("dns");
const url = require("url");
const mongoose = require("mongoose");
const { clearScreenDown } = require("readline");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(`${process.cwd()}/public`));

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
});

const Counter = mongoose.model("Counter", counterSchema);

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    unique: true,
    required: true,
  },
  shortUrl: { type: Number, unique: true, required: true },
});

let Url = mongoose.model("Url", urlSchema);

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

const findUrl = (inputUrl, done) => {
  Url.find({ originalUrl: inputUrl }, function (err, data) {
    if (err) return console.error(err);
    done(null, data);
  });
};

const createAndSaveUrl = (inputUrl, done) => {
  inputUrl.save(function (err, data) {
    if (err) return console.log(err);
    done(null, data);
  });
};

app.post("/api/shorturl", async (req, res) => {
  const urlObject = url.parse(req.body.url);
  const hostname = urlObject.hostname;

  if (!hostname) {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(hostname, async (err) => {
    if (err) return res.json({ error: "invalid url" });

    try {
      let existingUrl = await Url.findOne({ originalUrl: req.body.url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.originalUrl,
          short_url: existingUrl.shortUrl,
        });
      }

      let counter = await Counter.findByIdAndUpdate(
        { _id: "shortUrl" },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );

      let newUrl = new Url({
        originalUrl: req.body.url,
        shortUrl: counter.count,
      });

      await newUrl.save();
      res.json({
        original_url: newUrl.originalUrl,
        short_url: newUrl.shortUrl,
      });
    } catch (error) {
      console.error(error);
      res.json({ error: "server error" });
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  let shortUrl = parseInt(req.params.short_url); // Convert to number
  let foundUrl = await Url.findOne({ shortUrl });

  if (foundUrl) {
    return res.redirect(foundUrl.originalUrl);
  } else {
    return res.json({ error: "No short URL found" });
  }
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
