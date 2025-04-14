import express from "express";
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";
import { PrismaClient } from "./generated/prisma/client.js";

const prisma = new PrismaClient();

const app = express();

const schema = buildSchema(`
    type Video {
        video_id: Int
        video_name: String
        thumbail: String
    }

    type Query{
        videos: [Video]
    }

    type Mutation  {

    }
`);

//root resolver
const resolver = {
  videos: async () => {
    return await prisma.videos.findMany();
  },
};

//define graphql endpoint
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: true, // bật giao diện graphql
  })
);

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
