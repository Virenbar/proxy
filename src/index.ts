import fastify, { FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";

const host = process.env["APP_IP"] || "localhost";
const port = Number.parseInt(process.env["APP_PORT"] || "3000");

const file = new URL("../config.json", import.meta.url);
const raw = fs.readFileSync(file, "utf8");
const { whitelist, mirror } = JSON.parse(raw) as Config;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
};

function checkWhitelist(request: FastifyRequest) {
    const origin = request.headers.origin;
    return (origin && whitelist.some(w => origin.match(w)) || whitelist.length == 0);
}

function teapot(reply: FastifyReply) {
    reply.status(418).send();
}

const server = fastify({
    logger: true
});

server.options("*", (request, reply) => {
    reply.headers(corsHeaders);
    reply.header("Access-Control-Allow-Headers", request.headers["access-control-request-headers"]);
    reply.send();
});

server.get<{ Params: MirrorParams }>("/mirror/:key", async (request, reply) => {
    if (!checkWhitelist(request)) { return teapot(reply); }

    const { key } = request.params;
    if (typeof key != "string" || !mirror[key]) { return teapot(reply); }

    const response = await fetch(mirror[key]);
    if (!response.body) { return reply.status(404).send(); }

    reply.header("Access-Control-Allow-Origin", request.headers.origin);
    reply.header("Vary", "Origin");
    return reply.send(response.body);
});

server.get<{ Querystring: CORSQuery }>("/cors/", async (request, reply) => {
    if (!checkWhitelist(request)) { return teapot(reply); }

    const { url } = request.query;
    if (typeof url != "string") { return teapot(reply); }

    const response = await fetch(url);
    if (!response.body) { return reply.status(404).send(); }

    reply.header("Access-Control-Allow-Origin", request.headers.origin);
    reply.header("Vary", "Origin");
    return reply.send(response.body);
});

server.setNotFoundHandler((_, reply) => teapot(reply));
server.setErrorHandler((_, __, reply) => teapot(reply));

server.listen({ host, port }, (err, address) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
    console.log(`Proxy server listening on ${address}`);
});
