const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorize access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorize access' });
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion } = require('mongodb');
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
        const selectClassesCollection = client.db('sportsSphere').collection('selectClasses');

        // Class APIs
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        // User APIs
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const exixtedUser = await userCollection.findOne(query);
            if (exixtedUser) {
                return res.send({ message: "this user already exist" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })
        // SlectClass APIs
        app.post('/selectClasses', async (req, res) => {
            const item = req.body;
            const result = await selectClassesCollection.insertOne(item);
            res.send(result);
        })

        // Sliders
        app.get('/sliders', async (req, res) => {
            const result = await sliderCollection.find().toArray();
            res.send(result);
        })
        // Reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
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