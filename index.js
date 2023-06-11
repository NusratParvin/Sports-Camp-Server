const express = require('express');
const app = express();

const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());



/////////JWT verification////////////////////////////////////////////
const jwtVerify = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log(authorization, 'auth');
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access for now' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    // console.log(token, 'token');

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded; 
        // console.log('====================>', req.decoded);

        next();
    })
}
/////////JWT verification////////////////////////////////////////////

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: Stripe } = require('stripe');

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
        const cartCollection = client.db("summerDB").collection("cart");
        const paymentCollection = client.db("summerDB").collection("payment");


        ///////JWT generate ////////
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
            // console.log('hit token', token);
        })
        ///////JWT generate ////////
        /////////////// USer related APIs/////////////////////////////////////////////

        app.get('/users/role/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.status(401).send({ error: true, message: 'unauthorized access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { role: user?.role }
            res.send(result);
            console.log(result, 'isRole');
        })

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
        /////////////// Cart related APIs/////////////////////////////////////////////
        app.post('/cart', async (req, res) => {
            const classData = req.body;
            console.log(classData,'clasdata');
            const result = await cartCollection.insertOne(classData);
            res.send(result);
            console.log(result, 'post classData');
        })

        app.get('/cart', jwtVerify, async (req, res) => {
            const email = req.query.email;
console.log(email);
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
            // console.log(result);
        });


        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id
            console.log(id,'inside delete');
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
            console.log(result,'deleted');
        })
        /////////////// Cart related APIs/////////////////////////////////////////////




        /////////////// class related APIs/////////////////////////////////////////////
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)

        })

        /////////////// class related APIs/////////////////////////////////////////////
        /////////////// instructor related APIs/////////////////////////////////////////
        app.get('/instructors', async (req, res) => {
            const result = await usersCollection.find({ role: "Instructor" }).toArray()
            res.send(result)
            console.log(result);

        })
        /////////////// instructor related APIs/////////////////////////////////////////
        

        /////////////// payment related APIs/////////////////////////////////////////
        app.post('/create-payment-intent', jwtVerify, async (req, res) => {
            const { price } = req.body
            console.log(price, '=================>PRICE 1');
            const amount = parseInt((price * 100).toFixed(2))
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            console.log(amount, '=================>PRICE 1');

            console.log(paymentIntent.client_secret, '======. 2');
            res.send({
                clientSecret: paymentIntent.client_secret

            })
        })

        app.post('/payments', jwtVerify, async (req, res) => {
            const payment = req.body
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
            const deleteResult = await cartCollection.deleteMany(query)
            res.send({ insertResult, deleteResult });
            // console.log(result);
        })

        /////////////// payment related APIs/////////////////////////////////////////



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