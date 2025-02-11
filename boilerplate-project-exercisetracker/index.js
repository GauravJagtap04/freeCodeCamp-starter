require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

console.log("MongoDB URI:", process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const newUser = await User.create({ username: req.body.username });
    return res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;

  try {
    const existingUser = await User.findById(_id);

    if (!existingUser) {
      return res.status(400).json({ error: "User not found" });
    }

    let date = req.body.date ? new Date(req.body.date) : new Date();
    if (isNaN(date.getTime())) {
      return res.json({ error: "invalid date" });
    }

    const newExercise = await Exercise.create({
      userId: _id,
      username: existingUser.username,
      date: date,
      duration: Number(req.body.duration),
      description: req.body.description,
    });

    res.json({
      _id: newExercise.userId,
      username: existingUser.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let query = { _id: user._id };

    if (from || to) {
      query.date = {};

      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          query.date.$gte = fromDate;
        }
      }

      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          query.date.$lte = toDate;
        }
      }
    }

    let exercises = await Exercise.find({ userId: user._id })
      .limit(+limit || 0)
      .exec();

    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
