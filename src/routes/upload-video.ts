import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart"
import { prisma } from '../lib/prisma'

import path from "node:path" // modulo interno do node
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import { pipeline } from "node:stream"
import { promisify } from "node:util";

// Node trabalha com Streams - Ler dados ou escrever dados aos poucos!!!
// Pipeline faz com que a gente aguarde todo o upload do Stream
// Promisify - transforma uma função que não tinha um async await para ter eles
const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits:{
            fieldSize: 1_048_576 * 25, //25 MB
        }
    })

    app.post('/videos', async (request, reply) => {
        const data = await request.file()

        if(!data) {
            return reply.status(400).send({error: 'Missing file input.'})
        }

        const extesion = path.extname(data.filename)

        if(extesion != '.mp3') {
            return reply.status(400).send({error: 'Invalid input type, please upload a MP3'})
        }

        // Pegar somente o nome base do arquivo - ex: file.mp3 : fileBaseName = file, extension = .mp3
        const fileBaseName = path.basename(data.filename, extesion)

        // alterar nome para nome unico com o UUID
        const fileUploadName = `${fileBaseName}-${randomUUID()}-${extesion}`

        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination
            }
        })

        return {
            video,
        }
    })
}