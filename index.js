const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./service_key.json");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.get("/", (req, res) => {
  res.send(`Server is Running on port ${port}`);
});

const uri =
  "mongodb+srv://model_db:69WntcEq56Tha5MD@cluster0.uvhdimh.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// const verifyToken = (req, res, next) => {};
const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({
      message: "Unauthorized access. Token not found",
    });
  }
  const token = authorization.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "Unauthorized access.",
    });
  }
};

async function run() {
  try {
    await client.connect();
    const db = client.db("model_db");
    const modelCollection = db.collection("models");
    const downloadCollection = db.collection("downloads");

    // get method
    // find
    // findOne
    app.get("/models", async (req, res) => {
      const result = await modelCollection.find().toArray();
      res.send(result);
    });

    // get a single data form mongodb data
    app.get(
      "/models/:id",
      verifyToken,
      // (req, res, next) => {
      //   console.log("I am from middleware");
      //   next();
      // },
      async (req, res) => {
        const { id } = req.params;
        const result = await modelCollection.findOne({ _id: new ObjectId(id) });
        res.send({
          success: true,
          result,
        });
      },
    );

    app.get("/my-models", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await modelCollection
        .find({
          created_by: email,
        })
        .toArray();
      res.send({
        success: true,
        result,
      });
    });

    // get all data form mongodb data
    app.get("/my-downloads", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await downloadCollection
        .find({ downloaded_by: email })
        .toArray();
      res.send({
        success: true,
        result,
      });
    });

    // get Latest data from db
    // get
    // find
    app.get("/latest-models", async (req, res) => {
      const result = await modelCollection
        .find()
        .sort({
          created_at: "asc",
        })
        .limit(6)
        .toArray();

      res.send({ success: true, result });
    });

    // put
    // updateOne
    // updateMany
    app.put("/models/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const updateData = {
        $set: data,
      };

      const result = await modelCollection.updateOne(filter, updateData);
      res.send({
        success: true,
        result,
      });
    });

    // delete
    // deleteOne
    // deleteMany
    app.delete("/models/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      // const result = await modelCollection.deleteOne({ _id: new ObjectId(id) });
      const result = await modelCollection.deleteOne(filter);
      res.send({
        success: true,
      });
    });

    app.post("/downloads", async (req, res) => {
      const data = req.body;
      const result = await downloadCollection.insertOne(data);
      const fiilter = { _id: new ObjectId(data._id) };
      const update = {
        $inc: {
          downloaded: 1,
        },
      };
      const dowloadCounted = await modelCollection.updateOne(fiilter, update);
      res.send({
        success: true,
        result,
        dowloadCounted,
      });
    });

    // post method
    // insertOne
    // insertMany
    app.post("/models", async (req, res) => {
      const data = req.body;
      const result = await modelCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Connected Successfully!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
