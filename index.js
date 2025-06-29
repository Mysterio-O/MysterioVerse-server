require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;
const cors = require('cors');


app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection

        const messageCollection = client.db('mysterioDb').collection('messages');


        app.post('/messageToMysterio', async (req, res) => {
            try {
                const messageObject = req.body;
                console.log('message objects->', messageObject);
                if (messageObject) {
                    const result = await messageCollection.insertOne(messageObject);
                    res.status(200).send({ message: 'successfully sent message', result });
                }
            } catch (error) {
                res.send(400).send('Request failed', error);
            }

        })


        // await client.db("admin").command({ ping: 1 });
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
