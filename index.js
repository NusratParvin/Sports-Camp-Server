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


        ///////verification middlewares ////////

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            console.log(email, 'inside verify1');
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            console.log(email, 'inside verify1');
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        ///////verification middlewares ////////


        /////////////// USer related APIs/////////////////////////////////////////////

        app.get('/users',jwtVerify,verifyAdmin,async(req,res)=>{
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        app.get('/users/role/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.status(401).send({ error: true, message: 'unauthorized access' })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { role: user?.role }
            res.send(result);
            // console.log(result, 'isRole');
        })
        app.get('/users/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.status(401).send({ error: true, message: 'unauthorized access' })
            }

            const query = { email: email }
            const result = await usersCollection.findOne(query);
            
            res.send(result);
            // console.log(result, 'isRole');
        })

        app.put('/users/:id',jwtVerify , verifyAdmin, async (req, res) => {
            const id  = req.params.id;
            const { role } = req.body;
          
              const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role } },
                { upsert: true }
              );
          res.send(result)
          console.log(result);
          });

          app.post('/users', async (req, res) => {
            const user = req.body
            console.log(user, 'user');
            const query = { email: user.email }
            const doesExist = await usersCollection.findOne(query)
            console.log(doesExist, 'doesexist');
            if (doesExist) {
                return res.send({ message: 'You already have an account!' })

            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })
          

        /////////////// USer related APIs/////////////////////////////////////////////
        /////////////// Cart related APIs/////////////////////////////////////////////

        app.post('/cart', async (req, res) => {
            const classData = req.body;
            console.log(classData, 'clasdata');
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
            console.log(id, 'inside delete');
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
            console.log(result, 'deleted');
        })
        /////////////// Cart related APIs/////////////////////////////////////////////




        /////////////// class related APIs/////////////////////////////////////////////
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find({ status: "Approved" })
              .sort({ _id: -1 }) 
              .toArray();
            res.send(result);
          });
          app.get('/classes/admin', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)

        })

        app.get('/popClasses', async (req, res) => {
            const result = await classesCollection.find().sort({ studentsEnrolled: -1 }).toArray();
            res.send(result)

        })


        app.put('/classes/:id',jwtVerify , verifyAdmin, async (req, res) => {
            const id  = req.params.id;
            const { status } = req.body;
          
              const result = await classesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } },
                { upsert: true }
              );
          res.send(result)
          console.log(result);
          });


        app.put('/classes/feedback/:id',jwtVerify , verifyAdmin, async (req, res) => {
            const id  = req.params.id;
            const { feedback } = req.body;
          
              const result = await classesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { feedback } },
                { upsert: true }
              );
          res.send(result)
          console.log(result);
          });

        // app.get('/popInstructors', async (req, res) => {
        //     try {
        //       const result = await classesCollection.aggregate([
        //         {
        //           $group: {
        //             _id: "$instructor",
        //             totalStudentsEnrolled: { $sum: "$studentsEnrolled" },
        //             classCount: { $sum: 1 } // Add this to count the classes
        //           }
        //         },
        //         {
        //           $sort: { totalStudentsEnrolled: -1 }
        //         },
        //         {
        //           $lookup: {
        //             from: "usersCollection",
        //             localField: "_id",
        //             foreignField: "name",
        //             as: "instructorDetails"
        //           }
        //         },
        //         {
        //           $project: {
        //             _id: 1,
        //             totalStudentsEnrolled: 1,
        //             classCount: 1, // Include the classCount field in the projection
        //             instructorDetails: {
        //               $arrayElemAt: ["$instructorDetails", 0]
        //             }
        //           }
        //         }
        //       ]).toArray();

        //       if (result.length === 0) {
        //         res.send("No instructors found");
        //       } else {
        //         res.send(result);
        //         console.log(result,'===================ins==========');
        //       }
        //     } catch (error) {
        //       console.error(error);
        //       res.status(500).send("Internal Server Error");
        //     }
        //   });

        app.post('/addClass', jwtVerify, verifyInstructor, async (req, res) => {
            const newClass = req.body;
            const newClassWithStatus = { ...newClass, "status": "Pending", "studentsEnrolled": parseInt(0), "feedback": 'No Feedback' }
            console.log(newClassWithStatus);
            const result = await classesCollection.insertOne(newClassWithStatus)
            res.send(result);
            console.log(result, 'class added');
        })

        app.put('/update', jwtVerify, verifyInstructor, async (req, res) => {
            const updatedClassInfo = req.body;
            // const updateId = req.body.id
            const updateId = req.query.id
console.log(updatedClassInfo,updateId);
            const options = { upsert: true }
            console.log(updatedClassInfo, updateId);
            const result = await classesCollection.updateOne(
                { _id: new ObjectId(updateId) },
                { $set: updatedClassInfo },
                options
            );

            res.send(result);
            console.log(result, 'class added');

        })

        app.get('/update', jwtVerify, verifyInstructor, async (req, res) => {
            const id = req.query.id
            console.log(id);
            const classInfo = await classesCollection.find({ _id: new ObjectId(id) }).toArray()
            res.send(classInfo);
        })

        app.get('/popInstructors', async (req, res) => {
            try {
                const result = await classesCollection.aggregate([
                    {
                        $group: {
                            _id: "$instructor",
                            totalStudentsEnrolled: { $sum: "$studentsEnrolled" },
                            classCount: { $sum: 1 }
                        }
                    },
                    {
                        $sort: { totalStudentsEnrolled: -1 }
                    }
                ]).toArray();

                if (result.length === 0) {
                    res.send("No instructors found");
                } else {
                    const instructorIds = result.map(item => item._id);
                    const instructorsWithPhotoURL = await usersCollection.find({ name: { $in: instructorIds } }).toArray();
                    // res.send(instructorsWithPhotoURL);
                    const mergedResult = result.map(item => {
                        const instructor = instructorsWithPhotoURL.find(i => i.name === item._id);
                        return {
                            instructorName: item._id,
                            totalStudentsEnrolled: item.totalStudentsEnrolled,
                            classCount: item.classCount,
                            photoURL: instructor ? instructor.photoURL : 'No Image',
                            email: instructor ? instructor.email : 'no mail'
                        };
                    });

                    res.send(mergedResult);
                    console.log(mergedResult);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });



        app.get('/instructors', async (req, res) => {
            const result = await usersCollection.find({ role: "Instructor" }).toArray()
            res.send(result)
            console.log(result);

        })

        app.get('/allclasses', jwtVerify, verifyInstructor, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
            console.log(result);
        });
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

        // app.post('/payments', jwtVerify, async (req, res) => {
        //     const payment = req.body
        //     console.log(payment,'payment');
        //     //payment inserted
        //     const insertResult = await paymentCollection.insertOne(payment);

        //     //paid class deleted from cart
        //     const query = { _id: new ObjectId(payment.cartId)}
        //     const deleteResult = await cartCollection.deleteOne(query)

        //     //class seat decreased by one
        //     const classId = payment.classId

        //     res.send({ insertResult, deleteResult });
        //     console.log('success');
        // })

        app.post('/payments', jwtVerify, async (req, res) => {
            const payment = req.body;
            console.log(payment, 'payment');

            // Payment inserted
            const insertResult = await paymentCollection.insertOne(payment);

            //delete one seat
            const classId = payment.classId;
            const classQuery = { _id: new ObjectId(classId) };
            const classUpdate = {
                $inc: {
                    seatsAvailable: -1,
                    studentsEnrolled: 1
                }
            };
            const classUpdateResult = await classesCollection.updateOne(classQuery, classUpdate, { upsert: true });



            // Update the status field to 'Paid' in the cart collection
            const cartId = new ObjectId(payment.cartId);
            const cartQuery = { _id: cartId };
            const cartUpdate = {
                $set: { status: 'Paid' },
                $inc: { seatsAvailable: -1 }
            };
            const cartOptions = { upsert: true };
            const updateResult = await cartCollection.updateOne(cartQuery, cartUpdate, cartOptions);


            res.send({ insertResult, updateResult });
            console.log('success', classUpdateResult);
        });

        app.get('/history', jwtVerify, async (req, res) => {
            const email = req.decoded.email;
            console.log(email, 'history email');

            const result = await paymentCollection
                .find({ email: email })
                .sort({ date: -1 }) // Sort by the 'date' field in descending order
                .toArray();

            res.send(result);
            console.log(result);
        });


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