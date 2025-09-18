require('dotenv').config();
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mysterioData = require('./mysterioData');
const cache = new Map();
const rateLimit = require('express-rate-limit');

app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/ask-ai-assistant', limiter);



const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



const systemPrompt = `
You are Friday, AI assistant for Mysterio (SK Maruf Hossain), a passionate MERN/Next.js || Frontend developer from Bangladesh.

🎯 ROLE:
- Answer ONLY about Mysterio: projects, skills, education, contact.
- You can answer about random topic if it doesn't violet any law or religious point.
- If asked generally about "projects" or "his work", list ALL projects with Live and GitHub links using [Live Demo](url) and [GitHub](url) format. DO NOT say "I don't have links".
- Be professional, concise, enthusiastic.
- If unsure → "I don't know — contact Mysterio directly: skrabbi.019@gmail.com | +880 1601111011"
- For project details → ALWAYS include Live & GitHub links.
- For LinkedIn/GitHub/Resume → provide links.
- Highlight tech stacks when relevant.
- Use short, clickable markdown links like [Live Demo](url) or [GitHub](url).
- Always send structured response.

🛠️ QUICK FACTS:
- Projects: Plant Pulse, GalaxiMart, LifeDrop, StudySphere, CLI Tool (react-setup-pro)
- Skills: React, Next.js, Firebase, Node, MongoDB, Tailwind, Motion, TanStack Query, AI Integration
- Education: Programming Hero Web Dev Bootcamp (99.52%), SCIC Black Belt (Top 89/4000), UoPeople (CS Associate)
- Goal: Seeking remote dev roles

💡 You have access to detailed project/tech info — use it to give rich, accurate responses.
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
    }
})


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection

        const messageCollection = client.db('mysterioDb').collection('messages');
        const projectCollection = client.db('mysterioDb').collection('projects');


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
                let { message } = req.body;
                console.log(req.body);
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }
                message = message.trim().toLowerCase();

                // send cache response if available
                const cacheKey = message.toLowerCase().trim();
                if (cache.has(cacheKey)) return res.status(200).json({ response: cache.get(cacheKey) });

                // inject project data if detected
                let injectedContext = '';


                // detect general project requests
                if (
                    message.includes('his projects') ||
                    message.includes('all projects') ||
                    message.includes("list projects") ||
                    message.includes("showcase") ||
                    message.includes('project') && !Object.keys(mysterioData.projects).some(key => message.includes(key))
                ) {
                    injectedContext += "\n\nPROJECTS OVERVIEW (USE THESE LINKS!):\n";
                    for (const [key, project] of Object.entries(mysterioData.projects)) {
                        injectedContext += `\n**${project.name || key}**\n`;
                        injectedContext += `Description: ${project.description}\n`;
                        injectedContext += `Live: [Live Demo](${project.live}) | GitHub: [Source Code](${project.github})\n`;
                        injectedContext += `Tech: ${project.tech.join(', ')}\n`;
                        if (project.command) injectedContext += `Command: \`${project.command}\`\n`;
                        injectedContext += `---\n`;
                    }
                }


                // check for projects name
                for (const [key, project] of Object.entries(mysterioData.projects)) {
                    if (message.includes(key)) {
                        injectedContext += `\n\nProject Context: ${key.toUpperCase()}\nDescription: ${project.description}\nLive: [Live Demo](${project.live}) | Github: [Source Code](${project.github})\nTechnologies: ${project.tech.join(', ')}\n`;
                    }
                }

                // check for contact links
                if (message.includes('contact') || message.includes('mail') || message.includes('phone')) {
                    injectedContext += `\n\nCONTACT: Email: [${mysterioData.contact.email}](mailto:${mysterioData.contact.email}) | Phone: ${mysterioData.contact.phone}`;
                }

                if (message.includes('linkedin')) injectedContext += `\nLinkedin: [Profile](${mysterioData.contact.linkedin})`;
                if (message.includes('github')) injectedContext += `\nGithub: [Profile](${mysterioData.contact.github})`;
                if (message.includes('resume') || message.includes('cv')) injectedContext += `\nResume: [Download PDF](${mysterioData.contact.resume})`;

                if (message.includes('language') || message.includes('english')) {
                    injectedContext += "\n\nLANGUAGE OVERVIEW (USE THESE LINKS):\n";
                    for(const[key,language] of Object.entries(mysterioData.languages)){
                        injectedContext += `\n**${language?.name || key}**\n`;
                        injectedContext += `Fluency: ${language.fluency}\n`
                    }
                };

                if(message.includes('services') || message.includes('work') || message.includes('job')){
                    injectedContext += "\n\nSERVICE OVERVIEW (USE THESE LINKS):\n";
                    for(const [key,service] of Object.entries(mysterioData.services)){
                        injectedContext += `\n**${service.name || key}**\n`;
                        injectedContext += `Action: ${service.action}\n`;
                    }
                }


                // send to gemini with minimal context injection
                const userMessage = injectedContext
                    ? `${message}\n\n---\nHere's some context to help you answer:\n${injectedContext}`
                    : message;

                console.log('user message ->', userMessage, 'injected context ->', injectedContext);

                const result = await model.generateContent({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: userMessage }]
                        }
                    ]
                });

                let responseText = await result.response.text();

                // cache response
                if (responseText.length < 800 && !responseText.includes('I don"t know')) {
                    cache.set(cacheKey, responseText);
                }

                // enforce link formatting or fallback
                if (!responseText.includes('http') && message.includes('link') || message.includes('github') || message.includes('live')) {
                    responseText = "I found relevant links for you:\n" + injectedContext.replace(/---\nHere's some context to help you answer:\n/, "");
                }



                res.status(200).json({ response: responseText });

            }
            catch (error) {
                console.log('error calling ai', error);
                res.status(200).json({
                    response: "I'm having trouble right now. Contact to Myterio directly: skrabbi.019@gmail.com"
                })
            }
        });


        app.get('/projects', async (req, res) => {
            console.log('touched');
            try {
                const projects = await projectCollection.find().toArray();
                // console.log(projects);
                if (!projects) {
                    return res.status(404).json({ message: "no projects found" });
                } else {
                    res.status(200).json(projects);
                }
            }
            catch (err) {
                console.error('error fetching all projects', err);
                res.status(500).json({ message: "internal server error getting all projects" });
            }
        });

        app.post('/projects', async (req, res) => {
            const project = req.body;
            if (!project) return res.status(400).json({ message: "project data not found" });

            try {
                const { title, description, image, images, liveLink, technologies, githubLink, futureImprovements, challenges } = project;

                const updatedStructure = {
                    title,
                    description,
                    image,
                    technologies,
                    liveLink,
                    githubLink,
                    details: [
                        {
                            images,
                            technologies,
                            description,
                            liveLink,
                            githubLink,
                            challenges,
                            futureImprovements
                        }
                    ]
                };

                const result = await projectCollection.insertOne(updatedStructure);
                if (!result.insertedId) {
                    return res.status(400).json({ message: "failed to add project. try again" });
                }
                res.status(201).json(result);
            }
            catch (err) {
                console.error("error adding new project", err);
                res.status(500).json({ message: "internal server error adding new project" });
            }

        });


        app.get('/project/:id', async (req, res) => {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ message: "project id not found" });
            }
            try {
                const project = await projectCollection.findOne({
                    _id: new ObjectId(id)
                });
                if (!project) {
                    return res.status(404).json({ message: "no project found with this id" });
                } else {
                    res.status(200).json(project?.details);
                }
            }
            catch (err) {
                console.error("error getting single project details", err);
                res.status(500).json({ message: "internal server error getting single project details" });
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
