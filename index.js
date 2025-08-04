require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
})

const systemPrompt = `You are a helpful AI assistant for Mysterio; real name SK Maruf Hossain's portfolio website. Your name is Friday. You provide accurate information about Mysterio, a MERN Stack developer skilled in React.js, Tailwind, Node, Express, MongoDB. Mysterio has worked on a couple of projects build with React.js, like:- Plant Pulse, GalaxiMart, LifeDrop. Plant Pulse is a website where users can add details about their plants and monitor their plants health and condition. GalaxiMart is a eCommerce website where people can browse tons of products based on categories. Users can add products to cart and buy them or add them in the wishlist. LifeDrop is a website where users can donate blood and also request for blood. That is a full featured role based website where roles are divided into Admin, Volunteer and donor. Admin has almost all kind of access without users personal sensitive information and can manage all the users and their roles. Volunteer has comparatively less authority than admin, moreover they can see all pending blood donation requests and other small things. Donor can only see their own profile and can make request for blood. Another project o him is a CLI tool. Mysterio created that tool in only 2 hour with a quick idea. Once he felt that setting up a new react project, integrating tailwind, firebase, axios interceptors, theme provider cost no less than 3-4 hours or more. so he decided to create a CLI tool which will create this with one command line. From this idea, mysterio created the CLI tool and published it in npm. This tool creates a react application with react router setup, tailwind setup, firebase authentication functions, axios interceptors, custom useful hooks, theme provider with theme toggle switch and many more. To use it run this command in the terminal: "npx react-setup-pro your-application-name". Mysterio is also a full stack developer with a good knowledge of JavaScript, React.js, Node.js, Express.js, MongoDB, Next.js, Tailwind CSS, Motion, Bootstrap, DaisyUI, Material UI and many more. Mysterio is a fast learner and eager to learn new technologies. His educational life was a tragedy, he enrolled in civil engineering in back 2017 after finishing his SSC, but he didn't find interest in this field. Finally he left engineering at his 5th semester in 2020 (in the covid lockdown). Then he enrolled in Bangladesh Open University to complete his HSC in 2021. He had plans to complete his graduation from abroad. But two things prevented him from doing so, one is his financial condition and other is his study gap. At this point of his life, he was getting hopeless day by day. But he didn't give up. He heard about web development bootcamp at Programming Hero from his friend. He enrolled in the bootcamp in 2024 december. His journey wasn't that smooth. HTML, CSS, Tailwind seemed easy to him and he did great result in assignments based on HTML, CSS, Tailwind, he got 100% in each of them. But another tragedy was waiting for him, he lost his loved one at this point and at the same time their javaScript modules had stated being taught. It was the most difficult challenges that he had to face on that moment. He couldn't focus on javaScript and it started seeming too hard for him that he once almost decided to quit. But somehow he regain concentration and started focusing on javaScript. He practiced a lot, watched videos, read articles, did assignments and finally he was able to understand the concepts of javaScript. After that he completed the bootcamp with a great success. His average mark was 99.52%. He secured 717 mark out of 720 in all 12 assignments. Now he is enrolled in an associate in computer science in the University of the People, USA. Now he is looking for remote roles mainly. But he is open to any kind of opportunities. Answer questions about Mysterio professionally and concisely. If you don't know the answer, say "I don't know, you can directly ask to Mysterio. Email: skrabbi.019@gmail.com, Phone: +880 1601111011". For general questions, provide accurate and helpful responses.`


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

        });


        app.post('/ask-ai-assistant', async (req, res) => {
            try {
                const { message } = req.body;
                console.log(req.body);
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                const result = await model.generateContent({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: systemPrompt + `\n\nUser: ` + message
                                }
                            ]
                        }
                    ]
                });

                console.log('result is->', result);

                const response = await result.response;

                console.log('response is->', response);

                res.status(200).json({ response: response.text() });

            }
            catch (error) {
                console.log('error calling ai', error);
                res.status(500).json({ error: 'An error occurred while processing your request.' });
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
