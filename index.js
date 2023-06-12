const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.SPORTS_USERNAME}:${process.env.SPORTS_PASSWORD}@cluster0.03baylt.mongodb.net/?retryWrites=true&w=majority`;

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

        const sliderCollection = client.db('sportsSphere').collection('heroSlider');
        const reviewCollection = client.db('sportsSphere').collection('reviews');
        const userCollection = client.db('sportsSphere').collection('users');
        const classCollection = client.db('sportsSphere').collection('classes');
        const seClassesCollection = client.db('sportsSphere').collection('selectClasses');
        const paymentsCollection = client.db('sportsSphere').collection('payments');

        // JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, { expiresIn: "1h" });
            res.send({ token });
        })
        // Secure for Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }
        // Secure for instructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            console.log(email);
            const query = { email: email };
            const user = await userCollection.findOne(query);
            console.log(user);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }

        // Class APIs
        app.get('/classes', async (req, res) => {
            const query = { status: 'approved' }
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/manageClasses', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        // this is for instructor
        app.get('/classes/:id', verifyJWT, verifyInstructor, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        })
        app.put('/classes/:id', verifyJWT, verifyInstructor, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const update = req.body;
            const updatedDoc = {
                $set: {
                    className: update.clName,
                    classImage: update.clImage,
                    availableSeats: update.seats,
                    price: update.price,
                    status: 'pending'
                }
            }
            const result = await classCollection.updateOne(query, updatedDoc);
            res.send(result);
        })
        app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
            const classes = req.body;
            const result = await classCollection.insertOne(classes);
            res.send(result);
        })
        app.put('/classes/:status/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const status = req.params.status;
            let updateDoc;
            if (status === 'approved' || status === 'deny') {
                updateDoc = {
                    $set: {
                        status: status,
                    }
                }
            } else {
                updateDoc = {
                    $set: {
                        feedback: status
                    }
                }
            }
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // My Classes
        app.get('/myClasses/:email', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.params.email;
            const query = { instructorEmail: email };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })
        // SlectClass APIs
        app.get('/seClasses', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { stuEmail: email };
            const result = await seClassesCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await seClassesCollection.findOne(query);
            res.send(result)
        })
        app.post('/seClasses', verifyJWT, async (req, res) => {
            const item = req.body;
            const result = await seClassesCollection.insertOne(item);
            res.send(result);
        })
        app.delete('/seClasses/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await seClassesCollection.deleteOne(query);
            res.send(result);
        })
        // User APIs
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/instructor', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/user', verifyJWT, async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const exixtedUser = await userCollection.findOne(query);
            if (exixtedUser) {
                return res.send({ message: "this user already exist" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })
        app.get('/users/role/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })
        app.put('/users/:role/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const role = req.params.role
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: role
                }
            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // Banner Sliders
        app.get('/sliders', async (req, res) => {
            const result = await sliderCollection.find().toArray();
            res.send(result);
        })
        // Reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // Create Payment Intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: [
                    'card'
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })
        // Payments APIs
        app.get('/payments/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await paymentsCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result);
        })
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const enrolledResult = await paymentsCollection.insertOne(payment);
            const classId = payment.classId;
            const query = { _id: new ObjectId(classId) }
            const update = {
                $inc: {
                    availableSeats: -1,
                    enrolledStudent: 1
                }
            };
            const updateResult = await classCollection.updateOne(query, update);
            const selClassId = payment.selClassId;
            const deletedQuery = { _id: new ObjectId(selClassId) };
            const deleteResult = await seClassesCollection.deleteOne(deletedQuery);
            res.send({ enrolledResult, updateResult, deleteResult });
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
    res.send('Sports are playing');
})
app.listen(port, (req, res) => {
    console.log('Sports Sphere are runnin on: ', port);
})