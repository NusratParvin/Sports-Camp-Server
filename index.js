const express = require('express');
const app = express();

const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.comdjom.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summerDB").collection("users");
    const classesCollection = client.db("summerDB").collection("classes");

/////////////// USer related APIs/////////////////////////////////////////////

// app.get('/users',  async (req, res) => {
//     const result = await usersCollection.find().toArray()
//     res.send(result)
// })

app.put('/users/:email', async (req, res) => {
    const email = req.params.email
    const user = req.body
    const query = { email: email }
    const options = { upsert: true }
    const updateDoc = {
      $set: user,
    }
    const result = await usersCollection.updateOne(query, updateDoc, options)
    console.log(result)
    res.send(result)
  })

/////////////// USer related APIs/////////////////////////////////////////////


/////////////// class related APIs/////////////////////////////////////////////
app.get('/classes',  async (req, res) => {
        const result = await classesCollection.find().toArray()
        res.send(result)
        
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})